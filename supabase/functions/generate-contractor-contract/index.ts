import { requireAdmin, authErrorResponse, adminClient } from '../_shared/requireCaller.ts';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const SYSTEM_PROMPT = `You are a legal contract writer for Huna Creatives, a creative agency based in Cebu, Philippines (represented by Francis Fiel Roble).

Write tailored INDEPENDENT CONTRACTOR AGREEMENTS between Huna Creatives (the "Client") and an individual contractor (the "Contractor").

OUTPUT FORMAT — PLAIN TEXT ONLY, no HTML, no Markdown:
- The platform renders your text as-is inside a letterhead template: paragraphs are separated by ONE blank line; single line breaks within a paragraph are preserved.
- Section headings go on their own paragraph in UPPERCASE with their number, e.g. "1. ENGAGEMENT AND ROLE".
- Bullet lists: put each item on its own line starting with "• " inside one paragraph (single line breaks between items, blank line after the list).
- Do NOT include a letterhead, contact details header, or any signature/date blocks — the platform adds the header and e-signature block automatically.
- Do NOT include a document title line like "INDEPENDENT CONTRACTOR AGREEMENT" as the first line — start with the opening recital paragraph ("This Independent Contractor Agreement ...").

STRUCTURE (adapt to the engagement; add/remove sections as the brief requires):
Opening recital naming the Parties and the Effective Date.
1. ENGAGEMENT AND ROLE — role/title and a concrete description of the responsibilities.
2. WORK SCHEDULE — hours per day, working days, shift/timezone expectations.
3. COMPENSATION — rate, currency, payment type (fixed monthly / hourly), payment schedule; overtime terms if relevant.
4. PAID TIME OFF — PTO and sick day allowances if provided.
5. TOOLS AND EQUIPMENT — software/tools provided or required.
6. CONFIDENTIALITY — client information, credentials, internal processes.
7. INTELLECTUAL PROPERTY — work product belongs to Huna Creatives and/or its clients upon payment.
8. INDEPENDENT CONTRACTOR RELATIONSHIP — no employer-employee relationship is created; Contractor is responsible for their own taxes and statutory contributions.
9. TERMINATION — notice period (default: seven (7) days written notice by either party), payment for work completed.
10. GOVERNING LAW — Republic of the Philippines.
11. ENTIRE AGREEMENT.

RULES:
- Use the Contractor's actual name and the engagement's actual terms throughout — never leave placeholders like [NAME] or [RATE] for information you were given.
- If the brief marks this as an amendment (rate change, scope change, renewal), write it as an AMENDMENT to the existing agreement: reference the original, state only what changes, and confirm all other terms remain in force.
- Be concrete about responsibilities based on the role and brief; avoid generic filler.
- Keep the whole agreement tight — roughly one to two pages of text.

Return ONLY valid JSON with exactly these two fields:
{
  "title": string (e.g. "Independent Contractor Agreement — Jane Dela Cruz, Senior Graphic Designer"),
  "body": string (the full plain-text contract as described above, with \\n for line breaks)
}

Return ONLY the JSON object with no explanation or markdown wrapper.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // Calls the Anthropic API on our key. Ungated, this let anyone holding
    // the public anon key spend our credits without limit.
    await requireAdmin(req, adminClient());

    const {
      brief,
      contractor_name,
      role,
      effective_date,
      payment_type,
      monthly_rate,
      hourly_rate,
      currency,
      amendment_type,
    } = await req.json();

    const rate = payment_type === 'hourly'
      ? (hourly_rate ? `${currency ?? 'PHP'} ${Number(hourly_rate).toLocaleString()} per hour` : 'per the agreed hourly rate')
      : (monthly_rate ? `${currency ?? 'PHP'} ${Number(monthly_rate).toLocaleString()} per month` : 'per the agreed monthly rate');

    const userPrompt = `Write an independent contractor agreement with these details:

Contractor Name: ${contractor_name ?? 'the Contractor'}
Role: ${role || '(described in the brief below)'}
Effective Date: ${effective_date ?? new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
Compensation: ${rate} (${payment_type === 'hourly' ? 'hourly' : 'fixed monthly'})
Contract Type: ${amendment_type && amendment_type !== 'initial' ? `AMENDMENT — ${String(amendment_type).replace(/_/g, ' ')}` : 'Initial agreement'}

Brief / additional terms from the manager:
${brief || '(none — use sensible defaults for a creative agency contractor)'}

Tailor every section to this specific engagement.`;

    // Primary on Opus, falling back to Sonnet's capacity pool on sustained
    // overload; transient 429/529 retried with backoff (same pattern as
    // generate-client-contract).
    const models = ['claude-opus-4-8', 'claude-sonnet-4-6'];
    let res: Response | null = null;
    let lastErr = '';
    const maxAttempts = 3;

    outer:
    for (const model of models) {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: 6000,
            thinking: { type: 'adaptive' },
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });

        if (res.ok) break outer;

        lastErr = await res.text();
        const retryable = res.status === 429 || res.status >= 500 || lastErr.includes('overloaded_error') || lastErr.includes('api_error');
        if (!retryable) {
          return new Response(JSON.stringify({ error: `Claude error: ${lastErr}` }), { status: 502, headers: cors });
        }
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt + Math.random() * 500));
        }
      }
    }

    if (!res || !res.ok) {
      return new Response(JSON.stringify({ error: `Claude error: ${lastErr}` }), { status: 502, headers: cors });
    }

    const result = await res.json();
    if (result.stop_reason === 'refusal') {
      return new Response(JSON.stringify({ error: 'The model declined this request — please adjust the brief and try again.' }), { status: 200, headers: cors });
    }
    // With adaptive thinking the first block may be a thinking block — find the text block.
    const text = (result.content ?? []).find((b: { type: string }) => b.type === 'text')?.text ?? '';
    const extracted = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? text);
    return new Response(JSON.stringify(extracted), { headers: cors });
  } catch (err) {
    const authRes = authErrorResponse(err, cors);
    if (authRes) return authRes;
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

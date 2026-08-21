import { requireAdmin, authErrorResponse, adminClient } from '../_shared/requireCaller.ts';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const SYSTEM_PROMPT = `You are an HR officer at Huna Creatives, a creative agency based in Cebu, Philippines, drafting an official HR certificate for a contractor/employee, signed by Francis Fiel Roble (Owner).

OUTPUT FORMAT — PLAIN TEXT ONLY, no HTML, no Markdown:
- The platform renders your text inside a formal certificate letterhead: paragraphs are separated by ONE blank line; single line breaks within a paragraph are preserved.
- Do NOT include a letterhead, "TO WHOM IT MAY CONCERN" line, document title, date line, or signature block — the platform adds all of those automatically.
- Start directly with the opening sentence of the body (e.g. "This is to certify that...").
- Do NOT use bullet points unless the certificate type naturally calls for a short itemized list (e.g. listing projects/clients worked on); prefer flowing prose paragraphs, 2-4 short paragraphs total.
- Use a formal, precise, third-person register appropriate for a legal/HR document that may be submitted to embassies, banks, or government agencies. No casual language, no filler, no hedging.
- Use the person's actual name, role, dates, and any other facts provided — never leave placeholders.
- PRONOUNS: You have no information about the individual's gender. NEVER use "Mr.", "Ms.", "Mrs.", "he", "she", "him", "her", "his", or "hers" anywhere in the text. Refer to the individual only by their full name (repeat it) or by role-noun terms like "the Contractor" / "the individual named above" / "the named Contractor". This is a strict rule — a wrong-gender honorific in a legal document is a real, embarrassing error.
- LEGAL FRAMING: Where relevant (Certificate of Engagement, Work Completion Certificate, Clearance Certificate), include one sentence clarifying that the engagement is governed by a written Independent Contractor Agreement between the parties and does not constitute an employer-employee relationship, consistent with Articles 106–109 of the Labor Code of the Philippines (as amended) and Department Order No. 174-17 of the Department of Labor and Employment on contracting and subcontracting arrangements. Do not fabricate any other statute or citation beyond this one, and do not force it into certificate types where it doesn't fit (e.g. Client Assignment Letter).
- Do NOT write a closing "issued for whatever legal purpose" boilerplate line or a "Sincerely" / signature sign-off — the platform appends the standard Philippine boilerplate closing and signature block automatically.

CERTIFICATE TYPES:
- "Certificate of Engagement": Certifies that the named individual is/was engaged by Huna Creatives in the stated role, starting on the stated date, describing the nature of the engagement (independent contractor arrangement, not employment) and, if a stated purpose is given (e.g. visa application, loan application), close with a sentence confirming the certificate is issued for that stated purpose upon the individual's request.
- "Work Completion Certificate": Certifies that the named individual has satisfactorily completed the work/services engaged for Huna Creatives, describing briefly the nature of the work performed and the engagement period (start date to either "present" or a stated end date), affirming satisfactory performance, and if a purpose is given, closing with a sentence confirming issuance for that stated purpose.
- "Clearance Certificate": Certifies that the named individual has no outstanding obligations, pending liabilities, or unreturned company property/assets as of the date of issuance, following the end of their engagement.
- "Client Assignment Letter": Confirms the named individual's assignment to work on behalf of Huna Creatives for the stated client(s)/account(s), describing their role on that account.
- Any other certificate type: use professional judgment to write an appropriately formal HR certificate matching the requested type and purpose.

Return ONLY valid JSON with exactly these two fields:
{
  "title": string (the certificate name in title case, e.g. "Certificate of Engagement"),
  "body": string (the certificate body as plain text described above, with \\n for paragraph breaks)
}

Return ONLY the JSON object with no explanation or markdown wrapper.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // Calls the Anthropic API on our key. Ungated, this let anyone holding
    // the public anon key spend our credits without limit.
    await requireAdmin(req, adminClient());

    const {
      doc_type,
      contractor_name,
      role,
      department,
      start_date,
      status,
      purpose,
    } = await req.json();

    if (!doc_type || !contractor_name) {
      return new Response(JSON.stringify({ error: 'Missing doc_type or contractor_name' }), { status: 200, headers: cors });
    }

    const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const userPrompt = `Draft a "${doc_type}" for the following individual:

Name: ${contractor_name}
Role: ${role || '(unspecified — use "contractor" generically)'}
Department: ${department || '(unspecified)'}
Engagement Start Date: ${start_date ? fmt(start_date) : '(unspecified)'}
Current Engagement Status: ${status === 'inactive' ? 'No longer engaged (completed/ended)' : 'Currently active'}
Stated Purpose (if any, from the requester): ${purpose || '(none stated — omit the purpose sentence)'}

Write the certificate body now.`;

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
            max_tokens: 2000,
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
      return new Response(JSON.stringify({ error: 'The model declined this request — please adjust the details and try again.' }), { status: 200, headers: cors });
    }
    const text = (result.content ?? []).find((b: { type: string }) => b.type === 'text')?.text ?? '';
    const extracted = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? text);
    return new Response(JSON.stringify(extracted), { headers: cors });
  } catch (err) {
    const authRes = authErrorResponse(err, cors);
    if (authRes) return authRes;
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

import { requireAdmin, authErrorResponse, adminClient } from '../_shared/requireCaller.ts';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const SYSTEM_PROMPT = `You are a senior account manager at Huna Creatives, a creative agency in Cebu, Philippines (represented by Francis Fiel Roble). You write client-facing quotations.

A quotation has two halves: a short persuasive narrative, and a priced scope. Both must be specific to the actual conversation you are given — never generic agency boilerplate.

NARRATIVE (the "sections" array)
Write 3–5 sections. Default spine, adapt as the brief warrants:
  1. "What We Heard" — reflect back the client's actual situation in their own terms. Proves you listened. Never flattering filler.
  2. "What We Propose" — the approach, in plain language. No jargon, no deliverable list yet.
  3. "What's Included" — the scope in prose, matching the line items exactly.
  4. "Timeline" — realistic phases. Only if the brief gives you enough to be concrete.
Section body is PLAIN TEXT, not HTML or markdown. Separate paragraphs with a blank line. Keep each section 2–4 short paragraphs. Write like a person, not a brochure — no "elevate your brand", no "in today's fast-paced world", no em-dash-heavy ad copy.

PRICING (the "line_items" array)
- One line per billable thing. Description is concrete ("Logo suite — primary, secondary, submark"), not a category ("Branding").
- "notes" is optional, one short clarifying line (round counts, what's excluded).
- CRITICAL: never invent a price. If the brief does not state or clearly imply an amount for a line, set unit_price to null. It is far better to hand the account manager a blank to fill than a number the client might hold you to.
- qty defaults to 1. Use real quantities for per-unit work (e.g. 8 social creatives).
- Default currency is PHP unless the brief indicates otherwise.

PAYMENT SCHEDULE
Default to 50% to commence / 50% on delivery unless the brief says otherwise. Use null amounts if you had to leave prices blank. For retainers, use the monthly cadence instead.

TERMS
2–4 short lines: revision rounds, what triggers extra cost, validity. Keep it plain and non-legalistic — the contract does the legal work, not the quote.

Return ONLY a JSON object with exactly these fields:
{
  "title": string,           // e.g. "Brand Identity — Capu Coffee"
  "tagline": string,         // one line under the title, or ""
  "sections": [{ "heading": string, "body": string }],
  "line_items": [{ "description": string, "qty": number, "unit_price": number|null, "notes": string }],
  "payment_schedule": [{ "label": string, "amount": number|null, "due": string }],
  "terms": string,
  "validity_days": number,   // how long the quote should stand, default 30
  "needs_price": boolean     // true if ANY unit_price came back null
}

No markdown fence, no explanation — the JSON object only.`;

interface GenBody {
  brief?: string;
  client_name?: string;
  contact_email?: string;
  service?: string;
  /** The original contact-form message, if this came from the inbox. */
  inquiry?: string;
  /** Prior replies in the thread, oldest first, so the quote can reference them. */
  thread?: string[];
  currency?: 'PHP' | 'USD';
  budget_hint?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // Calls the Anthropic API on our key. Ungated, this lets anyone holding
    // the public anon key spend our credits without limit.
    await requireAdmin(req, adminClient());

    const {
      brief = '', client_name, contact_email, service,
      inquiry, thread = [], currency = 'PHP', budget_hint,
    } = (await req.json()) as GenBody;

    if (!brief.trim() && !inquiry?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Describe the engagement first — there is nothing to quote from.' }),
        { status: 400, headers: cors },
      );
    }

    const threadBlock = thread.length
      ? `\n\nWhat we have already told them (oldest first):\n${thread.map((t, i) => `--- reply ${i + 1} ---\n${t}`).join('\n\n')}`
      : '';

    const userPrompt = `Write a quotation for the following client.

Client Name: ${client_name ?? 'the Client'}
Client Email: ${contact_email ?? '(not provided)'}
Service Interest: ${service ?? '(not specified)'}
Currency: ${currency}
${budget_hint ? `Budget signal from the client: ${budget_hint}` : 'Budget: not stated by the client.'}
${inquiry ? `\nTheir original inquiry:\n${inquiry}` : ''}${threadBlock}

Account manager's brief (this is the authority on scope and pricing — follow it over anything above):
${brief || '(none given — work from the inquiry and thread above, and leave every price null)'}

Ground every section in what this client actually said. Leave unit_price null for anything the brief did not price.`;

    // Try each model in order, retrying transient overload/rate-limit (429, 529)
    // with exponential backoff. If one model stays overloaded, fall back to the
    // next (different capacity pool) so a sustained spike doesn't fail the call.
    const models = ['claude-opus-5', 'claude-sonnet-5'];
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
            max_tokens: 8000,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });

        if (res.ok) break outer;

        lastErr = await res.text();
        const retryable = res.status === 429 || res.status >= 500
          || lastErr.includes('overloaded_error') || lastErr.includes('api_error');
        if (!retryable) {
          return new Response(JSON.stringify({ error: `Claude error: ${lastErr}` }), { status: 502, headers: cors });
        }
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt + Math.random() * 500)); // 1s, 2s
        }
      }
    }

    if (!res || !res.ok) {
      return new Response(JSON.stringify({ error: `Claude error: ${lastErr}` }), { status: 502, headers: cors });
    }

    const result = await res.json();
    // A refusal returns HTTP 200 with no text block; reading content[0].text
    // blind would throw a confusing TypeError instead of a usable message.
    if (result.stop_reason === 'refusal') {
      return new Response(
        JSON.stringify({ error: 'The model declined to draft this quotation. Rephrase the brief and try again.' }),
        { status: 502, headers: cors },
      );
    }

    const text = result.content?.find((b: { type: string }) => b.type === 'text')?.text ?? '';
    let draft;
    try {
      draft = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? text);
    } catch {
      return new Response(
        JSON.stringify({ error: 'The draft came back malformed. Try generating again.' }),
        { status: 502, headers: cors },
      );
    }

    // Normalise before it reaches the builder: the UI treats unit_price null as
    // "you fill this in", and a missing array would break the editor outright.
    const lineItems = Array.isArray(draft.line_items) ? draft.line_items : [];
    return new Response(JSON.stringify({
      title: draft.title ?? '',
      tagline: draft.tagline ?? '',
      sections: Array.isArray(draft.sections) ? draft.sections : [],
      line_items: lineItems.map((i: Record<string, unknown>) => ({
        description: i.description ?? '',
        qty: i.qty ?? 1,
        unit_price: i.unit_price ?? null,
        notes: i.notes ?? '',
      })),
      payment_schedule: Array.isArray(draft.payment_schedule) ? draft.payment_schedule : [],
      terms: draft.terms ?? '',
      validity_days: Number(draft.validity_days) || 30,
      needs_price: lineItems.some((i: Record<string, unknown>) => i.unit_price == null),
    }), { headers: cors });
  } catch (err) {
    const authRes = authErrorResponse(err, cors);
    if (authRes) return authRes;
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

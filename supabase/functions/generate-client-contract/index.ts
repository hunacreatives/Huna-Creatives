const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const SYSTEM_PROMPT = `You are a legal contract writer for Huna Creatives, a creative agency based in Cebu, Philippines (represented by Francis Fiel Roble).

Write tailored client service agreements as structured HTML body content. Do NOT include <html>, <head>, <body>, or any wrapper tags — only the inner content sections.

Use this exact HTML structure and styling conventions:

<h1 class="contract-title">SERVICES AGREEMENT</h1>
<p class="contract-subtitle">Brand Identity & Design Services</p>

<p>This Services Agreement ("Agreement") is entered into and made effective as of <strong>[EFFECTIVE DATE]</strong> (the "Effective Date"),</p>

<h2 class="section-between">BETWEEN</h2>

<p><strong>HUNA CREATIVES</strong><br>
Email: contact@hunacreatives.com<br>
Cebu City, Philippines<br>
(Hereinafter referred to as the <strong>"Agency"</strong>)</p>

<p><strong>AND</strong></p>

<p><strong>[CLIENT NAME]</strong><br>
Email: [client email if known]<br>
(Hereinafter referred to as the <strong>"Client"</strong>)</p>

<p>The Agency and the Client may collectively be referred to as the <strong>"Parties."</strong></p>

<hr class="section-divider">

<h2>1. SCOPE OF SERVICES</h2>

<h3>1.1 [Service Category]</h3>
<p>[Description of service]</p>
<ul>
<li>[Deliverable 1]</li>
<li>[Deliverable 2]</li>
</ul>

(Add more subsections as needed based on the brief)

<hr class="section-divider">

<h2>2. TERM AND DURATION</h2>
<p>...</p>

<hr class="section-divider">

<h2>3. COMPENSATION AND PAYMENT TERMS</h2>

<h3>3.1 Project Fee</h3>
<p>The total project fee is <strong>[CURRENCY] [AMOUNT]</strong>, covering:</p>
<ul>
<li>[Item]</li>
</ul>

<h3>3.2 Payment Structure</h3>
<ul>
<li>[Payment milestone 1]</li>
<li>[Payment milestone 2]</li>
</ul>

<h3>3.3 Payment Terms</h3>
<ul>
<li>Accepted payment methods: Bank Transfer, GCash, or other agreed method</li>
<li>Late payments may result in suspension of services</li>
</ul>

<hr class="section-divider">

<h2>4. CLIENT RESPONSIBILITIES</h2>
<p>The Client agrees to:</p>
<ul>
<li>Provide branding assets, materials, and approvals in a timely manner</li>
<li>Review and provide feedback within three (3) business days</li>
<li>Maintain clear and prompt communication</li>
</ul>

<hr class="section-divider">

<h2>5. OWNERSHIP AND INTELLECTUAL PROPERTY</h2>
<ul>
<li>Upon full payment, all final approved deliverables become the property of the Client</li>
<li>The Agency retains the right to display completed work in its portfolio and marketing materials</li>
</ul>

<hr class="section-divider">

<h2>6. CONFIDENTIALITY</h2>
<p>Both Parties agree to maintain strict confidentiality regarding all non-public information exchanged during the term of this Agreement.</p>

<hr class="section-divider">

<h2>7. TERMINATION</h2>
<p>Either Party may terminate this Agreement with <strong>seven (7) days written notice</strong>.</p>
<p>Any work completed up to the date of termination shall be billed accordingly and must be settled by the Client. Payments already made are non-refundable.</p>

<hr class="section-divider">

<h2>8. GOVERNING LAW</h2>
<p>This Agreement shall be governed by and interpreted in accordance with the laws of the Republic of the Philippines.</p>

<hr class="section-divider">

<h2>9. ENTIRE AGREEMENT</h2>
<p>This document constitutes the full and entire agreement between the Parties and supersedes all prior communications, representations, or understandings.</p>

IMPORTANT RULES:
- Adapt sections and subsections specifically to the project described in the brief
- Be concrete about deliverables — list the actual work being done
- Use <strong class="highlight">red text</strong> for critical non-cancellable clauses (payment obligations that survive cancellation, etc.) — add class="highlight" to those specific <strong> tags
- Adjust the number of sections if needed (add Project Timeline, Project Structure, etc. if relevant)
- Use numbered sections: 1., 1.1, 1.2, etc.
- Keep bullet points concrete and specific to this engagement
- Title the agreement accurately (e.g., "BRAND DEVELOPMENT & IMPLEMENTATION AGREEMENT" not just "SERVICES AGREEMENT")
- Use today's effective date if not specified
- DO NOT include a Signatures section or any signature/date blank lines — the platform handles e-signatures separately and will append the signature block automatically

Return ONLY valid JSON with exactly these two fields:
{
  "title": string (e.g. "Services Agreement — Brand Identity Project"),
  "body": string (the full HTML content as described above, all on one line or with \\n for newlines)
}

Return ONLY the JSON object with no explanation or markdown wrapper.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { description, project_name, client_name, total_value, currency, contact_email, effective_date } = await req.json();

    const userPrompt = `Write a client service agreement for the following project:

Client Name: ${client_name ?? 'the Client'}
Client Email: ${contact_email ?? '(not provided)'}
Project Name: ${project_name ?? 'Creative Services Project'}
Total Value: ${total_value ? `${currency ?? 'PHP'} ${Number(total_value).toLocaleString()}` : 'To be agreed upon'}
Effective Date: ${effective_date ?? new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

Project Description / Account Manager Notes:
${description}

Tailor every section specifically to this engagement. Use the client's actual name throughout. Be concrete about deliverables and payment structure based on the description.`;

    // Try each model in order, retrying transient overload/rate-limit (429, 529)
    // with exponential backoff. If one model stays overloaded, fall back to the
    // next (different capacity pool) so a sustained spike doesn't fail the call.
    const models = ['claude-sonnet-4-6', 'claude-haiku-4-5'];
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
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });

        if (res.ok) break outer;

        lastErr = await res.text();
        const retryable = res.status === 429 || res.status >= 500 || lastErr.includes('overloaded_error') || lastErr.includes('api_error');
        // Non-retryable error → give up entirely. Overloaded → retry, then fall
        // through to the next model once this model's attempts are exhausted.
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
    const text = result.content[0].text;
    const extracted = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? text);
    return new Response(JSON.stringify(extracted), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const SYSTEM_PROMPT = `You are a project data extractor for a creative agency. Extract project details from the provided document and return ONLY valid JSON with exactly these fields:
- project_name: string
- client_name: string
- project_type: "client" | "retainer" | "internal" (client = one-time fixed price, retainer = monthly recurring, internal = no external client)
- service: string (e.g. "Website Design", "Branding", "Social Media Management", "UI/UX Design")
- contract_price: number | null (total fixed price for client projects, null for retainers)
- monthly_rate: number | null (monthly fee for retainer projects, null otherwise)
- start_date: string | null (YYYY-MM-DD)
- deadline: string | null (YYYY-MM-DD)
- notes: string | null (brief scope or key terms, max 2 sentences)

Use null for any field that cannot be determined. Return ONLY the JSON object with no explanation or markdown.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { file_base64, mime_type, file_name } = await req.json();

    let userContent: unknown[];

    if (mime_type === 'application/pdf') {
      userContent = [
        { type: 'text', text: 'Extract project details from this document.' },
        { type: 'file', file: { filename: file_name, file_data: `data:application/pdf;base64,${file_base64}` } },
      ];
    } else if (mime_type.startsWith('image/')) {
      userContent = [
        { type: 'text', text: 'Extract project details from this document image.' },
        { type: 'image_url', image_url: { url: `data:${mime_type};base64,${file_base64}` } },
      ];
    } else {
      const text = new TextDecoder().decode(Uint8Array.from(atob(file_base64), c => c.charCodeAt(0)));
      userContent = [{ type: 'text', text: `Extract project details from this document:\n\n${text.slice(0, 12000)}` }];
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 600,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `OpenAI error: ${err}` }), { status: 500, headers: cors });
    }

    const result = await res.json();
    const extracted = JSON.parse(result.choices[0].message.content);
    return new Response(JSON.stringify(extracted), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

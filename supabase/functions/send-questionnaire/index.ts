import { questionnaireEmail } from './email.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'Huna Creatives <hello@hunacreatives.com>';
const BASE_URL = 'https://www.hunacreatives.com';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { to, cc, client_name, service_type, token, intro_message, question_count } = await req.json();

    if (!to || !client_name || !token) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 200, headers: cors });
    }

    const formUrl = `${BASE_URL}/q/${token}`;

    const html = questionnaireEmail({
      clientName: client_name, serviceType: service_type, introMessage: intro_message,
      questionCount: question_count, formUrl, shared: Array.isArray(cc) && cc.length > 0,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        // Only contact@ is a real mailbox; replies to the sender address would bounce.
        reply_to: 'contact@hunacreatives.com',
        to: [to],
        ...(Array.isArray(cc) && cc.length > 0 ? { cc } : {}),
        subject: `Your ${service_type} questionnaire from Huna Creatives`,
        html,
      }),
    });

    const body = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: body?.message ?? 'Failed to send' }), { status: 200, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 200, headers: cors });
  }
});

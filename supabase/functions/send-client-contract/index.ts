import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { contractReadyEmail } from './email.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'Huna Creatives <contact@hunacreatives.com>';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { slug, client_email, client_name, contract_title, project_name } = await req.json();

    if (!slug || !client_email) {
      return new Response(JSON.stringify({ error: 'slug and client_email required' }), { status: 400, headers: cors });
    }

    const firstName = (client_name ?? client_email).split(' ')[0];
    const contractUrl = `${Deno.env.get('SITE_URL') ?? 'https://hunacreatives.com'}/c/${slug}`;
    const subject = contract_title ? `Your contract is ready — ${contract_title}` : 'Your contract is ready from Huna Creatives';

    const html = contractReadyEmail({ firstName, subject, contractTitle: contract_title, projectName: project_name, contractUrl });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: client_email,
        reply_to: 'contact@hunacreatives.com',
        subject,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error('Resend error:', JSON.stringify(result));
      return new Response(JSON.stringify({ error: result }), { status: 500, headers: cors });
    }

    console.log('Contract email sent:', result.id, '→', client_email);
    return new Response(JSON.stringify({ ok: true, email_id: result.id }), { headers: cors });

  } catch (err) {
    console.error('send-client-contract error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

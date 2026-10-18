import { applicantEmail, type Status } from './email.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'Huna Creatives <contact@hunacreatives.com>';
const REPLY_TO = 'contact@hunacreatives.com';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { to_email, to_name, role, status, interview_date, interview_time, interview_link } = await req.json() as {
      to_email: string;
      to_name: string;
      role: string;
      status: Status;
      interview_date?: string;
      interview_time?: string;
      interview_link?: string;
    };

    if (!to_email || !to_name || !role || !['reviewing', 'archived', 'shortlisted'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid fields' }), { status: 400, headers: cors });
    }
    if (status === 'shortlisted' && (!interview_date || !interview_time)) {
      return new Response(JSON.stringify({ error: 'interview_date and interview_time are required for shortlisted status' }), { status: 400, headers: cors });
    }

    const { subject, html } = applicantEmail(status, to_name, role, { date: interview_date!, time: interview_time!, link: interview_link });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to_email],
        reply_to: REPLY_TO,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: cors });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

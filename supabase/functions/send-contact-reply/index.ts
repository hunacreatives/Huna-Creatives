import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hunaEmail, renderLetter, type EmailButton } from '../_shared/emailLayout.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'Huna Creatives <contact@hunacreatives.com>';
const REPLY_TO = 'contact@hunacreatives.com';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { submission_id, to_email, to_name, subject, body, buttons } = await req.json();
    // Both buttons are on unless the composer switches one off.
    const showMeeting = buttons?.meeting !== false;
    const showQuote = buttons?.quote !== false;

    if (!to_email || !subject || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: cors });
    }

    // A reply tied to a submission can carry the "Request a formal quotation"
    // button — the client's click is authorised by this unguessable token.
    let quoteUrl: string | null = null;
    if (submission_id && showQuote) {
      const { data: sub } = await supabase
        .from('contact_submissions')
        .select('public_token')
        .eq('id', submission_id)
        .single();
      if (sub?.public_token) {
        quoteUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/request-quotation?token=${sub.public_token}`;
      }
    }

    const cleanBody = body.replace(/https:\/\/calendly\.com\/[^\s<"']*/g, '').trim();
    const paragraphs = renderLetter(cleanBody);

    const cta: EmailButton[] = [];
    if (showMeeting) cta.push({ label: 'Schedule a meeting', url: 'https://calendly.com/hunacreatives/30min' });
    if (quoteUrl) cta.push({ label: 'Request a quotation', url: quoteUrl, tone: showMeeting ? 'secondary' : 'primary' });

    const html = hunaEmail({
      title: subject,
      body: paragraphs,
      buttons: cta,
      note: 'You’re receiving this because you contacted Huna Creatives. Reply to this email to reach us.',
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to_email],
        bcc: [REPLY_TO],
        reply_to: REPLY_TO,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: cors });
    }

    // Log the sent email
    await supabase.from('contact_replies').insert({
      submission_id: submission_id ?? null,
      to_email,
      to_name: to_name ?? null,
      subject,
      body,
    });

    // Mark submission as replied if one exists
    if (submission_id) {
      await supabase.from('contact_submissions').update({ status: 'replied' }).eq('id', submission_id);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

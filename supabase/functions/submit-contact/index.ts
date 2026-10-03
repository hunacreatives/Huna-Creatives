import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { followTheWork } from '../_shared/followFooter.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const NOTIFY_EMAIL = 'contact@hunacreatives.com';
const FROM_EMAIL = 'Huna Creatives <noreply@hunacreatives.com>';
// The acknowledgement to the person who filled in the form comes from the inbox
// they can actually reply to.
const ACK_FROM = 'Huna Creatives <contact@hunacreatives.com>';
const REPLY_TO = 'contact@hunacreatives.com';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";
const para = (html: string) =>
  `<tr><td style="padding:0 0 16px;font-size:15px;line-height:1.75;color:#2a2a2a;font-family:${SERIF}">${html}</td></tr>`;

// Same look as the other client emails: dark header with the logo, dark footer.
function ackHtml(name: string, service: string | null, subject: string | null, message: string): string {
  const first = esc(String(name).trim().split(/\s+/)[0] || 'there');
  const excerpt = message.length > 400 ? message.slice(0, 400).trimEnd() + '…' : message;
  const rows = [
    ['Service', service], ['Subject', subject], ['Your message', excerpt],
  ].filter(([, v]) => v).map(([k, v]) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#777777;width:110px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;color:#1a1a1a;white-space:pre-wrap">${esc(v)}</td></tr>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>We received your message</title>
  <style>
    @media only screen and (max-width:600px){
      .email-wrapper{padding:0!important}
      .email-body{padding:32px 20px!important}
      .email-header{padding:24px 20px!important}
      .email-footer{padding:20px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f2f2f0;-webkit-text-size-adjust:100%">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#f2f2f0">
    <tr><td align="center" class="email-wrapper" style="padding:40px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
        <tr><td class="email-header" style="background:#111111;padding:28px 40px;border-bottom:3px solid #FF6B35">
          <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives" height="32"
               style="display:block;height:32px;width:auto;border:0;outline:0;text-decoration:none">
        </td></tr>
        <tr><td class="email-body" style="padding:44px 40px 36px;background:#ffffff">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
            ${para(`Hi ${first},`)}
            ${para(`Thanks for getting in touch with Huna Creatives. We received your message${service ? ` about ${esc(service)}` : ''}:`)}
            <tr><td style="padding:0 0 20px"><table cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:100%;background:#f7f7f5;border-radius:4px;padding:12px 18px;font-family:${SANS};font-size:13px;line-height:1.5">${rows}</table></td></tr>
            ${para('What happens next: we will get back to you within 24 hours. If you asked about a project, that reply comes with a custom quote, or a few questions so we can put one together. No hidden fees.')}
            ${para('While you wait, here is some of our recent work: <a href="https://hunacreatives.com/portfolio" style="color:#FF6B35">hunacreatives.com/portfolio</a>')}
            ${para('We post new branding, social and web projects on <a href="https://www.instagram.com/hunacreatives/" style="color:#FF6B35">Instagram</a> and <a href="https://www.facebook.com/hunacreatives/" style="color:#FF6B35">Facebook</a> (@hunacreatives).')}
            ${para('If you want to add anything, just reply to this email.')}
            ${para('Huna Creatives<br><span style="color:#777777">Cebu, Philippines</span>')}
          </table>
        </td></tr>
        <tr><td class="email-footer" style="background:#111111;padding:24px 40px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
            <tr>
              <td style="font-family:${SANS};font-size:11px;color:#888888;letter-spacing:0.08em;text-transform:uppercase">Huna Creatives</td>
              <td align="right" style="font-family:${SANS};font-size:11px"><a href="mailto:contact@hunacreatives.com" style="color:#FF6B35;text-decoration:none">contact@hunacreatives.com</a></td>
            </tr>
            <tr>
              <td style="font-family:${SANS};font-size:11px;color:#555555;padding-top:4px">Cebu City, Philippines</td>
              <td align="right" style="padding-top:4px">${followTheWork()}</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ackText(name: string, service: string | null, message: string): string {
  const first = String(name).trim().split(/\s+/)[0] || 'there';
  return [
    `Hi ${first},`, '',
    `Thanks for getting in touch with Huna Creatives. We received your message${service ? ` about ${service}` : ''}.`, '',
    'What happens next: we will get back to you within 24 hours. If you asked about a project, that reply comes with a custom quote, or a few questions so we can put one together. No hidden fees.', '',
    'While you wait, here is some of our recent work: hunacreatives.com/portfolio', '',
    'We post new branding, social and web projects on Instagram and Facebook: instagram.com/hunacreatives and facebook.com/hunacreatives', '',
    'If you want to add anything, just reply to this email.', '',
    'Huna Creatives', 'Cebu, Philippines', '',
    '---', 'Your message:', message,
  ].join('\n');
}

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const body = await req.json();
    const { name, email, subject, service, message } = body;

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: cors });
    }

    // The form is public, so it must not become a way to email any address
    // repeatedly: only the first submission from an address in 24 hours gets
    // an acknowledgement.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recent } = await supabase
      .from('contact_submissions')
      .select('id', { count: 'exact', head: true })
      .ilike('email', String(email).trim())
      .gte('created_at', since);

    // Save to DB
    const { error: dbError } = await supabase.from('contact_submissions').insert({
      name,
      email,
      subject: subject ?? '',
      service: service ?? null,
      message,
    });

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), { status: 500, headers: cors });
    }

    // Send email notification via Resend
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <p style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin-bottom:24px">New Contact Form Submission</p>
        <h2 style="margin:0 0 20px;font-size:20px">${esc(name)}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
          <tr><td style="padding:8px 0;color:#666;width:100px">From</td><td style="padding:8px 0">${esc(email)}</td></tr>
          ${service ? `<tr><td style="padding:8px 0;color:#666">Service</td><td style="padding:8px 0">${esc(service)}</td></tr>` : ''}
          ${subject ? `<tr><td style="padding:8px 0;color:#666">Subject</td><td style="padding:8px 0">${esc(subject)}</td></tr>` : ''}
        </table>
        <div style="background:#f5f5f5;border-radius:8px;padding:16px 20px;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(message)}</div>
        <p style="margin-top:32px;font-size:11px;color:#bbb">Submitted via hunacreatives.com — view all in the Hub</p>
      </div>
    `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [NOTIFY_EMAIL],
        reply_to: email,
        subject: `New inquiry from ${name}${service ? ` — ${service}` : subject ? ` — ${subject}` : ''}`,
        html,
      }),
    });

    // Acknowledge the sender (first submission per address per 24 hours).
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
    if (validEmail && !recent) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: ACK_FROM,
          to: [String(email).trim()],
          reply_to: REPLY_TO,
          subject: 'We received your message',
          html: ackHtml(name, service ?? null, subject || null, String(message)),
          text: ackText(name, service ?? null, String(message)),
        }),
      }).catch((e) => console.error('acknowledgement email failed', e));
    }

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

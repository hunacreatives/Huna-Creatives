import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

const SERIF = "Georgia,'Times New Roman',serif";

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}

// Inline **bold** → <strong>, after escaping.
function inline(s: string): string {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// Turns the admin's lightly-marked-up plain text into email-safe table rows.
// Supported: blank line = spacing, "- " / "* " / "• " = bullet list,
// a line that is entirely **wrapped** = a bold subheading, everything else
// = a paragraph. Mirrors renderRichText() in the contact inbox preview.
function renderRichBody(text: string): string {
  const lines = text.split('\n').map((l) => l.trim());
  const out: string[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (!bullets.length) return;
    const items = bullets.map((b) =>
      `<li style="margin:0 0 6px;padding-left:4px">${inline(b)}</li>`).join('');
    out.push(`<tr><td style="padding:0 0 16px"><ul style="margin:0;padding:0 0 0 22px;font-size:15px;line-height:1.75;color:#2a2a2a;font-family:${SERIF}">${items}</ul></td></tr>`);
    bullets = [];
  };

  for (const line of lines) {
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) { bullets.push(bullet[1]); continue; }
    flush();
    if (line === '') { out.push('<tr><td height="12"></td></tr>'); continue; }
    const heading = line.match(/^\*\*(.+)\*\*$/);
    if (heading) {
      out.push(`<tr><td style="padding:6px 0 10px;font-size:16px;line-height:1.5;font-weight:700;color:#1a1a1a;font-family:${SERIF}">${esc(heading[1])}</td></tr>`);
      continue;
    }
    out.push(`<tr><td style="padding:0 0 16px;font-size:15px;line-height:1.75;color:#2a2a2a;font-family:${SERIF}">${inline(line)}</td></tr>`);
  }
  flush();
  return out.join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { submission_id, to_email, to_name, subject, body } = await req.json();

    if (!to_email || !subject || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: cors });
    }

    // A reply tied to a submission can carry the "Request a formal quotation"
    // button — the client's click is authorised by this unguessable token.
    let quoteUrl: string | null = null;
    if (submission_id) {
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
    const paragraphs = renderRichBody(cleanBody);

    const btn = (href: string, label: string, dark: boolean) =>
      `<a href="${href}" style="display:block;width:300px;box-sizing:border-box;text-align:center;background:${dark ? '#111111' : '#FF6B35'};color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;padding:14px 24px;border-radius:3px;text-decoration:none;margin:0 0 10px">${label}</a>`;

    const buttonsRow = `
      <tr><td height="16"></td></tr>
      <tr><td style="padding:8px 0 4px">
        ${btn('https://calendly.com/hunacreatives/30min', 'Schedule a Meeting &rarr;', true)}
        ${quoteUrl ? btn(quoteUrl, 'Request a Formal Quotation &rarr;', false) : ''}
      </td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${subject}</title>
  <style>
    @media only screen and (max-width:600px){
      .email-wrapper{padding:0!important}
      .email-body{padding:32px 20px!important}
      .email-header{padding:24px 20px!important}
      .email-footer{padding:20px!important}
      .logo-img{height:28px!important}
    }
    .logo-dark { display: none; }
    @media (prefers-color-scheme: dark) { .logo-light { display: none !important; } .logo-dark { display: block !important; } }
    [data-ogsc] .logo-light { display: none !important; }
    [data-ogsc] .logo-dark { display: block !important; }
  </style>
</head>
<body style="margin:0;padding:0;background:#f2f2f0;-webkit-text-size-adjust:100%;mso-line-height-rule:exactly">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#f2f2f0">
    <tr>
      <td align="center" class="email-wrapper" style="padding:40px 16px">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

          <!-- Header -->
          <tr>
            <td class="email-header" style="background:#111111;padding:28px 40px;border-bottom:3px solid #FF6B35">
              <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png"
                   alt="Huna Creatives"
                   class="logo-img logo-light"
                   width="auto"
                   height="32"
                   style="display:block;height:32px;width:auto;border:0;outline:0;text-decoration:none">
              <img src="https://hunacreatives.com/images/547b59870e776a20eb28e4f20931787c.png"
                   alt="Huna Creatives"
                   class="logo-img logo-dark"
                   width="auto"
                   height="32"
                   style="display:none;height:32px;width:auto;border:0;outline:0;text-decoration:none">
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="email-body" style="padding:44px 40px 36px;background:#ffffff">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                ${paragraphs}
                ${buttonsRow}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer" style="background:#111111;padding:24px 40px">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;color:#888888;letter-spacing:0.08em;text-transform:uppercase">
                    Huna Creatives
                  </td>
                  <td align="right" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px">
                    <a href="mailto:contact@hunacreatives.com" style="color:#FF6B35;text-decoration:none">contact@hunacreatives.com</a>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;color:#555555;padding-top:4px">
                    Cebu City, Philippines
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;

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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'Huna Creatives <contact@hunacreatives.com>';
const REPLY_TO = 'contact@hunacreatives.com';
const CALENDLY = 'https://calendly.com/hunacreatives/30min';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { to_email, to_name, project_title, proposal_url, subject } = await req.json();

    if (!to_email || !proposal_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: cors });
    }

    const displayName = to_name || to_email;
    const emailSubject = subject || `A proposal from Huna Creatives`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${emailSubject}</title>
  <style>
    @media only screen and (max-width:600px){
      .wrap{padding:0!important}
      .body{padding:32px 20px!important}
      .header{padding:24px 20px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f0ede8">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#f0ede8">
    <tr>
      <td align="center" class="wrap" style="padding:40px 16px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
          style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">

          <!-- Header -->
          <tr>
            <td class="header" style="background:#111111;padding:28px 40px">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td>
                    <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png"
                         alt="Huna Creatives" height="28"
                         style="display:block;height:28px;width:auto;border:0">
                  </td>
                  <td align="right">
                    <span style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#FF6B35;border:1px solid rgba(255,107,53,0.35);padding:5px 10px">
                      PROPOSAL
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="body" style="padding:44px 40px 36px">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.75;color:#2a2a2a">
                    Hi ${displayName},
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.75;color:#2a2a2a">
                    We've put together a proposal${project_title ? ` for <strong>${project_title}</strong>` : ''} that we think you'll find worthwhile.
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:28px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.75;color:#2a2a2a">
                    It covers what we observed, what we're proposing, and why we think the timing is right. We'd love the chance to walk you through it.
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:12px">
                    <a href="${proposal_url}"
                       style="display:inline-block;background:#111111;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:15px 32px;text-decoration:none">
                      View Proposal &rarr;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:8px;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:11px;color:#aaaaaa">
                    Or copy this link: <a href="${proposal_url}" style="color:#FF6B35;text-decoration:none">${proposal_url}</a>
                  </td>
                </tr>
                <tr><td height="32"></td></tr>
                <tr>
                  <td style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.75;color:#2a2a2a">
                    After you've had a look, we'd love to set up a call.
                  </td>
                </tr>
                <tr><td height="16"></td></tr>
                <tr>
                  <td>
                    <a href="${CALENDLY}"
                       style="display:inline-block;background:#ffffff;color:#111111;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.06em;padding:12px 28px;text-decoration:none;border:1.5px solid #111111">
                      Book a Discovery Call
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#111111;padding:24px 40px">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:11px;color:#888888;letter-spacing:0.08em;text-transform:uppercase">
                    Huna Creatives
                  </td>
                  <td align="right">
                    <a href="mailto:${REPLY_TO}" style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:11px;color:#FF6B35;text-decoration:none">${REPLY_TO}</a>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:11px;color:#555555;padding-top:4px">
                    Cebu City, Philippines
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
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
        subject: emailSubject,
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

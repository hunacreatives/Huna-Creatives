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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { to_email, to_name, project_title, proposal_url, subject, thank_you_context } = await req.json();

    if (!to_email || !proposal_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: cors });
    }

    const displayName = to_name || to_email;
    const emailSubject = subject || `A proposal from Huna Creatives`;
    const thankYouLine = thank_you_context
      ? `Thank you for ${thank_you_context}.`
      : `Thank you for your time.`;

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

          <!-- Accent bar -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#FF6B35 0%,#ff9a72 100%)"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="body" style="padding:44px 40px 36px">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td style="padding-bottom:24px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:#2a2a2a">
                    Hi ${displayName},
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:8px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:#2a2a2a">
                    ${thankYouLine}
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:36px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:#2a2a2a">
                    Here is the proposal${project_title ? ` for <strong>${project_title}</strong>` : ''} we put together for you:
                  </td>
                </tr>

                <!-- CTA -->
                <tr>
                  <td align="center" style="padding-bottom:20px">
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="background:#111111;border-radius:3px">
                          <a href="${proposal_url}"
                             style="display:inline-block;background:#111111;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:18px 44px;text-decoration:none;border-radius:3px">
                            View Proposal &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom:36px;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:11px;color:#bbbbbb">
                    or copy this link:<br>
                    <a href="${proposal_url}" style="color:#FF6B35;text-decoration:none;word-break:break-all">${proposal_url}</a>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="border-top:1px solid #eeeeee;padding-top:28px;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.8;color:#666666">
                    Once you've had a look, the next step is to approve the proposal inside. If you have any questions before then, just reply to this email — we're happy to clarify.
                  </td>
                </tr>
                <tr><td height="12"></td></tr>
                <tr>
                  <td style="font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.8;color:#2a2a2a">
                    Warm regards,<br>
                    <strong>The Huna Creatives Team</strong>
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

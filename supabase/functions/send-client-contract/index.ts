import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
  <style>
    @media only screen and (max-width:600px){
      .wrap{padding:0!important}
      .body-cell{padding:32px 20px!important}
      .header-cell{padding:24px 20px!important}
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
            <td class="header-cell" style="background:#111111;padding:28px 40px">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td>
                    <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png"
                         alt="Huna Creatives" height="28"
                         style="display:block;height:28px;width:auto;border:0">
                  </td>
                  <td align="right">
                    <span style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#FF6B35;border:1px solid rgba(255,107,53,0.35);padding:5px 10px">
                      CONTRACT
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Accent bar -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#D64F1E 0%,#ff9a72 100%)"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="body-cell" style="padding:36px 40px 32px">
              <p style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:15px;font-weight:600;color:#111827;margin:0 0 20px">
                Hi ${firstName},
              </p>
              <p style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:14px;color:#374151;line-height:1.7;margin:0 0 16px">
                Your service agreement with Huna Creatives is ready for your review.
                Please take a moment to read the full document, then sign it electronically when you're ready to proceed.
              </p>

              ${contract_title || project_name ? `
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 18px;margin:0 0 24px">
                ${contract_title ? `<p style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:14px;font-weight:700;color:#111827;margin:0 0 4px">${contract_title}</p>` : ''}
                ${project_name ? `<p style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:12px;color:#6b7280;margin:0">Project: ${project_name}</p>` : ''}
              </div>
              ` : ''}

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:24px 0">
                <tr>
                  <td align="center">
                    <a href="${contractUrl}"
                       style="display:inline-block;padding:14px 36px;background:#D64F1E;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;letter-spacing:0.02em">
                      Review &amp; Sign Contract →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="height:1px;background:#f3f4f6"></td></tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background:#fafafa">
              <p style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:11px;color:#9ca3af;margin:0 0 4px;line-height:1.7">
                Questions? Reply to this email or reach us at
                <a href="mailto:contact@hunacreatives.com" style="color:#9ca3af">contact@hunacreatives.com</a>
              </p>
              <p style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:11px;color:#d1d5db;margin:0">
                © ${new Date().getFullYear()} Huna Creatives · Cebu, Philippines
              </p>
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

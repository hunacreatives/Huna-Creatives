const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'Huna Creatives <contact@hunacreatives.com>';
const REPLY_TO = 'contact@hunacreatives.com';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

type Status = 'reviewing' | 'archived' | 'shortlisted';

function formatInterviewDateTime(date: string, time: string): string {
  // date: "YYYY-MM-DD", time: "HH:MM" — both interpreted as Asia/Manila (PH office time)
  const dt = new Date(`${date}T${time}:00+08:00`);
  const dateLabel = dt.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeLabel = dt.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
  return `${dateLabel} at ${timeLabel} (Philippine Time)`;
}

function contentFor(
  status: Status,
  name: string,
  role: string,
  interview?: { date: string; time: string; link?: string }
): { subject: string; paragraphs: string[] } {
  const firstName = name.trim().split(' ')[0] || name;

  if (status === 'reviewing') {
    return {
      subject: `Your application for ${role} is being reviewed`,
      paragraphs: [
        `Hi ${firstName},`,
        `Thanks for applying for the ${role} position at Huna Creatives. We wanted to let you know that your application is currently under review.`,
        `We'll reach out if we'd like to move forward. Thanks for your patience!`,
        `— Huna Creatives`,
      ],
    };
  }

  if (status === 'shortlisted' && interview) {
    const whenLabel = formatInterviewDateTime(interview.date, interview.time);
    return {
      subject: `You're shortlisted for ${role} — Interview scheduled`,
      paragraphs: [
        `Hi ${firstName},`,
        `Great news — you've been shortlisted for the ${role} position at Huna Creatives! We'd like to schedule an interview with you.`,
        `<strong>${whenLabel}</strong>`,
        ...(interview.link ? [`Join via Google Meet: <a href="${interview.link}" style="color:#FF6B35">${interview.link}</a>`] : []),
        `If this time doesn't work for you, just reply to this email and we'll find another slot.`,
        `Looking forward to speaking with you!`,
        `— Huna Creatives`,
      ],
    };
  }

  return {
    subject: `Update on your application for ${role}`,
    paragraphs: [
      `Hi ${firstName},`,
      `Thank you for taking the time to apply for the ${role} position at Huna Creatives, and for your interest in joining our team.`,
      `Unfortunately, we've decided to move forward with another candidate for this position.`,
      `We'll keep your application on file — once we have an opening that's a good fit, we'll be sure to reach out.`,
      `— Huna Creatives`,
    ],
  };
}

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

    const { subject, paragraphs } = contentFor(status, to_name, role, { date: interview_date!, time: interview_time!, link: interview_link });

    const paragraphsHtml = paragraphs
      .map(line => `<tr><td style="padding:0 0 16px;font-size:15px;line-height:1.75;color:#2a2a2a;font-family:Georgia,'Times New Roman',serif">${line}</td></tr>`)
      .join('');

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

        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

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

          <tr>
            <td class="email-body" style="padding:44px 40px 36px;background:#ffffff">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                ${paragraphsHtml}
              </table>
            </td>
          </tr>

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

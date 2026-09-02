// Public endpoint behind the "Request a formal quotation" button in a
// contact-inbox reply email. The caller is an anonymous prospect clicking
// a link, so this is NOT admin-gated -- the link is authorised by the
// unguessable public_token. It stamps quote_requested_at, notifies the
// team (email + Slack), then 302-redirects to a confirmation page on the
// marketing site.
//
// Why the redirect: Supabase's edge gateway forces `content-type: text/plain`
// and a `sandbox` CSP on every function response, so a function cannot serve
// a rendered HTML page to a browser. The page lives at
// hunacreatives.com/quote-requested and reads ?s=<status>.
//
// Deploy WITHOUT jwt verification so a bare click works:
//   supabase functions deploy request-quotation --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN') ?? '';
const ADMIN_SLACK_IDS = ['U091BL9PQ77', 'U0838LWSY4E'];
const FROM_EMAIL = 'Huna Creatives <contact@hunacreatives.com>';
const TEAM_EMAIL = 'contact@hunacreatives.com';
const HUB = 'https://hub.hunacreatives.com';
const CONFIRM_PAGE = 'https://www.hunacreatives.com/quote-requested';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}

type Outcome = 'ok' | 'already' | 'invalid' | 'error';
function redirect(s: Outcome): Response {
  return new Response(null, {
    status: 302,
    headers: { ...cors, location: `${CONFIRM_PAGE}?s=${s}` },
  });
}

async function slackDm(userId: string, text: string, blocks?: object[]) {
  if (!SLACK_BOT_TOKEN) return;
  const opened = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ users: userId }),
  });
  const j = await opened.json();
  const channel = j.ok ? j.channel?.id : userId;
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, text, unfurl_links: false, ...(blocks ? { blocks } : {}) }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token')
      ?? (req.method === 'POST' ? (await req.json().catch(() => ({}))).token : null);

    if (!token) return redirect('invalid');

    const { data: sub, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .eq('public_token', token)
      .single();

    if (error || !sub) return redirect('invalid');

    // Idempotent: a second click just lands on the same confirmation.
    if (sub.quote_requested_at) return redirect('already');

    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from('contact_submissions')
      .update({ quote_requested_at: now })
      .eq('id', sub.id)
      .is('quote_requested_at', null);

    if (updErr) return redirect('error');

    // -- Notify the team (best effort) ------------------------------------
    const fmtDate = (iso: string | null) => {
      if (!iso) return '—';
      try {
        return new Date(iso).toLocaleString('en-US', {
          timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit',
        }) + ' (Manila)';
      } catch { return iso; }
    };
    const serviceRef = sub.service ? ` (${sub.service})` : '';
    const slackText = `*Formal quotation requested*\n*${sub.name}*${serviceRef} clicked "Request a formal quotation" from their reply email.\n<mailto:${sub.email}|${sub.email}>`
      + `${sub.subject ? `\nSubject: ${sub.subject}` : ''}\n\n> ${String(sub.message ?? '').slice(0, 500).replace(/\n/g, '\n> ')}`;
    const blocks = [
      { type: 'section', text: { type: 'mrkdwn', text: slackText } },
      { type: 'actions', elements: [{
        type: 'button', text: { type: 'plain_text', text: 'Open inbox', emoji: true },
        url: `${HUB}/hub/admin/contact`, style: 'primary',
      }] },
    ];

    const row = (label: string, value: string) =>
      `<tr>
        <td style="padding:7px 0;font-size:13px;color:#8a8a8a;width:96px;vertical-align:top;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">${label}</td>
        <td style="padding:7px 0;font-size:13px;color:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">${value}</td>
      </tr>`;

    await Promise.all([
      ...ADMIN_SLACK_IDS.map((id) => slackDm(id, slackText, blocks).catch(() => {})),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [TEAM_EMAIL],
          reply_to: sub.email,
          subject: `Quotation requested - ${sub.name}${sub.service ? ` (${sub.service})` : ''}`,
          html: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f2f0;-webkit-text-size-adjust:100%">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f2f2f0">
    <tr><td align="center" style="padding:40px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

        <tr><td style="background:#111111;padding:26px 40px;border-bottom:3px solid #FF6B35">
          <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives" height="30" style="display:block;height:30px;width:auto;border:0;outline:0;text-decoration:none">
        </td></tr>

        <tr><td style="padding:36px 40px 28px">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#FF6B35;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">Formal quotation requested</p>
          <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:400;color:#1a1a1a">${esc(sub.name)} wants a quote</h1>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4a4a4a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
            They clicked <strong>Request a Formal Quotation</strong> in the reply we sent. Draft one from their enquiry in the hub.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid #ececec;border-bottom:1px solid #ececec;margin-bottom:20px">
            ${row('Name', esc(sub.name))}
            ${row('Email', `<a href="mailto:${esc(sub.email)}" style="color:#FF6B35;text-decoration:none">${esc(sub.email)}</a>`)}
            ${sub.service ? row('Service', esc(sub.service)) : ''}
            ${sub.subject ? row('Subject', esc(sub.subject)) : ''}
            ${row('Enquiry sent', fmtDate(sub.created_at))}
            ${row('Quote asked', fmtDate(now))}
            ${row('Status', esc(sub.status ?? 'new'))}
          </table>

          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8a8a8a;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">Their message</p>
          <div style="background:#f7f7f5;border-radius:6px;padding:16px 18px;font-size:14px;line-height:1.75;color:#2a2a2a;font-family:Georgia,'Times New Roman',serif;white-space:pre-wrap">${esc(sub.message ?? '')}</div>

          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:24px"><tr><td>
            <a href="${HUB}/hub/admin/contact" style="display:inline-block;background:#111111;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;padding:14px 28px;border-radius:3px;text-decoration:none">Open the inbox &rarr;</a>
          </td></tr></table>
        </td></tr>

        <tr><td style="background:#111111;padding:22px 40px">
          <span style="font-size:11px;color:#888888;letter-spacing:0.08em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">Huna Creatives</span>
          <span style="font-size:11px;color:#555555;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"> &middot; Cebu City, Philippines</span>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`,
        }),
      }).catch(() => {}),
    ]);

    return redirect('ok');
  } catch {
    return redirect('error');
  }
});

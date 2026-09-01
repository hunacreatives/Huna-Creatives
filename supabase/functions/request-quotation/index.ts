// Public endpoint behind the "Request a formal quotation" button in a
// contact-inbox reply email. The caller is an anonymous prospect clicking
// a link, so this is NOT admin-gated — the link is authorised by the
// unguessable public_token. It stamps quote_requested_at, notifies the
// team (email + Slack), and renders a plain confirmation page.
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

function page(title: string, heading: string, body: string): Response {
  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title></head>
<body style="margin:0;background:#f2f2f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f2f2f0">
    <tr><td align="center" style="padding:64px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
        style="max-width:480px;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
        <tr><td style="background:#111;padding:26px 40px;border-bottom:3px solid #FF6B35">
          <span style="color:#fff;font-weight:700;font-size:13px;letter-spacing:0.12em;text-transform:uppercase">Huna Creatives</span>
        </td></tr>
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:400;color:#1a1a1a">${esc(heading)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.75;color:#4a4a4a">${body}</p>
        </td></tr>
        <tr><td style="background:#111;padding:20px 40px">
          <span style="font-size:11px;color:#888;letter-spacing:0.08em;text-transform:uppercase">Huna Creatives</span>
          <span style="font-size:11px;color:#555"> &middot; Cebu City, Philippines</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return new Response(html, { headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' } });
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

    if (!token) {
      return page('Link not valid', 'This link is missing something',
        'The request link looks incomplete. Please reply to our email and we’ll sort it out.');
    }

    const { data: sub, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .eq('public_token', token)
      .single();

    if (error || !sub) {
      return page('Link not valid', 'We couldn’t find that request',
        'This link may have expired. Please reply to our email and we’ll help you directly.');
    }

    // Idempotent: a second click just shows the same friendly page.
    if (sub.quote_requested_at) {
      return page('Request received', 'You’re all set',
        'We’ve already logged your request for a formal quotation and someone from the team is on it. '
        + 'We’ll be in touch shortly at <strong>' + esc(sub.email) + '</strong>.');
    }

    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from('contact_submissions')
      .update({ quote_requested_at: now })
      .eq('id', sub.id)
      .is('quote_requested_at', null);

    if (updErr) {
      return page('Something went wrong', 'We hit a snag',
        'We couldn’t record your request just now. Please reply to our email and we’ll take care of it.');
    }

    // ── Notify the team (best effort) ─────────────────────────────────
    const serviceRef = sub.service ? ` (${sub.service})` : '';
    const slackText = `🏷️ *Formal quotation requested*\n*${sub.name}*${serviceRef} clicked "Request a formal quotation" from their reply email.\n<${sub.email}>`;
    const blocks = [
      { type: 'section', text: { type: 'mrkdwn', text: slackText } },
      { type: 'actions', elements: [{
        type: 'button', text: { type: 'plain_text', text: 'Open inbox →', emoji: true },
        url: `${HUB}/hub/admin/contact`, style: 'primary',
      }] },
    ];
    await Promise.all([
      ...ADMIN_SLACK_IDS.map((id) => slackDm(id, slackText, blocks).catch(() => {})),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [TEAM_EMAIL],
          reply_to: sub.email,
          subject: `Quotation requested — ${sub.name}${sub.service ? ` (${sub.service})` : ''}`,
          html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;padding:32px;margin:0">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#111;padding:20px 24px">
    <span style="color:#FF6B35;font-weight:700;font-size:13px;letter-spacing:0.1em">HUNA CREATIVES</span>
  </div>
  <div style="padding:26px 24px">
    <h2 style="margin:0 0 10px;font-size:17px;color:#111827">Formal quotation requested</h2>
    <p style="margin:0 0 14px;font-size:14px;color:#6b7280;line-height:1.6">
      <strong>${esc(sub.name)}</strong> asked for a formal quotation from their reply email.
    </p>
    <div style="background:#f9fafb;border-radius:8px;padding:12px 14px;font-size:13px;color:#374151;line-height:1.7">
      <div>Email: <strong>${esc(sub.email)}</strong></div>
      ${sub.service ? `<div>Service: <strong>${esc(sub.service)}</strong></div>` : ''}
    </div>
    <p style="margin:16px 0 0"><a href="${HUB}/hub/admin/contact" style="color:#FF6B35;text-decoration:none;font-size:13px;font-weight:600">Open the inbox →</a></p>
  </div>
</div></body></html>`,
        }),
      }).catch(() => {}),
    ]);

    return page('Request received', 'Thank you — we’re on it',
      'We’ve received your request for a formal quotation. Someone from the team will put one together and '
      + 'send it to <strong>' + esc(sub.email) + '</strong> shortly. You can close this tab.');
  } catch (err) {
    return page('Something went wrong', 'We hit a snag',
      'Please reply to our email and we’ll take care of your quotation directly. (' + esc(String(err)) + ')');
  }
});

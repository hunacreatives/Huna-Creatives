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
    const serviceRef = sub.service ? ` (${sub.service})` : '';
    const slackText = `*Formal quotation requested*\n*${sub.name}*${serviceRef} clicked "Request a formal quotation" from their reply email.\n<${sub.email}>`;
    const blocks = [
      { type: 'section', text: { type: 'mrkdwn', text: slackText } },
      { type: 'actions', elements: [{
        type: 'button', text: { type: 'plain_text', text: 'Open inbox', emoji: true },
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
          subject: `Quotation requested - ${sub.name}${sub.service ? ` (${sub.service})` : ''}`,
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
    <p style="margin:16px 0 0"><a href="${HUB}/hub/admin/contact" style="color:#FF6B35;text-decoration:none;font-size:13px;font-weight:600">Open the inbox</a></p>
  </div>
</div></body></html>`,
        }),
      }).catch(() => {}),
    ]);

    return redirect('ok');
  } catch {
    return redirect('error');
  }
});

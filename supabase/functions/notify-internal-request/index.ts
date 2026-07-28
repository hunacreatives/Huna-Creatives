const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const NOTIFY_USERS = ['U091BL9PQ77', 'U0838LWSY4E']; // Abigail, Francis
const NOTIFY_EMAILS = ['duterteabigaile@gmail.com', 'francisfielroble@gmail.com']; // Abigail, Francis
const FROM_EMAIL = 'Sentro OS <noreply@hunacreatives.com>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

async function slackPost(path: string, body: object) {
  const res = await fetch(`https://slack.com/api/${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(path === 'chat.postMessage' ? { unfurl_links: false, unfurl_media: false, ...(body as Record<string, unknown>) } : body),
  });
  return res.json();
}

async function sendOvertimeSubmittedEmail(contractor_name: string, detail: string, notes: string | null, url: string) {
  if (!RESEND_API_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: NOTIFY_EMAILS,
      subject: `Overtime Request: ${contractor_name}`,
      html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;padding:32px;margin:0">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#111827;padding:20px 24px"><span style="color:#fff;font-weight:700;font-size:14px;letter-spacing:0.05em">SENTRO <span style="color:#FF6B35">OS</span></span></div>
  <div style="padding:24px">
    <h2 style="margin:0 0 12px;font-size:16px;color:#111827">⏰ New Overtime Request</h2>
    <p style="color:#4b5563;font-size:14px;margin:0 0 16px"><strong>${contractor_name}</strong> submitted an overtime request.</p>
    <div style="background:#f9fafb;border-radius:8px;padding:14px;margin-bottom:16px">
      <p style="margin:0;font-size:13px;color:#111827;font-weight:600">${detail}</p>
      ${notes ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280">${notes}</p>` : ''}
    </div>
    <a href="${url}" style="display:inline-block;background:#FF6B35;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">Review Request →</a>
  </div>
</div></body></html>`,
    }),
  }).catch(() => {});
}

async function pushToHubAdmins(title: string, body: string, url: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  const usersRes = await fetch(`${SUPABASE_URL}/rest/v1/hub_users?select=id&status=eq.active&role=in.(owner,admin,hr)`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  }).catch(() => null);

  const users = usersRes?.ok ? await usersRes.json().catch(() => []) : [];
  await Promise.all(
    (users ?? []).map((user: { id: string }) =>
      fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, title, body, url }),
      }).catch(() => {})
    )
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { type, contractor_name, detail, notes } = await req.json();
    // type: 'doc_request' | 'credential_request'

    if (!type || !contractor_name) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 200, headers: cors });
    }

    const typeMap: Record<string, { emoji: string; label: string; url: string; btnLabel: string }> = {
      doc_request:      { emoji: '📄', label: 'Document Request',         url: 'https://hunacreatives.com/hub/admin/docrequests',  btnLabel: 'View Doc Requests →' },
      credential_request: { emoji: '🔑', label: 'Credential Access Request', url: 'https://hunacreatives.com/hub/admin/credentials', btnLabel: 'View Credential Requests →' },
      contract_signed:  { emoji: '✍️',  label: 'Contract Signed',          url: 'https://hunacreatives.com/hub/admin/documents',        btnLabel: 'View Documents →' },
      time_off:         { emoji: '🌴', label: 'Time Off Request',          url: 'https://hunacreatives.com/hub/admin/timeoff',          btnLabel: 'View Time Off →' },
      overtime:         { emoji: '⏰', label: 'Overtime Request',          url: 'https://hunacreatives.com/hub/admin/overtime',         btnLabel: 'View Overtime →' },
      payment_verified: { emoji: '✅', label: 'Payment Verified',          url: 'https://hunacreatives.com/hub/admin/invoice-log',      btnLabel: 'View Invoice Log →' },
    };
    const { emoji, label, url, btnLabel } = typeMap[type] ?? { emoji: '📋', label: type, url: 'https://hunacreatives.com/hub/admin', btnLabel: 'View Hub →' };

    const text = `${emoji} *${label}* from *${contractor_name}*${detail ? `\n> ${detail}` : ''}${notes ? `\n> _${notes}_` : ''}`;
    const pushTitle = `${label}`;
    const pushBody = detail
      ? `${contractor_name}: ${detail}`
      : `${contractor_name} sent a ${label.toLowerCase()}.`;

    await Promise.all(NOTIFY_USERS.map(async (userId) => {
      const opened = await slackPost('conversations.open', { users: userId });
      const channel = opened.ok ? opened.channel?.id : userId;
      await slackPost('chat.postMessage', {
        channel,
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text } },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: btnLabel, emoji: true },
                url,
                style: 'primary',
              },
            ],
          },
        ],
      });
    }));

    await pushToHubAdmins(pushTitle, pushBody, url);

    if (type === 'overtime') {
      await sendOvertimeSubmittedEmail(contractor_name, detail, notes, url);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 200, headers: cors });
  }
});

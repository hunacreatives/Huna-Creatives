import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL = 'payroll@hunacreatives.com';
const NOTIFY_EMAILS = ['francisfielroble@gmail.com', 'duterteabigaile@gmail.com'];
const ABIGAIL_SLACK_ID = 'U091BL9PQ77';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function fmt(val: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
}

async function sendNotification(payout_id: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: payout } = await supabase
    .from('hub_payouts')
    .select('*')
    .eq('id', payout_id)
    .single();

  if (!payout) return;

  const { data: contractor } = await supabase
    .from('hub_users')
    .select('full_name, department')
    .eq('id', payout.contractor_id)
    .single();

  if (!contractor) return;

  const periodStart = new Date(payout.cutoff_start);
  const periodEnd = new Date(payout.cutoff_end);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const periodLabel = periodStart.getMonth() === periodEnd.getMonth()
    ? `${months[periodStart.getMonth()]} ${periodStart.getDate()}–${periodEnd.getDate()}, ${periodStart.getFullYear()}`
    : `${months[periodStart.getMonth()]} ${periodStart.getDate()} – ${months[periodEnd.getMonth()]} ${periodEnd.getDate()}, ${periodStart.getFullYear()}`;

  const payrollUrl = 'https://hunacreatives.com/hub/admin/payroll';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <div style="background:#111827;padding:24px 32px;">
      <p style="color:#FF6B35;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 6px;">Huna Creatives</p>
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;">Payslip Submitted</h1>
      <p style="color:#6b7280;font-size:13px;margin:6px 0 0;">Awaiting your review and approval</p>
    </div>

    <div style="padding:28px 32px;">
      <p style="font-size:14px;color:#374151;margin:0 0 20px;">
        <strong>${contractor.full_name}</strong> has submitted their payslip for <strong>${periodLabel}</strong> and is awaiting approval.
      </p>

      <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;">
            <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Contractor</p>
            <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#111827;">${contractor.full_name}${contractor.department ? ` · ${contractor.department}` : ''}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;">
            <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Pay Period</p>
            <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#111827;">${periodLabel}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 16px;">
            <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Amount</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:800;color:#FF6B35;">${fmt(payout.final_payout)}</p>
          </td>
        </tr>
      </table>

      <div style="margin-top:24px;text-align:center;">
        <a href="${payrollUrl}" style="display:inline-block;background:#111827;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">Review Payslip →</a>
      </div>
    </div>

    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;">
      <p style="font-size:11px;color:#d1d5db;margin:0;text-align:center;">© ${new Date().getFullYear()} Huna Creatives · payroll@hunacreatives.com</p>
    </div>

  </div>
</body>
</html>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Huna Creatives Payroll <${FROM_EMAIL}>`,
      to: NOTIFY_EMAILS,
      subject: `Payslip Submitted — ${contractor.full_name} | ${periodLabel}`,
      html,
    }),
  });

  // Slack DM to Abigail
  const slackPost = async (path: string, body: object) => {
    const res = await fetch(`https://slack.com/api/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  };
  const dm = await slackPost('conversations.open', { users: ABIGAIL_SLACK_ID });
  if (dm.ok) {
    await slackPost('chat.postMessage', {
      channel: dm.channel.id,
      text: `💰 *Payslip submitted* — *${contractor.full_name}* has submitted their payslip for *${periodLabel}* (${fmt(payout.final_payout)}). Review it here: ${payrollUrl}`,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { payout_id } = await req.json();
    if (!payout_id) return new Response(JSON.stringify({ error: 'payout_id required' }), { status: 400, headers: cors });

    // @ts-ignore
    EdgeRuntime.waitUntil(sendNotification(String(payout_id)));

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { teamPayslipEmail } from './email.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL = 'payroll@hunacreatives.com';
const NOTIFY_EMAILS = ['francisfielroble@gmail.com', 'duterteabigaile@gmail.com'];
const ABIGAIL_SLACK_ID = 'U091BL9PQ77';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function fmt(val: number, currency = 'PHP') {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  }
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
}

async function pushToAdmins(supabase: ReturnType<typeof createClient>, title: string, body: string, url?: string) {
  const { data: admins } = await supabase.from('hub_users').select('id').in('role', ['admin', 'owner']).eq('status', 'active');
  await Promise.all((admins ?? []).map((a: any) =>
    fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: a.id, title, body, url }),
    }).catch(() => {})
  ));
}

async function sendNotification(payout_id: string, type: 'submitted' | 'dispute' = 'submitted') {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: payout } = await supabase
    .from('hub_payouts')
    .select('*')
    .eq('id', payout_id)
    .single();

  if (!payout) return;

  const { data: contractor } = await supabase
    .from('hub_users')
    .select('full_name, department, email, currency')
    .eq('id', payout.contractor_id)
    .single();

  if (!contractor) return;

  const currency = contractor.currency === 'USD' ? 'USD' : 'PHP';

  const periodStart = new Date(payout.cutoff_start);
  const periodEnd = new Date(payout.cutoff_end);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const calendarEndDay = periodStart.getDate() >= 16
    ? new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 0).getDate()
    : periodEnd.getDate();
  const periodLabel = periodStart.getMonth() === periodEnd.getMonth()
    ? `${months[periodStart.getMonth()]} ${periodStart.getDate()}–${calendarEndDay}, ${periodStart.getFullYear()}`
    : `${months[periodStart.getMonth()]} ${periodStart.getDate()} – ${months[periodEnd.getMonth()]} ${calendarEndDay}, ${periodStart.getFullYear()}`;

  const payrollUrl = 'https://www.hunacreatives.com/hub/admin/payroll';

  const html = teamPayslipEmail({ name: contractor.full_name, department: contractor.department, periodLabel, amount: fmt(payout.final_payout, currency), reviewUrl: payrollUrl });

  const slackPost = async (path: string, body: unknown) => {
    const res = await fetch(`https://slack.com/api/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(path === 'chat.postMessage' ? { unfurl_links: false, unfurl_media: false, ...(body as Record<string, unknown>) } : body),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      console.error(`Slack API failed: ${path}`, { status: res.status, response: json });
      throw new Error(`Slack API failed: ${path} - ${json.error ?? res.status}`);
    }
    return json;
  };

  if (type === 'dispute') {
    if (SLACK_BOT_TOKEN) {
      try {
        const dm = await slackPost('conversations.open', { users: ABIGAIL_SLACK_ID });
        await slackPost('chat.postMessage', {
          channel: dm.channel.id,
          text: `🚩 *Payslip disputed* — *${contractor.full_name}* has flagged their payslip for *${periodLabel}* (${fmt(payout.final_payout, currency)}). Review it here: ${payrollUrl}`,
        });
      } catch (slackErr) {
        console.error('Slack DM failed (dispute notification):', slackErr);
      }
    }
    await pushToAdmins(supabase, 'Payslip disputed', `${contractor.full_name} has flagged their payslip for ${periodLabel}. Review needed.`, payrollUrl);
    return;
  }

  // type === 'submitted': notify admins
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

  // No email to the employee: they just submitted it in Sentro, and the
  // "Payment sent" email is the one they keep.

  await pushToAdmins(supabase, 'Payslip submitted', `${contractor.full_name} submitted their payslip for ${periodLabel} (${fmt(payout.final_payout, currency)}). Review needed.`, payrollUrl);

  // Slack DM to Abigail — isolated so email success is not masked
  if (SLACK_BOT_TOKEN) {
    try {
      const dm = await slackPost('conversations.open', { users: ABIGAIL_SLACK_ID });
      await slackPost('chat.postMessage', {
        channel: dm.channel.id,
        text: `💰 *Payslip submitted* — *${contractor.full_name}* has submitted their payslip for *${periodLabel}* (${fmt(payout.final_payout, currency)}). Review it here: ${payrollUrl}`,
      });
    } catch (slackErr) {
      console.error('Slack DM failed (submit notification):', slackErr);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { payout_id, type } = await req.json();
    if (!payout_id) return new Response(JSON.stringify({ error: 'payout_id required' }), { status: 400, headers: cors });

    const notifType = type === 'dispute' ? 'dispute' : 'submitted';
    const payout_id_str = String(payout_id);
    // @ts-ignore
    EdgeRuntime.waitUntil((async () => {
      try {
        await sendNotification(payout_id_str, notifType);
      } catch (error) {
        console.error('notify-payslip-submitted background task failed', { payout_id: payout_id_str, type: notifType, error });
      }
    })());

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

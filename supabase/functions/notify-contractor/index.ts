import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { disputeResolvedEmail } from './email.ts';
import { hasPush } from '../_shared/push.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL = 'payroll@hunacreatives.com';
const HUB_URL = 'https://www.hunacreatives.com/hub/login';

async function sendPush(user_id: string, title: string, body: string, url?: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, title, body, url }),
    });
  } catch (err) {
    console.error('sendPush failed:', err);
  }
}

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function fmt(val: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
}

async function sendNotification(payout_id: string, type: 'hr_approved' | 'dispute_resolved') {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: payout } = await supabase
    .from('hub_payouts')
    .select('*')
    .eq('id', payout_id)
    .single();

  if (!payout) return;

  const { data: contractor } = await supabase
    .from('hub_users')
    .select('full_name, email, department, slack_id')
    .eq('id', payout.contractor_id)
    .single();

  if (!contractor || !contractor.email) return;

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const periodStart = new Date(payout.cutoff_start);
  const periodEnd = new Date(payout.cutoff_end);
  const calendarEndDay = periodStart.getDate() >= 16
    ? new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 0).getDate()
    : periodEnd.getDate();
  const periodLabel = periodStart.getMonth() === periodEnd.getMonth()
    ? `${months[periodStart.getMonth()]} ${periodStart.getDate()}–${calendarEndDay}, ${periodStart.getFullYear()}`
    : `${months[periodStart.getMonth()]} ${periodStart.getDate()} – ${months[periodEnd.getMonth()]} ${calendarEndDay}, ${periodStart.getFullYear()}`;

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

  if (type === 'hr_approved') {
    // Approval goes out on Slack / app push only; the "Payment sent" email follows
    // with the payslip, so a second email here would repeat it.
    if (SLACK_BOT_TOKEN && contractor.slack_id && !(await hasPush(payout.contractor_id))) {
      try {
        const dm = await slackPost('conversations.open', { users: contractor.slack_id });
        await slackPost('chat.postMessage', {
          channel: dm.channel.id,
          text: `✅ *Payslip approved!* Your payslip for *${periodLabel}* (${fmt(payout.final_payout)}) has been approved by HR. Payment will be sent within 2 business days.`,
        });
      } catch (slackErr) {
        console.error('Slack DM failed (hr_approved):', slackErr);
      }
    }
    await sendPush(payout.contractor_id, 'Payslip Approved', `Your payslip for ${periodLabel} (${fmt(payout.final_payout)}) has been approved. Payment incoming.`, HUB_URL);
  }

  if (type === 'dispute_resolved') {
    const html = disputeResolvedEmail({ firstName: contractor.full_name.split(' ')[0], periodLabel, amount: fmt(payout.final_payout) });

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Huna Creatives Payroll <${FROM_EMAIL}>`,
        // Only contact@ is a real mailbox; replies to the sender address would bounce.
        reply_to: 'contact@hunacreatives.com',
        to: contractor.email,
        subject: `Your payslip flag is resolved — ${periodLabel}`,
        html,
      }),
    });

    if (SLACK_BOT_TOKEN && contractor.slack_id && !(await hasPush(payout.contractor_id))) {
      try {
        const dm = await slackPost('conversations.open', { users: contractor.slack_id });
        await slackPost('chat.postMessage', {
          channel: dm.channel.id,
          text: `🔔 *Dispute resolved* — Your payslip flag for *${periodLabel}* has been reviewed and resolved by HR. Questions? Reach out on Slack.`,
        });
      } catch (slackErr) {
        console.error('Slack DM failed (dispute_resolved):', slackErr);
      }
    }
    await sendPush(payout.contractor_id, 'Dispute Resolved', `Your payslip dispute for ${periodLabel} has been reviewed and resolved by HR.`, HUB_URL);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { payout_id, type } = await req.json();
    if (!payout_id || !type) return new Response(JSON.stringify({ error: 'payout_id and type required' }), { status: 400, headers: cors });
    if (type !== 'hr_approved' && type !== 'dispute_resolved') {
      return new Response(JSON.stringify({ error: 'type must be hr_approved or dispute_resolved' }), { status: 400, headers: cors });
    }

    const payout_id_str = String(payout_id);
    // @ts-ignore
    EdgeRuntime.waitUntil((async () => {
      try {
        await sendNotification(payout_id_str, type);
      } catch (error) {
        console.error('notify-contractor background task failed', { payout_id: payout_id_str, type, error });
      }
    })());

    return new Response(JSON.stringify({ ok: true, queued: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

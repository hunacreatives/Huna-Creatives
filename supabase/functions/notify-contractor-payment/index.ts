import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hasPush } from '../_shared/push.ts';
import { projectPayoutEmail } from './email.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const FROM_EMAIL = 'Huna Creatives <billing@hunacreatives.com>';
const HUB_URL = Deno.env.get('HUB_URL') ?? 'https://www.hunacreatives.com/hub/contractor/payouts';

async function slackDm(userId: string, text: string) {
  const opened = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ users: userId }),
  });
  const openedJson = await opened.json();
  const channel = openedJson.ok ? openedJson.channel?.id : userId;
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, text , unfurl_links: false, unfurl_media: false }),
  });
}

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const fmt = (n: number) =>
  '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const {
      to,
      contractor_id,
      contractor_name,
      project_name,
      period_label,
      client_name,
      amount,
      paid_at,
      notes,
      receipt_url,
      total_paid,
      total_cut,
      is_fully_paid,
    } = await req.json();

    if (!to || !contractor_name || !project_name || !amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: cors });
    }

    const dateStr = new Date(paid_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const html = projectPayoutEmail({
      name: contractor_name, projectName: project_name, clientName: client_name, amount: fmt(amount), date: dateStr,
      notes, totalCut: total_cut ?? 0, totalPaid: total_paid ?? 0, isFullyPaid: !!is_fully_paid, receiptUrl: receipt_url, fmt,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: `You've been paid ${fmt(amount)} — ${project_name}`,
        html,
      }),
    });

    const resBody = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: resBody?.message ?? 'Failed to send' }), { status: 200, headers: cors });
    }

    // Slack DM to contractor
    if (SLACK_BOT_TOKEN) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        let slackId: string | null = null;
        if (contractor_id) {
          const { data: u } = await supabase.from('hub_users').select('slack_id').eq('id', contractor_id).single();
          slackId = u?.slack_id ?? null;
        } else if (to) {
          const { data: u } = await supabase.from('hub_users').select('slack_id').eq('email', to.toLowerCase()).single();
          slackId = u?.slack_id ?? null;
        }
        if (slackId && !(contractor_id && await hasPush(contractor_id))) {
          const amountFmt = '₱' + (amount as number).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const periodText = period_label ? ` · ${period_label}` : '';
          await slackDm(slackId, `💸 *Payment received*\n${amountFmt} has been sent for *${project_name}*${periodText}.\nPlease check your account. Reach out if anything looks off.\n<${HUB_URL}|Open Hub →>`);
        }
      } catch (err) { console.error('Slack payment DM failed (non-fatal):', err); }
    }

    if (contractor_id) {
      const amountFmt = '₱' + (amount as number).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const periodText = period_label ? ` · ${period_label}` : '';
      await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: contractor_id, title: 'Payment received', body: `${amountFmt} has been sent for ${project_name}${periodText}.`, url: HUB_URL }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

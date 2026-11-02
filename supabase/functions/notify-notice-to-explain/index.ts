import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DECISION_LABELS, fmtDay, noticeDecidedEmail, noticeSentEmail } from './email.ts';
import { hasPush } from '../_shared/push.ts';

// sent    → the employee gets the written notice (email + Slack/push + bell)
// reply   → admins hear the employee answered (Slack to Abigail + push)
// decided → the employee gets HR's written decision (email + Slack/push + bell)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL = 'hr@hunacreatives.com';
const ABIGAIL_SLACK_ID = 'U091BL9PQ77';
const HUB_URL = 'https://www.hunacreatives.com/hub/login';
const PAYROLL_URL = 'https://www.hunacreatives.com/hub/admin/payroll';

type NoticeEvent = 'sent' | 'reply' | 'decided';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function periodLabel(start: string, end: string): string {
  const [sy, sm, sd] = start.split('-').map(Number);
  const [, em, endDay] = end.split('-').map(Number);
  // A second-half period ends on its last working day; label it to month end.
  const ed = sd >= 16 ? new Date(Date.UTC(sy, sm, 0)).getUTCDate() : endDay;
  return sm === em
    ? `${MONTHS[sm - 1]} ${sd}–${ed}, ${sy}`
    : `${MONTHS[sm - 1]} ${sd} – ${MONTHS[em - 1]} ${ed}, ${sy}`;
}

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

async function slackDm(slackId: string, text: string) {
  const post = async (path: string, body: unknown) => {
    const res = await fetch(`https://slack.com/api/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(`Slack API failed: ${path} - ${json.error ?? res.status}`);
    return json;
  };
  const dm = await post('conversations.open', { users: slackId });
  await post('chat.postMessage', { channel: dm.channel.id, text, unfurl_links: false, unfurl_media: false });
}

async function sendNotification(notice_id: string, event: NoticeEvent) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: notice } = await supabase.from('hub_notices_to_explain').select('*').eq('id', notice_id).single();
  if (!notice) return;

  const { data: employee } = await supabase
    .from('hub_users')
    .select('full_name, email, slack_id')
    .eq('id', notice.contractor_id)
    .single();
  if (!employee) return;

  const firstName = employee.full_name.split(' ')[0];
  const label = periodLabel(notice.period_start, notice.period_end);
  const dates = (notice.incidents ?? []).map((i: { date: string }) => fmtDay(i.date)).join(', ');

  if (event === 'reply') {
    try {
      await slackDm(ABIGAIL_SLACK_ID, `📝 *Notice to explain answered* — *${employee.full_name}* replied to the notice for *${label}* (${dates}). Review it and record a decision: ${PAYROLL_URL}`);
    } catch (err) {
      console.error('Slack DM failed (notice reply):', err);
    }
    const { data: admins } = await supabase.from('hub_users').select('id').in('role', ['admin', 'owner']).eq('status', 'active');
    await Promise.all((admins ?? []).map((a: { id: string }) =>
      sendPush(a.id, 'Notice to explain answered', `${employee.full_name} replied to the notice for ${label}.`, PAYROLL_URL)));
    return;
  }

  const isSent = event === 'sent';
  const subject = isSent
    ? `Notice to explain — ${label}`
    : `Decision on your notice to explain — ${label}`;
  const html = isSent
    ? noticeSentEmail({ firstName, periodLabel: label, incidents: notice.incidents ?? [], details: notice.details, replyBy: notice.reply_by })
    : noticeDecidedEmail({ firstName, periodLabel: label, incidents: notice.incidents ?? [], decision: notice.decision, note: notice.decision_note, replied: !!notice.responded_at });

  if (employee.email) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Huna Creatives HR <${FROM_EMAIL}>`,
        // Only contact@ is a real mailbox; replies to the sender address would bounce.
        reply_to: 'contact@hunacreatives.com',
        to: employee.email,
        subject,
        html,
      }),
    });
    if (!res.ok) console.error('Resend failed:', res.status, await res.text());
  }

  const bellTitle = isSent ? 'Notice to explain' : 'Decision on your notice to explain';
  const bellBody = isSent
    ? `Please reply in writing by ${fmtDay(notice.reply_by)} (${dates}).`
    : `${DECISION_LABELS[notice.decision] ?? notice.decision} — ${label}`;
  const { error: bellError } = await supabase.from('hub_notifications').insert({
    user_id: notice.contractor_id, type: 'notice_to_explain',
    title: bellTitle, body: bellBody, link: '/hub/contractor/payouts', read: false,
  });
  if (bellError) console.error('Bell notification failed:', bellError);

  if (SLACK_BOT_TOKEN && employee.slack_id && !(await hasPush(notice.contractor_id))) {
    try {
      await slackDm(employee.slack_id, isSent
        ? `*Notice to explain* — HR sent you a written notice about ${dates} (${label}). Please reply in Sentro by *${fmtDay(notice.reply_by)}*. The full notice is in your email.`
        : `*Decision on your notice to explain* (${label}): *${DECISION_LABELS[notice.decision] ?? notice.decision}*. Details are in your email and in Sentro.`);
    } catch (err) {
      console.error('Slack DM failed (notice):', err);
    }
  }
  await sendPush(notice.contractor_id, bellTitle, bellBody, HUB_URL);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { notice_id, event } = await req.json();
    if (!notice_id || !['sent', 'reply', 'decided'].includes(event)) {
      return new Response(JSON.stringify({ error: 'notice_id and event (sent | reply | decided) required' }), { status: 400, headers: cors });
    }

    // Only HR can trigger the notice and decision; only the employee their own reply.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: 'Not signed in' }), { status: 401, headers: cors });
    const [{ data: caller }, { data: notice }] = await Promise.all([
      supabase.from('hub_users').select('role').eq('id', user.id).single(),
      supabase.from('hub_notices_to_explain').select('contractor_id').eq('id', notice_id).single(),
    ]);
    const allowed = event === 'reply'
      ? notice?.contractor_id === user.id
      : ['admin', 'owner', 'hr'].includes(caller?.role ?? '');
    if (!allowed) return new Response(JSON.stringify({ error: 'Not allowed' }), { status: 403, headers: cors });

    // @ts-ignore
    EdgeRuntime.waitUntil((async () => {
      try {
        await sendNotification(String(notice_id), event as NoticeEvent);
      } catch (error) {
        console.error('notify-notice-to-explain background task failed', { notice_id, event, error });
      }
    })());

    return new Response(JSON.stringify({ ok: true, queued: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

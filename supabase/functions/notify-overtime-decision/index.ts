import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hasPush } from '../_shared/push.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
const OT_URL = 'https://www.hunacreatives.com/hub/contractor/overtime';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

async function sendPush(user_id: string, title: string, body: string, url?: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, title, body, url }),
    });
  } catch {}
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { contractor_id, date, hours, decision } = await req.json() as {
      contractor_id: string;
      date: string;
      hours: number;
      decision: 'approved' | 'rejected';
    };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: user } = await supabase
      .from('hub_users')
      .select('slack_id')
      .eq('id', contractor_id)
      .single();

    const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const approved = decision === 'approved';
    const notifTitle = approved ? 'Overtime approved' : 'Overtime not approved';
    const notifBody = approved
      ? `Your ${hours}h OT request for ${dateLabel} has been approved.`
      : `Your ${hours}h OT request for ${dateLabel} was not approved.`;

    await supabase.from('hub_notifications').insert({
      user_id: contractor_id,
      type: approved ? 'overtime_approved' : 'overtime_rejected',
      title: notifTitle,
      body: notifBody,
      link: OT_URL,
      read: false,
    }).catch(() => {});

    if (user?.slack_id && SLACK_BOT_TOKEN && !(await hasPush(user.id))) {
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: user.slack_id,
          text: notifBody,
          unfurl_links: false,
          unfurl_media: false,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${approved ? '✅' : '❌'} *${notifTitle}*\n${notifBody}`,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'View Overtime →' },
                  url: OT_URL,
                  style: approved ? 'primary' : 'danger',
                },
              ],
            },
          ],
        }),
      }).catch(() => {});
    }

    await sendPush(contractor_id, notifTitle, notifBody, OT_URL);

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

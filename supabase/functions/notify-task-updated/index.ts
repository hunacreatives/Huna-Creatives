import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
const HUB_URL = 'https://www.hunacreatives.com/hub/contractor/projects';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

async function sendPush(supabase: any, user_id: string, title: string, body: string, url?: string) {
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
    const {
      task_id,
      project_id,
      task_title,
      project_name,
      updated_by_id,
      updated_by_name,
      change_description,
    } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch task assignees
    const { data: task } = await supabase
      .from('hub_project_tasks')
      .select('assigned_to, assignee_ids')
      .eq('id', task_id)
      .single();

    const assigneeIds: string[] = [
      ...(task?.assigned_to ? [task.assigned_to] : []),
      ...((task?.assignee_ids as string[]) ?? []),
    ];

    // Fetch all admins/owners
    const { data: admins } = await supabase
      .from('hub_users')
      .select('id, slack_id')
      .in('role', ['admin', 'owner']);

    const adminIds: string[] = (admins ?? []).map((a: any) => a.id);

    // Deduplicate: assignees + admins, exclude updater
    const toNotifyIds = [...new Set([...assigneeIds, ...adminIds])].filter(
      (id) => id !== updated_by_id
    );

    if (toNotifyIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no one to notify' }), { headers: cors });
    }

    // Fetch full user details for those we're notifying
    const { data: users } = await supabase
      .from('hub_users')
      .select('id, slack_id')
      .in('id', toNotifyIds);

    const deepLink = `${HUB_URL}?workspace=${project_id}&task=${task_id}`;
    const notifTitle = 'Task updated';
    const notifBody = change_description ?? `${updated_by_name} updated "${task_title}"`;

    // Insert hub_notifications
    await supabase.from('hub_notifications').insert(
      toNotifyIds.map((uid) => ({
        user_id: uid,
        type: 'task_updated',
        title: notifTitle,
        body: notifBody,
        link: deepLink,
        read: false,
      }))
    );

    // Slack DMs
    if (SLACK_BOT_TOKEN) {
      for (const user of users ?? []) {
        if (!user.slack_id) continue;
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
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
                  text: `✏️ ${notifBody}${project_name ? `\n*Project:* ${project_name}` : ''}`,
                },
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Open Task →' },
                    url: deepLink,
                    style: 'primary',
                  },
                ],
              },
            ],
          }),
        }).catch(() => {});

        await sendPush(supabase, user.id, notifTitle, notifBody, deepLink);
      }
    }

    return new Response(JSON.stringify({ ok: true, notified: toNotifyIds.length }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

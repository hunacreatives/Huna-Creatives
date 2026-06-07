import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const HUB_URL = 'https://www.hunacreatives.com/hub/contractor/projects';

async function sendPush(user_id: string, title: string, body: string, url?: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, title, body, url }),
    });
  } catch {}
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { comment_id, task_id, author_id, author_name, body, project_id } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Extract @mentions (first name or last name, case-insensitive)
    const mentions = [...body.matchAll(/@(\w+)/g)].map(m => m[1].toLowerCase());
    if (!mentions.length) return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: cors });

    // Fetch all hub_users for this project (contractors + admins/owners)
    const { data: pcRows } = await supabase
      .from('hub_project_contractors')
      .select('contractor_id')
      .eq('project_id', project_id);

    const contractorIds = (pcRows ?? []).map((r: any) => r.contractor_id);

    const [contractorsRes, adminsRes] = await Promise.all([
      contractorIds.length > 0
        ? supabase.from('hub_users').select('id, full_name, slack_id, email').in('id', contractorIds)
        : Promise.resolve({ data: [] }),
      supabase.from('hub_users').select('id, full_name, slack_id, email').in('role', ['admin', 'owner']),
    ]);

    const seen = new Set<string>();
    const teamMembers = [...(contractorsRes.data ?? []), ...(adminsRes.data ?? [])].filter((u: any) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });

    // Use passed author name or fall back to DB lookup
    let authorName = author_name;
    if (!authorName) {
      const { data: author } = await supabase.from('hub_users').select('full_name').eq('id', author_id).single();
      authorName = author?.full_name ?? 'Someone';
    }

    // Fetch task title
    const { data: task } = await supabase
      .from('hub_project_tasks')
      .select('title')
      .eq('id', task_id)
      .single();

    const taskTitle = task?.title ?? 'a task';

    // Notify each mentioned user
    for (const mention of mentions) {
      const mentioned = teamMembers.find((m: any) => {
        const parts = (m.full_name ?? '').toLowerCase().split(' ');
        return parts.some((p: string) => p === mention);
      });
      if (!mentioned || mentioned.id === author_id) continue;

      const deepLink = `${HUB_URL}?workspace=${project_id}&task=${task_id}`;

      // In-app notification
      await supabase.from('hub_notifications').insert({
        user_id: mentioned.id,
        type: 'task_mention',
        title: `${authorName} mentioned you`,
        body: `In "${taskTitle}": ${body.slice(0, 100)}`,
        link: deepLink,
        read: false,
      }).catch(() => {});

      // Slack DM if they have a slack_id
      if (mentioned.slack_id && SLACK_BOT_TOKEN) {
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: mentioned.slack_id,
            text: `💬 *${authorName}* mentioned you in a task comment on *"${taskTitle}"*:\n> ${body.slice(0, 200)}\n<${deepLink}|Open in Sentro Hub →>`,
          }),
        }).catch(() => {});
      }
      await sendPush(mentioned.id, `${authorName} mentioned you`, `In "${taskTitle}": ${body.slice(0, 100)}`, deepLink);
    }

    return new Response(JSON.stringify({ ok: true, mentions }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

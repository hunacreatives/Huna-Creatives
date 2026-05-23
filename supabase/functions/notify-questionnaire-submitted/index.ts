const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const NOTIFY_USERS = ['U091BL9PQ77', 'U0838LWSY4E']; // Abigail, Francis

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

async function slackPost(path: string, body: object) {
  const res = await fetch(`https://slack.com/api/${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function dm(userId: string, client_name: string, service_type: string) {
  const opened = await slackPost('conversations.open', { users: userId });
  const channel = opened.ok ? opened.channel?.id : userId;

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📋 *New questionnaire submitted!*\n*${client_name}* just filled out their *${service_type}* questionnaire.`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View responses →', emoji: true },
          url: 'https://hunacreatives.com/hub/admin/questionnaires',
          style: 'primary',
        },
      ],
    },
  ];

  const result = await slackPost('chat.postMessage', { channel, blocks });
  console.log(`DM to ${userId}:`, JSON.stringify(result));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { client_name, service_type } = await req.json();
    if (!client_name || !service_type) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 200, headers: cors });
    }

    await Promise.all(NOTIFY_USERS.map(id => dm(id, client_name, service_type)));
    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 200, headers: cors });
  }
});

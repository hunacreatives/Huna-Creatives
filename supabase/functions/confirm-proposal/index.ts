import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { proposalConfirmedEmail } from './email.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const ADMIN_SLACK_IDS = ['U091BL9PQ77', 'U0838LWSY4E'];
const FROM = 'Huna Creatives <noreply@hunacreatives.com>';

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function slackDm(userId: string, text: string, blocks?: object[]) {
  if (!SLACK_BOT_TOKEN) return;
  const opened = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ users: userId }),
  });
  const { channel } = await opened.json();
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: channel?.id ?? userId, text, unfurl_links: false, ...(blocks ? { blocks } : {}) }),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { client, proposal } = await req.json();
    const clientName = client ?? 'Adrian Manuel Tan';
    const proposalName = proposal ?? 'Capu Coffee Brand Elevation';

    // Slack DM to all admins
    const slackText = `✅ *Proposal confirmed*\n*${clientName}* has confirmed the *${proposalName}* proposal and is ready to move forward with Stage 01.`;
    const blocks = [
      { type: 'section', text: { type: 'mrkdwn', text: slackText } },
      {
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: 'View proposal →', emoji: true },
          url: 'https://hunacreatives.com/p/capu-coffee',
          style: 'primary',
        }],
      },
    ];
    await Promise.all(ADMIN_SLACK_IDS.map(id => slackDm(id, slackText, blocks).catch(() => {})));

    // Email to Huna Creatives
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: ['contact@hunacreatives.com'],
        subject: `Proposal confirmed — ${proposalName}`,
        html: proposalConfirmedEmail(clientName, proposalName),
      }),
    });

    return new Response(JSON.stringify({ sent: true }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});

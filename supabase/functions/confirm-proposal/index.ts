import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;padding:32px;margin:0">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#080604;padding:20px 24px">
    <span style="color:#C4873A;font-weight:700;font-size:14px;letter-spacing:0.1em">HUNA CREATIVES</span>
  </div>
  <div style="padding:28px 24px">
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Proposal confirmed ✅</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6">
      <strong>${clientName}</strong> has confirmed the <strong>${proposalName}</strong> proposal and is ready to move forward with Stage 01.
    </p>
    <p style="margin:0;font-size:14px;color:#6b7280">Send over the agreement and invoice to get things started.</p>
  </div>
  <div style="padding:16px 24px;border-top:1px solid #f3f4f6;font-size:11px;color:#9ca3af">
    Huna Creatives · <a href="https://hunacreatives.com/hub/admin/contact" style="color:#C4873A;text-decoration:none">Open Hub →</a>
  </div>
</div></body></html>`,
      }),
    });

    return new Response(JSON.stringify({ sent: true }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});

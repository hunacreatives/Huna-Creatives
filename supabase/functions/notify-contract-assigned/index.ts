import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { signRequestEmail } from './email.ts';
import { hasPush } from '../_shared/push.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL = 'hr@hunacreatives.com';
const HUB_URL = 'https://www.hunacreatives.com/hub/contractor/documents';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

async function slackPost(path: string, body: object) {
  const res = await fetch(`https://slack.com/api/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}


async function run(assignment_id: string) {
  console.log('[notify-contract-assigned] running for assignment:', assignment_id);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: assignment, error: aErr } = await supabase
    .from('hub_sign_assignments')
    .select('*, hub_sign_documents(title), hub_users!contractor_id(full_name, email, slack_id, status)')
    .eq('id', assignment_id)
    .single();

  if (aErr) console.error('[notify-contract-assigned] DB error:', aErr);
  if (!assignment) { console.error('[notify-contract-assigned] no assignment found'); return; }

  const contractor = (assignment as any).hub_users;
  const doc = (assignment as any).hub_sign_documents;

  console.log('[notify-contract-assigned] contractor:', contractor?.full_name, contractor?.email, 'status:', contractor?.status);

  if (!contractor?.email) { console.error('[notify-contract-assigned] no contractor email'); return; }

  // If the contractor hasn't been invited yet (status = pending), skip everything —
  // the invite hasn't been sent, so they have no access and no need to be notified yet.
  // The contract will be waiting when they log in after receiving the invite.
  if (contractor.status === 'pending') {
    console.log('[notify-contract-assigned] skipping — contractor not yet invited');
    return;
  }

  // If status is 'invited' (legacy: invite sent but not logged in), skip email only.
  const skipEmail = false;

  const firstName = contractor.full_name?.split(' ')[0] ?? contractor.full_name;

  // --- Slack DM ---
  const slackUserId = contractor.slack_id ?? null;
  if (slackUserId && !(await hasPush(assignment.contractor_id))) {
    const dmOpen = await slackPost('conversations.open', { users: slackUserId });
    const dmChannel = dmOpen.ok ? dmOpen.channel?.id : slackUserId;
    const dmResult = await slackPost('chat.postMessage', {
      channel: dmChannel,
      unfurl_links: false,
      unfurl_media: false,
      text: `Hi ${firstName}! You have a document waiting for your signature: *${doc?.title}*.`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hi ${firstName}! :wave: You have a document waiting for your signature.`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Document:*\n${doc?.title}` },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Sign Document →' },
              url: HUB_URL,
              style: 'primary',
            },
          ],
        },
      ],
    });
    console.log('[notify-contract-assigned] chat.postMessage result:', JSON.stringify(dmResult));
  }

  // --- Email (skipped for new invitees — they already got the Hub invite email) ---
  if (skipEmail) {
    console.log('[notify-contract-assigned] skipping email — contractor status is invited');
  } else {
  const html = signRequestEmail({ firstName, title: doc?.title ?? 'Document', url: HUB_URL });

  const emailResult = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Huna Creatives HR <${FROM_EMAIL}>`,
      to: contractor.email,
      subject: `Action Required: ${doc?.title} — Please Sign`,
      html,
    }),
  }).then(r => r.json());
  console.log('[notify-contract-assigned] email result:', JSON.stringify(emailResult));
  } // end skipEmail

  await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: assignment.contractor_id, title: 'Document needs your signature', body: `"${doc?.title}" is waiting for your signature.`, url: HUB_URL }),
  }).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { assignment_id } = await req.json();
    if (!assignment_id) return new Response(JSON.stringify({ error: 'assignment_id required' }), { status: 400, headers: cors });

    // @ts-ignore
    EdgeRuntime.waitUntil(run(String(assignment_id)));

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

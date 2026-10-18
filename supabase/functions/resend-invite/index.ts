import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdmin, authErrorResponse } from '../_shared/requireCaller.ts';
import { inviteEmail } from '../_shared/employeeEmails.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const ADMIN_SLACK_IDS = ['U091BL9PQ77', 'U0838LWSY4E'];
const FROM_EMAIL = 'onboarding@hunacreatives.com';

async function slackDm(userId: string, text: string, blocks: object[]) {
  if (!SLACK_BOT_TOKEN) return;
  const opened = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ users: userId }),
  });
  const { ok, channel } = await opened.json();
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: ok ? channel?.id : userId, text, blocks, unfurl_links: false, unfurl_media: false }),
  });
}

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Generates a working login link for an arbitrary account, so the caller
    // must be verified before any of it runs.
    await requireAdmin(req, supabase);

    const { contractor_id } = await req.json();
    if (!contractor_id) {
      return new Response(JSON.stringify({ error: 'contractor_id required' }), { status: 400, headers: cors });
    }

    const { data: contractor, error: fetchErr } = await supabase
      .from('hub_users')
      .select('email, full_name, status, slack_id')
      .eq('id', contractor_id)
      .maybeSingle();

    if (fetchErr || !contractor) {
      return new Response(JSON.stringify({ error: 'Employee not found' }), { status: 200, headers: cors });
    }

    const { email, full_name } = contractor;
    const firstName = full_name.split(' ')[0];

    // Try invite first (new user); fall back to recovery if auth user already exists
    let linkData, linkErr, isReset = false;

    ({ data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: email.toLowerCase(),
    }));

    if (linkErr || !linkData?.properties?.hashed_token) {
      isReset = true;
      ({ data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email.toLowerCase(),
      }));
    }

    if (linkErr || !linkData?.properties?.hashed_token) {
      return new Response(JSON.stringify({ error: linkErr?.message ?? 'Failed to generate link' }), { status: 200, headers: cors });
    }

    const { hashed_token } = linkData.properties;
    const type = isReset ? 'recovery' : 'invite';
    const destination = isReset
      ? `https://www.hunacreatives.com/hub/reset-password?token_hash=${hashed_token}&type=${type}`
      : `https://www.hunacreatives.com/hub/signup?invite=1&token_hash=${hashed_token}&type=${type}`;

    const html = inviteEmail({ firstName, url: destination, kind: isReset ? 'reset' : 'fresh-link' });
    const subject = isReset
      ? `${firstName}, reset your Sentro password`
      : `${firstName}, here's your Sentro invite link`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Huna Creatives Onboarding <${FROM_EMAIL}>`,
        // Only contact@ is a real mailbox; replies to the sender address would bounce.
        reply_to: 'contact@hunacreatives.com',
        to: [email.toLowerCase()],
        subject,
        html,
      }),
    });

    // If this was a first-time invite for a pending contractor, activate + notify Slack
    if (!isReset && contractor.status === 'pending') {
      await supabase.from('hub_users').update({ status: 'active' }).eq('id', contractor_id);
      const slackBlocks = [
        { type: 'section', text: { type: 'mrkdwn', text: `👋 *New team member added*\n*${full_name}* has been invited to Sentro Hub as an employee.\nThey'll receive a login link by email.` } },
        { type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: 'View profile →', emoji: true }, url: 'https://www.hunacreatives.com/hub/admin/contractors', style: 'primary' }] },
      ];
      await Promise.all(ADMIN_SLACK_IDS.map(id => slackDm(id, `${full_name} has been invited as an employee.`, slackBlocks).catch(() => {})));
    }

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    const authRes = authErrorResponse(err, cors);
    if (authRes) return authRes;
    return new Response(JSON.stringify({ error: String(err) }), { status: 200, headers: cors });
  }
});

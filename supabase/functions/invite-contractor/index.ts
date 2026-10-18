import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { inviteEmail } from '../_shared/employeeEmails.ts';
import { requireAdmin, authErrorResponse } from '../_shared/requireCaller.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const ADMIN_SLACK_IDS = ['U091BL9PQ77', 'U0838LWSY4E'];
const FROM_EMAIL = 'onboarding@hunacreatives.com';
const HUB_SIGNUP_URL = 'https://www.hunacreatives.com/hub/signup?invite=1';

async function slackDm(userId: string, text: string, blocks?: object[]) {
  if (!SLACK_BOT_TOKEN) return;
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
    body: JSON.stringify({ channel, text, ...(blocks ? { blocks, unfurl_links: false, unfurl_media: false } : {}) }),
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

    // Verify the caller BEFORE touching anything. Without this, `role` below is
    // attacker-controlled and this function mints owner accounts for anyone
    // holding the public anon key.
    const caller = await requireAdmin(req, supabase);

    const {
      email, full_name, role = 'contractor', department, job_title, start_date,
      payment_type, hourly_rate, monthly_rate, project_percentage, currency = 'PHP',
      shift_start, shift_end, work_days, slack_id,
      skip_invite = false,
    } = await req.json();

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: 'email and full_name required' }), { status: 400, headers: cors });
    }

    // Check not already in hub_users
    const { data: existing } = await supabase
      .from('hub_users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: 'An employee with this email already exists.' }), { status: 200, headers: cors });
    }

    // `role` arrives from the request body, so it has to be constrained to a
    // known set -- and only an owner may mint another owner/admin.
    const ALLOWED_ROLES = ['contractor', 'employee', 'hr', 'admin', 'owner'];
    if (!ALLOWED_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: `Invalid role: ${role}` }), { status: 400, headers: cors });
    }
    if (['owner', 'admin'].includes(role) && caller.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Only an owner can invite an owner or admin.' }), { status: 403, headers: cors });
    }

    // If a stale auth user exists (e.g. previously deleted from hub_users), remove it first
    const { data: { users: existingAuthUsers } } = await supabase.auth.admin.listUsers();
    const staleAuthUser = existingAuthUsers?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (staleAuthUser) {
      // Only delete if genuinely orphaned. The hub_users lookup above keys off
      // email; a row whose email was since changed would still own this auth
      // user, and deleting it would destroy a live account.
      const { data: ownedRow } = await supabase
        .from('hub_users').select('id').eq('id', staleAuthUser.id).maybeSingle();
      if (ownedRow) {
        return new Response(JSON.stringify({ error: 'That email belongs to an existing account.' }), { status: 409, headers: cors });
      }
      await supabase.auth.admin.deleteUser(staleAuthUser.id);
    }

    // Generate invite link (creates auth.users entry without sending Supabase's default email)
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: email.toLowerCase(),
      options: { redirectTo: HUB_SIGNUP_URL },
    });

    if (linkErr || !linkData?.user) {
      return new Response(JSON.stringify({ error: linkErr?.message ?? 'Failed to generate invite link' }), { status: 200, headers: cors });
    }

    const hashedToken = linkData.properties?.hashed_token;
    const inviteUrl = hashedToken
      ? `https://www.hunacreatives.com/hub/signup?invite=1&token_hash=${hashedToken}&type=invite`
      : linkData.properties?.action_link;

    // Create hub_users row with the new auth user's UUID
    const { error: insertErr } = await supabase.from('hub_users').insert({
      id: linkData.user.id,
      email: email.toLowerCase(),
      full_name,
      role,
      status: skip_invite ? 'pending' : 'active',
      department: department || null,
      job_title: job_title || null,
      start_date: start_date || null,
      payment_type: payment_type || null,
      hourly_rate: hourly_rate ? parseFloat(hourly_rate) : null,
      monthly_rate: monthly_rate ? parseFloat(monthly_rate) : null,
      project_percentage: project_percentage ? parseFloat(project_percentage) : null,
      currency,
      shift_start: shift_start || null,
      shift_end: shift_end || null,
      work_days: work_days || [],
      slack_id: slack_id || null,
    });

    if (insertErr) {
      await supabase.auth.admin.deleteUser(linkData.user.id);
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 200, headers: cors });
    }

    // If skip_invite, return early — email & Slack sent later via resend-invite
    if (skip_invite) {
      return new Response(JSON.stringify({ ok: true, user_id: linkData.user.id }), { headers: cors });
    }

    // Send branded welcome email via Resend
    const firstName = full_name.split(' ')[0];
    const html = inviteEmail({ firstName, url: inviteUrl, kind: 'welcome' });

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Huna Creatives Onboarding <${FROM_EMAIL}>`,
        to: [email.toLowerCase()],
        subject: `Welcome to Sentro, ${firstName}. Set your password to get started`,
        html,
      }),
    });

    // Slack DM to admins
    const slackBlocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `👋 *New team member added*\n*${full_name}* has been invited to Sentro Hub as an employee.\nThey'll receive a login link by email.`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View profile →', emoji: true },
            url: 'https://www.hunacreatives.com/hub/admin/contractors',
            style: 'primary',
          },
        ],
      },
    ];
    await Promise.all(ADMIN_SLACK_IDS.map(id => slackDm(id, `${full_name} has been invited as an employee.`, slackBlocks).catch(() => {})));

    return new Response(JSON.stringify({ ok: true, user_id: linkData.user.id }), { headers: cors });
  } catch (err) {
    // Auth rejections must surface as 401/403 -- the generic handler below
    // returns 200, which would let a caller mistake a refusal for a soft error.
    const authRes = authErrorResponse(err, cors);
    if (authRes) return authRes;
    return new Response(JSON.stringify({ error: String(err) }), { status: 200, headers: cors });
  }
});

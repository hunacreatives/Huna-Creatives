import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      email, full_name, role = 'contractor', department, start_date,
      payment_type, hourly_rate, monthly_rate, project_percentage, currency = 'PHP',
      shift_start, shift_end, work_days, slack_id,
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
      return new Response(JSON.stringify({ error: 'A contractor with this email already exists.' }), { status: 409, headers: cors });
    }

    // Send Supabase invite — creates auth.users entry + sends magic link email
    const redirectTo = `${SUPABASE_URL.replace('supabase.co', 'supabase.co').replace(/\/rest.*/, '')
      .replace('https://aaqpwobmfofztcbbsonw.supabase.co', 'https://hub.hunacreatives.com')}/hub/login`;

    const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: 'https://hub.hunacreatives.com/hub/signup',
    });

    if (inviteErr || !inviteData?.user) {
      return new Response(JSON.stringify({ error: inviteErr?.message ?? 'Failed to send invite' }), { status: 500, headers: cors });
    }

    // Create hub_users row with the new auth user's UUID
    const { error: insertErr } = await supabase.from('hub_users').insert({
      id: inviteData.user.id,
      email: email.toLowerCase(),
      full_name,
      role,
      status: 'active',
      department: department || null,
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
      // Clean up the auth user if hub_users insert fails
      await supabase.auth.admin.deleteUser(inviteData.user.id);
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: cors });
    }

    return new Response(JSON.stringify({ ok: true, user_id: inviteData.user.id }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

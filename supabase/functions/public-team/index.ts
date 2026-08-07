import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// hub_users holds sensitive HR/payroll data and is admin-only via RLS, so
// the public /about page can't query it directly. This runs with the
// service role but returns only the handful of fields an employee has
// explicitly opted into showing publicly (show_on_about = true) — merged
// with hub_about_team_extras, a small standalone roster for people who
// show up on the About page but don't have a Hub employee account
// (founders/partners without day-to-day Hub access).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const [employees, extras] = await Promise.all([
      supabase
        .from('hub_users')
        .select('full_name, avatar_url, department, job_title, about_bio, about_sort_order')
        .eq('status', 'active')
        .eq('show_on_about', true),
      supabase
        .from('hub_about_team_extras')
        .select('full_name, avatar_url, job_title, bio, sort_order')
        .eq('is_active', true),
    ]);

    if (employees.error) {
      return new Response(JSON.stringify({ error: employees.error.message }), { status: 500, headers: cors });
    }
    if (extras.error) {
      return new Response(JSON.stringify({ error: extras.error.message }), { status: 500, headers: cors });
    }

    const team = [
      ...(employees.data ?? []).map((m) => ({
        full_name: m.full_name,
        avatar_url: m.avatar_url,
        job_title: m.job_title,
        about_bio: m.about_bio,
        department: m.department,
        sort_order: m.about_sort_order,
      })),
      ...(extras.data ?? []).map((m) => ({
        full_name: m.full_name,
        avatar_url: m.avatar_url,
        job_title: m.job_title,
        about_bio: m.bio,
        department: null,
        sort_order: m.sort_order,
      })),
    ].sort((a, b) => (a.sort_order - b.sort_order) || a.full_name.localeCompare(b.full_name));

    return new Response(JSON.stringify({ team }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

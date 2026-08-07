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
// explicitly opted into showing publicly (show_on_about = true).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from('hub_users')
      .select('full_name, avatar_url, department, job_title, about_bio')
      .eq('status', 'active')
      .eq('show_on_about', true)
      .order('about_sort_order', { ascending: true })
      .order('full_name', { ascending: true });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
    }

    return new Response(JSON.stringify({ team: data ?? [] }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

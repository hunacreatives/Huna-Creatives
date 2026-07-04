import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Public, token-gated project status for clients. Returns ONLY client-safe
// fields — no payments, costs, payouts, assignees, or task descriptions.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string' || token.length < 20) {
      return new Response(JSON.stringify({ error: 'Status page not found' }), { status: 200, headers: cors });
    }

    const { data: project, error } = await supabase
      .from('hub_projects')
      .select('id, project_name, client_name, service, project_type, status, start_date, deadline, monthly_deliverables')
      .eq('client_status_token', token)
      .single();

    if (error || !project) {
      return new Response(JSON.stringify({ error: 'Status page not found' }), { status: 200, headers: cors });
    }

    const { data: tasks } = await supabase
      .from('hub_project_tasks')
      .select('id, title, status, due_date, start_date, completed_at, created_at')
      .eq('project_id', project.id)
      .not('archived', 'is', true)
      .order('due_date', { ascending: true, nullsFirst: false });

    const { id: _projectId, ...safeProject } = project;
    return new Response(JSON.stringify({ ok: true, project: safeProject, tasks: tasks ?? [] }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 200, headers: cors });
  }
});

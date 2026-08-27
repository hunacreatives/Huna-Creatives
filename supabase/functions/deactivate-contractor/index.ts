// Offboards a contractor in one action: stops future payroll AND revokes login.
//
// The Contractors page "Deactivate" button used to just flip hub_users.status
// to 'inactive' from the client. That correctly drops the contractor out of
// every payroll query (they all filter on status = 'active'), but their
// Supabase Auth session and password stay fully live -- nothing in
// AuthContext checks status, and RLS keys off contractor_id = auth.uid(), not
// status. Someone fired and "deactivated" could still sign into the hub and
// see their own assigned projects and tasks. This is the same gap fixed
// manually for two ex-employees earlier; this function makes the fix the
// default path instead of a manual follow-up someone has to remember.
//
// Auth is banned, not deleted: hub_payouts, hub_project_contractors, task
// assignments, etc. all carry FK/uuid references to this id, and a hard
// auth.admin.deleteUser leaves those pointing at nothing (the same class of
// bug the orphaned-task-assignee fix dealt with). A century-long ban is
// effectively permanent while keeping the id resolvable everywhere it's
// referenced, and un-banning is one call if a rehire happens.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdmin, authErrorResponse } from '../_shared/requireCaller.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const caller = await requireAdmin(req, supabase);

    const { contractor_id } = await req.json();
    if (!contractor_id) return json({ error: 'contractor_id required' }, 400);

    const { data: target } = await supabase
      .from('hub_users')
      .select('id, role, status')
      .eq('id', contractor_id)
      .maybeSingle();

    if (!target) return json({ error: 'not_found' }, 404);

    // Only an owner may deactivate another owner/admin -- same boundary
    // invite-contractor already enforces for granting those roles.
    if (['owner', 'admin'].includes(target.role) && caller.role !== 'owner') {
      return json({ error: 'Only an owner can deactivate an owner or admin.' }, 403);
    }

    const { error: updateErr } = await supabase
      .from('hub_users')
      .update({ status: 'inactive' })
      .eq('id', contractor_id);
    if (updateErr) return json({ error: updateErr.message }, 500);

    // ~100 years. Supabase treats this as an effectively permanent ban while
    // remaining reversible (ban_duration: 'none' lifts it) if they're rehired.
    const { error: banErr } = await supabase.auth.admin.updateUserById(contractor_id, {
      ban_duration: '876000h',
    });
    if (banErr) {
      // Status is already flipped -- payroll is stopped either way. Surface
      // the ban failure distinctly so the caller knows login access wasn't
      // actually revoked and can retry, rather than assuming this succeeded.
      return json({ ok: true, status_updated: true, auth_revoked: false, error: banErr.message });
    }

    return json({ ok: true, status_updated: true, auth_revoked: true });
  } catch (err) {
    const authRes = authErrorResponse(err, cors);
    if (authRes) return authRes;
    return json({ error: String(err) }, 500);
  }
});

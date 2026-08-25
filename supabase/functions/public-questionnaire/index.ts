// Serves a single questionnaire to an unauthenticated client, by token.
//
// The public page used to query hub_questionnaires directly as anon, which
// meant the table needed an anon SELECT policy. RLS cannot see the token in the
// request, so the only policy that made that work was `using (true)` -- and
// that let anyone list EVERY questionnaire, whether or not they held a token.
// Same for the submit path, which needed an anon UPDATE.
//
// A token is a capability, and capability checks belong in code that can read
// the request. This runs with the service role, matches the token itself, and
// returns exactly one row -- so both anon policies can be dropped.

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

// Never widen this. The page renders these and nothing else; returning the
// whole row would leak project_id and internal notes to a public caller.
const PUBLIC_FIELDS =
  'id, service_type, client_name, token, status, questions, answers, intro_message';

// A token that cannot be a real one is rejected before it reaches the database.
const TOKEN_RE = /^[A-Za-z0-9_-]{8,128}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode ?? 'get');
    const token = String(body?.token ?? '');

    if (!TOKEN_RE.test(token)) return json({ error: 'not_found' }, 404);

    // ── Fetch ───────────────────────────────────────────────────────────────
    if (mode === 'get') {
      const { data, error } = await supabase
        .from('hub_questionnaires')
        .select(PUBLIC_FIELDS)
        .eq('token', token)
        .maybeSingle();

      // Drafts are not published yet, so they read as absent rather than as
      // "exists but you cannot have it" -- a distinction worth not leaking.
      if (error || !data || data.status === 'draft') return json({ error: 'not_found' }, 404);

      return json({ questionnaire: data });
    }

    // ── Submit ──────────────────────────────────────────────────────────────
    if (mode === 'submit') {
      const answers = body?.answers;
      if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
        return json({ error: 'invalid_answers' }, 400);
      }

      // Scoped to unsubmitted rows, so a replayed request cannot overwrite
      // answers that are already in.
      const { data, error } = await supabase
        .from('hub_questionnaires')
        .update({
          answers,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('token', token)
        .eq('status', 'sent')
        .select('client_name, service_type')
        .maybeSingle();

      if (error) return json({ error: 'submit_failed' }, 500);
      if (!data) return json({ error: 'not_submittable' }, 409);

      return json({ ok: true, client_name: data.client_name, service_type: data.service_type });
    }

    return json({ error: 'bad_mode' }, 400);
  } catch (_err) {
    return json({ error: 'server_error' }, 500);
  }
});

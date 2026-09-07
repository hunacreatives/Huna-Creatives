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

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = 'Huna Creatives <contact@hunacreatives.com>';
const TEAM_EMAIL = 'contact@hunacreatives.com';

// Confirms to the client that their brief landed, and says what comes next.
async function sendReceivedEmail(to: string, clientName: string, serviceType: string) {
  if (!RESEND_API_KEY || !to) return;
  const first = String(clientName ?? '').trim().split(' ')[0] || 'there';
  const nextLine = serviceType === 'Partner — Shopify Store Build'
    ? "We'll review it and send your formal quotation for the first site along with the partnership agreement. On sign-off and the deposit, we start Discovery."
    : "We'll review it and come back to you shortly with the next steps.";
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      bcc: [TEAM_EMAIL],
      reply_to: TEAM_EMAIL,
      subject: 'We’ve got your brief',
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0ede8">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f0ede8">
  <tr><td align="center" style="padding:40px 16px">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <tr><td style="background:#111;padding:26px 40px;border-bottom:3px solid #FF6B35">
        <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives" height="28" style="display:block;height:28px;width:auto;border:0">
      </td></tr>
      <tr><td style="padding:36px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
        <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:25px;font-weight:400;color:#1a1a1a">Thank you, ${first}.</h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#4a4a4a">Your project brief is in. ${nextLine}</p>
        <p style="margin:0;font-size:14px;line-height:1.8;color:#4a4a4a">Any questions in the meantime, just reply to this email.</p>
      </td></tr>
      <tr><td style="background:#111;padding:22px 40px;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif">
        <span style="font-size:11px;color:#888;letter-spacing:0.08em;text-transform:uppercase">Huna Creatives</span>
        <span style="font-size:11px;color:#555"> &middot; Cebu City, Philippines</span>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
    }),
  }).catch((e) => console.error('brief-received email failed:', e));
}

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
        .select('client_name, client_email, service_type')
        .maybeSingle();

      if (error) return json({ error: 'submit_failed' }, 500);
      if (!data) return json({ error: 'not_submittable' }, 409);

      // Best-effort: the submission is already saved.
      await sendReceivedEmail(data.client_email, data.client_name, data.service_type);

      return json({ ok: true, client_name: data.client_name, service_type: data.service_type });
    }

    return json({ error: 'bad_mode' }, 400);
  } catch (_err) {
    return json({ error: 'server_error' }, 500);
  }
});

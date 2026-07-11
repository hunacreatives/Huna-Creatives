import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Proxies the Carlo & Trixia wedding site's password-gated admin RSVP API
// (RSVPs live in that site's Vercel Blob store, not in Supabase). The site
// password stays server-side here:
//   npx supabase secrets set CARLO_TRIXIA_ADMIN_PW="<password>"
//
// Actions (admin/owner only — caller JWT is verified):
//   { action: 'list' }             → { entries }
//   { action: 'delete', id }       → { ok }

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const SITE_URL = Deno.env.get('CARLO_TRIXIA_SITE_URL') ?? 'https://carloandtrixia.com';
const ADMIN_PW = Deno.env.get('CARLO_TRIXIA_ADMIN_PW');

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // Verify the caller is a logged-in hub admin/owner
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: { user } = { user: null } } = await admin.auth.getUser(jwt);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: cors });
    }
    const { data: hubUser } = await admin.from('hub_users').select('role').eq('id', user.id).maybeSingle();
    if (!hubUser || !['owner', 'admin'].includes(hubUser.role)) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403, headers: cors });
    }

    if (!ADMIN_PW) {
      return new Response(JSON.stringify({ error: 'CARLO_TRIXIA_ADMIN_PW secret is not set' }), { status: 500, headers: cors });
    }

    const { action, id } = await req.json();

    if (action === 'list') {
      const res = await fetch(`${SITE_URL}/api/admin/rsvps?pw=${encodeURIComponent(ADMIN_PW)}`);
      if (!res.ok) {
        return new Response(JSON.stringify({ error: `Wedding site returned ${res.status}` }), { status: 502, headers: cors });
      }
      const data = await res.json();
      return new Response(JSON.stringify({ entries: data.entries ?? [] }), { headers: cors });
    }

    if (action === 'delete') {
      if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: cors });
      const res = await fetch(`${SITE_URL}/api/admin/rsvps?pw=${encodeURIComponent(ADMIN_PW)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        return new Response(JSON.stringify({ error: `Wedding site returned ${res.status}` }), { status: 502, headers: cors });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

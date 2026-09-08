// Logs one view of a shared proposal page. Public (deploy --no-verify-jwt):
// the /p/<slug> and /p/dobo pages ping it once on load. It reads the real
// client IP from the edge headers (the browser can't be trusted for that),
// best-effort geolocates it, writes a hub_proposal_views row, and flips a
// still-"sent" proposal to "viewed".
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

const ok = () => new Response(JSON.stringify({ ok: true }), { headers: cors });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { slug } = await req.json().catch(() => ({}));
    if (!slug || typeof slug !== 'string') return ok();

    const { data: proposal } = await supabase
      .from('hub_proposals')
      .select('id, status')
      .eq('slug', slug)
      .in('status', ['published', 'sent', 'viewed', 'accepted', 'declined'])
      .maybeSingle();
    if (!proposal) return ok();

    const ip = (req.headers.get('cf-connecting-ip')
      ?? req.headers.get('x-forwarded-for')?.split(',')[0]
      ?? '').trim() || null;
    const userAgent = (req.headers.get('user-agent') ?? '').slice(0, 400) || null;

    let city: string | null = null;
    let country: string | null = null;
    if (ip) {
      try {
        const r = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(2500) });
        if (r.ok) {
          const g = await r.json();
          city = g.city ?? null;
          country = g.country_name ?? null;
        }
      } catch { /* geo is best-effort */ }
    }

    await supabase.from('hub_proposal_views').insert({
      proposal_id: proposal.id, ip, city, country, user_agent: userAgent,
    });

    // First open of a sent proposal: mark it viewed (keeps the existing badge
    // behaviour; the full log lives in hub_proposal_views).
    if (proposal.status === 'sent') {
      await supabase.from('hub_proposals')
        .update({ status: 'viewed', viewed_at: new Date().toISOString() })
        .eq('id', proposal.id).eq('status', 'sent');
    }

    return ok();
  } catch {
    return ok();
  }
});

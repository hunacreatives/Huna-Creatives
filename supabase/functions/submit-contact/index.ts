import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ackEmail, ackText, teamEmail } from './email.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const NOTIFY_EMAIL = 'contact@hunacreatives.com';
const FROM_EMAIL = 'Huna Creatives <noreply@hunacreatives.com>';
// The acknowledgement to the person who filled in the form comes from the inbox
// they can actually reply to.
const ACK_FROM = 'Huna Creatives <contact@hunacreatives.com>';
const REPLY_TO = 'contact@hunacreatives.com';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Where the lead came from (see src/lib/leadSource.ts). Public input, so only
// known keys survive, as short strings.
type Attribution = {
  referrer?: string; landing_page?: string; last_article?: string;
  utm?: Record<string, string>;
};

function cleanAttribution(raw: unknown): Attribution | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === 'string' && v ? v.slice(0, max) : undefined);
  const out: Attribution = {
    referrer: str(r.referrer, 500),
    landing_page: str(r.landing_page, 300),
    last_article: str(r.last_article, 200),
  };
  if (r.utm && typeof r.utm === 'object') {
    const utm: Record<string, string> = {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      const v = str((r.utm as Record<string, unknown>)[k], 200);
      if (v) utm[k] = v;
    }
    if (Object.keys(utm).length) out.utm = utm;
  }
  for (const k of Object.keys(out) as (keyof Attribution)[]) if (out[k] === undefined) delete out[k];
  return Object.keys(out).length ? out : null;
}

// Mirrors describeAttribution() in src/lib/leadSource.ts.
function describeAttribution(a: Attribution | null): string | null {
  if (!a || !a.landing_page) return null;
  let from = 'Direct';
  if (a.utm?.utm_source) from = a.utm.utm_source;
  else if (a.referrer) {
    try { from = new URL(a.referrer).host.replace(/^www\./, ''); } catch { from = a.referrer; }
  }
  const parts = [`${from} → ${a.landing_page}`];
  if (a.last_article && `/blog/${a.last_article}` !== a.landing_page) parts.push(`read /blog/${a.last_article}`);
  return parts.join(' · ');
}

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const body = await req.json();
    const { name, email, subject, service, message } = body;

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: cors });
    }

    const budget = typeof body.budget === 'string' && body.budget !== 'Not specified'
      ? body.budget.slice(0, 100) : null;
    const attribution = cleanAttribution(body.attribution);
    const sourceLine = describeAttribution(attribution);

    // The form is public, so it must not become a way to email any address
    // repeatedly: only the first submission from an address in 24 hours gets
    // an acknowledgement.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recent } = await supabase
      .from('contact_submissions')
      .select('id', { count: 'exact', head: true })
      .ilike('email', String(email).trim())
      .gte('created_at', since);

    // Save to DB
    const { error: dbError } = await supabase.from('contact_submissions').insert({
      name,
      email,
      subject: subject ?? '',
      service: service ?? null,
      message,
      budget,
      attribution,
    });

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), { status: 500, headers: cors });
    }

    // Send email notification via Resend
    const html = teamEmail({ name, email, service, subject, budget, sourceLine, message: String(message) });

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [NOTIFY_EMAIL],
        reply_to: email,
        subject: `New inquiry from ${name}${service ? ` — ${service}` : subject ? ` — ${subject}` : ''}`,
        html,
      }),
    });

    // Acknowledge the sender (first submission per address per 24 hours).
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
    if (validEmail && !recent) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: ACK_FROM,
          to: [String(email).trim()],
          reply_to: REPLY_TO,
          subject: 'We received your message',
          html: ackEmail(name, service ?? null, subject || null, String(message)),
          text: ackText(name, service ?? null, String(message)),
        }),
      }).catch((e) => console.error('acknowledgement email failed', e));
    }

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

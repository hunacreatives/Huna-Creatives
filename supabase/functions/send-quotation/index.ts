import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdmin, authErrorResponse, adminClient } from '../_shared/requireCaller.ts';
import { computeQuoteTotals, fmtMoney, QuoteRecord } from '../_shared/quotationTemplate.ts';
import { quotationEmail } from './email.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'Huna Creatives <contact@hunacreatives.com>';
const REPLY_TO = 'contact@hunacreatives.com';
const SITE = 'https://www.hunacreatives.com';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // Sends mail on our domain to an address chosen by the caller. Anyone with
    // the bundled anon key could otherwise send Huna-branded mail to anyone.
    await requireAdmin(req, adminClient());

    const { id, to_email, cc, intro } = await req.json();
    if (!id) {
      return new Response(JSON.stringify({ error: 'id is required' }), { status: 400, headers: cors });
    }

    // Read the quote server-side rather than trusting numbers from the client.
    const { data: quote, error: readErr } = await supabase
      .from('hub_proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (readErr || !quote) {
      return new Response(JSON.stringify({ error: 'Quotation not found' }), { status: 404, headers: cors });
    }

    const recipient = (to_email || quote.to_email || '').trim();
    if (!recipient) {
      return new Response(JSON.stringify({ error: 'No recipient email on this quotation' }), { status: 400, headers: cors });
    }

    // CC accepts a comma- or semicolon-separated list. Anything that is not a
    // plausible address is dropped rather than passed to Resend, which rejects
    // the whole send on one bad entry -- losing the quotation over a stray
    // comma is not a good trade. The recipient is filtered out so nobody is
    // both To and CC.
    const ccList = String(cc ?? '')
      .split(/[,;]/)
      .map((e: string) => e.trim())
      .filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      .filter((e: string) => e.toLowerCase() !== recipient.toLowerCase());
    const ccUnique = [...new Set(ccList.map((e: string) => e.toLowerCase()))].slice(0, 10);

    const q = quote as unknown as QuoteRecord;
    const isProposal = (quote as { doc_type?: string }).doc_type === 'proposal';
    const currency = q.currency === 'USD' ? 'USD' : 'PHP';
    const totals = computeQuoteTotals(q.line_items, q.discount, q.tax_rate);
    const title = q.project_title || `${isProposal ? 'Proposal' : 'Quotation'} for ${q.client_name}`;
    // A row can point at a hand-built page (e.g. /p/dobo) via custom_path.
    const customPath = String((quote as { custom_path?: string }).custom_path ?? '').trim();
    const quoteUrl = customPath
      ? `${SITE}${customPath.startsWith('/') ? '' : '/'}${customPath}`
      : `${SITE}/p/${q.slug}`;
    const acceptUrl = customPath ? `${quoteUrl}#approve` : `${quoteUrl}#accept`;

    const html = quotationEmail({ quote: q, isProposal, intro, quoteUrl, acceptUrl });

    const subject = isProposal
      ? `A proposal from Huna Creatives — ${title}`
      : `Quotation from Huna Creatives — ${title} · ${fmtMoney(totals.total, currency)}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipient],
        ...(ccUnique.length ? { cc: ccUnique } : {}),
        bcc: [REPLY_TO],
        reply_to: REPLY_TO,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: await res.text() }), { status: 500, headers: cors });
    }

    // Only flip status once the mail actually went out.
    await supabase
      .from('hub_proposals')
      .update({ status: 'sent', sent_at: new Date().toISOString(), to_email: recipient, cc_email: ccUnique.join(', ') || null })
      .eq('id', id);

    return new Response(JSON.stringify({ ok: true, sent_to: recipient, cc: ccUnique }), { headers: cors });
  } catch (err) {
    const authRes = authErrorResponse(err, cors);
    if (authRes) return authRes;
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const PAYMONGO_WEBHOOK_SECRET = Deno.env.get('PAYMONGO_WEBHOOK_SECRET') ?? '';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, paymongo-signature',
  'Content-Type': 'application/json',
};

/** Constant-time-ish compare so a wrong secret can't be probed byte by byte. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// PayMongo signs webhooks as `Paymongo-Signature: t=<timestamp>,te=<test-sig>,li=<live-sig>`
// (or `te=` only in test mode) — the signed payload is `${t}.${rawBody}`, HMAC-SHA256'd
// with the webhook's signing secret. https://developers.paymongo.com/docs/webhooks
async function verifySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!PAYMONGO_WEBHOOK_SECRET || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((kv) => {
      const [k, v] = kv.split('=');
      return [k?.trim(), v?.trim()];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.li ?? parts.te;
  if (!timestamp || !signature) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(PAYMONGO_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const computed = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');

  return safeEqual(computed, signature);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const rawBody = await req.text();
  const isValid = await verifySignature(rawBody, req.headers.get('paymongo-signature'));
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: cors });
  }

  try {
    const event = JSON.parse(rawBody);
    const eventType = event?.data?.attributes?.type;
    if (eventType !== 'link.payment.paid') {
      // Ack anything we don't act on so PayMongo doesn't keep retrying it.
      return new Response(JSON.stringify({ ok: true, ignored: eventType }), { headers: cors });
    }

    // NOTE: verify this path against a real PayMongo payload during the smoke
    // test — the nesting below is PayMongo's documented shape as of this
    // writing, but if link extraction fails the raw event is logged so it can
    // be corrected quickly rather than silently dropping paid webhooks.
    const paymongoLinkId: string | undefined = event?.data?.attributes?.data?.attributes?.data?.id
      ?? event?.data?.attributes?.data?.id;
    if (!paymongoLinkId) {
      console.error('Could not extract PayMongo link id from webhook payload:', rawBody);
      return new Response(JSON.stringify({ error: 'No link id in payload' }), { status: 200, headers: cors });
    }

    const { data: link, error } = await supabase
      .from('hub_invoice_payment_links')
      .select('id, project_id, invoice_number, client_name, project_name, to_email, amount_due, reference, status')
      .eq('paymongo_link_id', paymongoLinkId)
      .maybeSingle();

    if (error || !link) {
      return new Response(JSON.stringify({ error: 'No matching payment link' }), { status: 200, headers: cors });
    }

    // Idempotency: PayMongo retries webhook delivery, so a link already
    // marked paid must not be double-applied to the ledger.
    if (link.status === 'paid') {
      return new Response(JSON.stringify({ ok: true, already_processed: true }), { headers: cors });
    }

    const paidAt = new Date().toISOString();

    if (link.project_id) {
      await supabase.from('hub_project_payments').insert({
        project_id: link.project_id,
        amount: link.amount_due,
        paid_at: paidAt,
        notes: 'Paid via PayMongo QRPh (auto-confirmed)',
      });
    }

    let receiptSent = false;
    if (link.project_id) {
      const { data: project } = await supabase
        .from('hub_projects')
        .select('contract_price, contact_email, hub_project_payments(amount)')
        .eq('id', link.project_id)
        .single();

      if (project) {
        const totalPaid = (project.hub_project_payments ?? []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
        const to = link.to_email || project.contact_email;
        if (to) {
          await supabase.functions.invoke('send-payment-receipt', {
            body: {
              to,
              client_name: link.client_name,
              project_name: link.project_name,
              amount: link.amount_due,
              paid_at: paidAt,
              notes: 'Payment via PayMongo QRPh',
              total_paid: totalPaid,
              contract_price: project.contract_price,
              invoice_number: link.invoice_number,
              project_id: link.project_id,
            },
          });
          receiptSent = true;
        }
      }
    }

    await supabase
      .from('hub_invoice_payment_links')
      .update({ status: 'paid', paid_at: paidAt })
      .eq('id', link.id);

    // Settle the matching invoice log entry(ies) — same matching logic the
    // manual verifyProof() flow uses: invoice_number first, project_id fallback.
    let matchedInvoiceId: number | null = null;
    if (link.invoice_number) {
      const { data: m } = await supabase
        .from('hub_invoice_log').select('id')
        .eq('invoice_number', link.invoice_number)
        .maybeSingle();
      if (m) matchedInvoiceId = m.id;
    }
    if (!matchedInvoiceId && link.project_id) {
      const { data: m } = await supabase
        .from('hub_invoice_log').select('id')
        .eq('project_id', link.project_id)
        .eq('settled', false)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (m) matchedInvoiceId = m.id;
    }
    if (matchedInvoiceId) {
      await supabase.from('hub_invoice_log').update({ settled: true, settled_at: paidAt }).eq('id', matchedInvoiceId);
    }
    if (link.invoice_number && link.project_id) {
      await supabase.from('hub_invoice_log').update({ settled: true, settled_at: paidAt })
        .eq('invoice_number', link.invoice_number).eq('project_id', link.project_id).eq('settled', false);
    }

    await supabase.functions.invoke('notify-internal-request', {
      body: {
        type: 'payment_verified',
        contractor_name: link.client_name,
        detail: `${link.project_name} · ₱${link.amount_due.toLocaleString('en-PH', { minimumFractionDigits: 2 })} via PayMongo QRPh`,
        notes: receiptSent ? 'Receipt email sent to client. Auto-confirmed via PayMongo webhook.' : 'No client email — receipt not sent. Auto-confirmed via PayMongo webhook.',
      },
    }).catch(() => {});

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 200, headers: cors });
  }
});

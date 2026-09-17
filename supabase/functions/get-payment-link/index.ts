import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const PAYMONGO_SECRET_KEY = Deno.env.get('PAYMONGO_SECRET_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Creates the PayMongo QRPh checkout link on first request for a given
// invoice, then reuses it on every later request — avoids minting a new
// PayMongo link per page load/refresh.
async function ensurePaymongoLink(link: {
  id: string; invoice_number: string; project_name: string; reference: string | null; amount_due: number;
}): Promise<{ checkout_url: string } | null> {
  if (!PAYMONGO_SECRET_KEY) return null;

  try {
    const res = await fetch('https://api.paymongo.com/v1/links', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${PAYMONGO_SECRET_KEY}:`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(link.amount_due * 100),
            description: `Invoice #${link.invoice_number} — ${link.project_name}`,
            remarks: link.reference || link.invoice_number,
          },
        },
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      console.error('PayMongo link creation failed:', body);
      return null;
    }

    const paymongoLinkId: string = body.data.id;
    const checkoutUrl: string = body.data.attributes.checkout_url;

    await supabase
      .from('hub_invoice_payment_links')
      .update({ provider: 'paymongo', paymongo_link_id: paymongoLinkId, paymongo_checkout_url: checkoutUrl })
      .eq('id', link.id);

    return { checkout_url: checkoutUrl };
  } catch (err) {
    console.error('PayMongo link creation error:', err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing token' }), { status: 200, headers: cors });
    }

    const { data: link, error } = await supabase
      .from('hub_invoice_payment_links')
      .select('id, token, client_name, project_name, invoice_number, to_email, amount_due, due_date, line_items, payment_terms, reference, status, submitted_at, provider, paymongo_checkout_url, paid_at')
      .eq('token', token)
      .single();

    if (error || !link) {
      return new Response(JSON.stringify({ error: 'Payment link not found' }), { status: 200, headers: cors });
    }

    if (link.status === 'open' && !link.paymongo_checkout_url) {
      const created = await ensurePaymongoLink(link);
      if (created) link.paymongo_checkout_url = created.checkout_url;
    }

    return new Response(JSON.stringify({ ok: true, link }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 200, headers: cors });
  }
});

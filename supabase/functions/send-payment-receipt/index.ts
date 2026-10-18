import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { receiptEmail } from './email.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'Huna Creatives Billing <billing@hunacreatives.com>';
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const fmt = (n: number) =>
  '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Stored receipt URLs are Drive "view" page links (https://drive.google.com/file/d/{id}/view),
// not direct image URLs — convert to the thumbnail API for use in <img src>.
// Mirrors src/pages/hub/utils/drive.ts's getDriveThumbnailUrl — keep in sync.
function getDriveThumbnailUrl(url: string | null | undefined, size = 600) {
  if (!url) return url ?? '';
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (!match) return url;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w${size}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const {
      to,
      cc,
      client_name,
      project_name,
      amount,
      paid_at,
      notes,
      receipt_url,
      total_paid,
      contract_price,
      invoice_number,
      project_id,
    } = await req.json();

    if (!to || !client_name || !project_name || !amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 200, headers: cors });
    }

    const balance = contract_price - total_paid;
    const isPaid = balance <= 0;
    const dateStr = new Date(paid_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const invNum = String(invoice_number ?? '').padStart(4, '0');

    const html = receiptEmail({
      clientName: client_name, projectName: project_name, amount: fmt(amount), date: dateStr,
      ref: invoice_number != null && invoice_number !== '' ? invNum : null, notes,
      totalPaid: fmt(total_paid), balance: fmt(balance), isPaid,
      receiptUrl: receipt_url, receiptThumb: receipt_url ? getDriveThumbnailUrl(receipt_url) : null,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        // Only contact@ is a real mailbox; replies to the sender address would bounce.
        reply_to: 'contact@hunacreatives.com',
        to: [to],
        ...(cc ? { cc: [cc] } : {}),
        subject: `Payment Received — ${project_name}`,
        html,
      }),
    });

    const resBody = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: resBody?.message ?? 'Failed to send' }), { status: 200, headers: cors });
    }

    await supabase.from('hub_payment_receipt_log').insert({
      project_id: project_id ?? null,
      client_name,
      project_name,
      payment_amount: amount,
      paid_at,
      sent_to: to,
      total_paid,
      balance,
      receipt_url: receipt_url ?? null,
    });

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 200, headers: cors });
  }
});

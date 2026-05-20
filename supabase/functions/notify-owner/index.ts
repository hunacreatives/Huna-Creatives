import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OWNER_EMAIL = 'francisfielroble@gmail.com';
const FROM_EMAIL = 'payroll@hunacreatives.com';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

async function sendNotification(batch_id: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: batch, error } = await supabase
    .from('hub_payroll_batches')
    .select('*, hub_users!requested_by(full_name)')
    .eq('id', batch_id)
    .single();

  if (error || !batch) { console.error('batch not found:', error); return; }

  const requestedBy = (batch as any).hub_users?.full_name ?? 'HR Admin';
  const total = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(batch.total_amount);
  const approveUrl = 'https://hunacreatives.com/hub/admin/payroll';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <div style="background:#111827;padding:24px 32px;">
      <p style="color:#FF6B35;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 6px;">Huna Creatives</p>
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;">Fund Transfer Request</h1>
      <p style="color:#6b7280;font-size:13px;margin:6px 0 0;">Your approval is needed</p>
    </div>

    <div style="padding:28px 32px;">
      <p style="font-size:14px;color:#374151;margin:0 0 20px;">
        <strong>${requestedBy}</strong> has submitted a fund transfer request for payroll period <strong>${batch.period_label}</strong> and is awaiting your approval.
      </p>

      <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;">
            <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Pay Period</p>
            <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#111827;">${batch.period_label}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;">
            <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Contractors</p>
            <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#111827;">${batch.contractor_count} contractor${batch.contractor_count !== 1 ? 's' : ''}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 16px;">
            <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Total Amount</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:800;color:#FF6B35;">${total}</p>
          </td>
        </tr>
      </table>

      <div style="margin-top:24px;text-align:center;">
        <a href="${approveUrl}" style="display:inline-block;background:#111827;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">
          Review &amp; Approve →
        </a>
      </div>

      <p style="font-size:12px;color:#9ca3af;margin:20px 0 0;text-align:center;">
        Log in to Huna Hub → Payroll to approve or reject this transfer.
      </p>
    </div>

    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;">
      <p style="font-size:11px;color:#d1d5db;margin:0;text-align:center;">© ${new Date().getFullYear()} Huna Creatives · payroll@hunacreatives.com</p>
    </div>

  </div>
</body>
</html>`;

  console.log('Sending owner notification for batch:', batch_id);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Huna Creatives Payroll <${FROM_EMAIL}>`,
      to: OWNER_EMAIL,
      subject: `Action Required: Fund Transfer ${batch.period_label} — ${total}`,
      html,
    }),
  });

  const result = await res.json();
  if (!res.ok) {
    console.error('Resend error:', JSON.stringify(result));
  } else {
    console.log('Owner notification sent:', result.id);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { batch_id } = await req.json();
    if (!batch_id) return new Response(JSON.stringify({ error: 'batch_id required' }), { status: 400, headers: cors });

    // @ts-ignore
    EdgeRuntime.waitUntil(sendNotification(String(batch_id)));

    return new Response(JSON.stringify({ ok: true, queued: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

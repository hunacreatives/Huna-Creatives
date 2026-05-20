import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL = 'payroll@hunacreatives.com';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function fmt(val: number, currency = 'PHP') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(val);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { payout_id } = await req.json();
    if (!payout_id) return new Response(JSON.stringify({ error: 'payout_id required' }), { status: 400, headers: cors });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch payout + contractor
    const { data: payout } = await supabase
      .from('hub_payouts')
      .select('*, hub_users!contractor_id(id, full_name, email, payment_type, hourly_rate, monthly_rate, department, currency)')
      .eq('id', payout_id)
      .single();

    if (!payout) return new Response(JSON.stringify({ error: 'payout not found' }), { status: 404, headers: cors });

    const contractor = payout.hub_users;
    if (!contractor?.email) return new Response(JSON.stringify({ error: 'contractor has no email' }), { status: 400, headers: cors });

    // Fetch daily hours for this period
    const { data: dailyHours } = await supabase
      .from('hub_daily_hours')
      .select('date, hours_capped, overtime_hours')
      .eq('user_id', contractor.id)
      .gte('date', payout.cutoff_start)
      .lte('date', payout.cutoff_end)
      .order('date');

    const totalHours = (dailyHours || []).reduce((s: number, d: any) => s + (d.hours_capped || 0), 0);
    const totalOT = (dailyHours || []).reduce((s: number, d: any) => s + (d.overtime_hours || 0), 0);
    const daysWorked = (dailyHours || []).length;

    const isFixed = contractor.payment_type === 'fixed';
    const isUSD = contractor.currency === 'USD';

    const adjustments: { label: string; amount: number; type: string }[] = payout.adjustments || [];
    const adjTotal = adjustments.reduce((s: number, a: any) => s + (a.amount || 0), 0);
    const basePay = payout.final_payout - adjTotal;

    // Period label (e.g. "May 16–31, 2026")
    const periodStart = new Date(payout.cutoff_start);
    const periodEnd = new Date(payout.cutoff_end);
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const periodLabel = periodStart.getMonth() === periodEnd.getMonth()
      ? `${months[periodStart.getMonth()]} ${periodStart.getDate()}–${periodEnd.getDate()}, ${periodStart.getFullYear()}`
      : `${months[periodStart.getMonth()]} ${periodStart.getDate()} – ${months[periodEnd.getMonth()]} ${periodEnd.getDate()}, ${periodStart.getFullYear()}`;

    const rateLabel = isFixed
      ? `${fmt(contractor.monthly_rate || 0)}/month`
      : isUSD
        ? `$${contractor.hourly_rate}/hr USD`
        : `${fmt(contractor.hourly_rate || 0)}/hr`;

    const adjRows = adjustments.map((a: any) => `
      <tr>
        <td style="padding:8px 16px;color:#6b7280;font-size:13px;">${a.label}</td>
        <td style="padding:8px 16px;text-align:right;font-size:13px;color:${a.amount >= 0 ? '#059669' : '#ef4444'};">
          ${a.amount > 0 ? '+' : ''}${fmt(a.amount)}
        </td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background:#111827;padding:24px 32px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <p style="color:#FF6B35;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 4px;">Huna Creatives</p>
        <h1 style="color:#fff;font-size:20px;font-weight:700;margin:0;">Payslip</h1>
      </div>
      <div style="text-align:right;">
        <p style="color:#9ca3af;font-size:12px;margin:0 0 4px;">Period</p>
        <p style="color:#fff;font-size:13px;font-weight:600;margin:0;">${periodLabel}</p>
      </div>
    </div>

    <!-- Contractor info -->
    <div style="padding:24px 32px;border-bottom:1px solid #f3f4f6;">
      <p style="font-size:18px;font-weight:700;color:#111827;margin:0 0 4px;">${contractor.full_name}</p>
      <p style="font-size:13px;color:#6b7280;margin:0;">${contractor.department || ''} · ${isFixed ? 'Fixed Rate' : isUSD ? 'Hourly (USD)' : 'Hourly'} · ${rateLabel}</p>
    </div>

    <!-- Hours summary -->
    <div style="padding:20px 32px;display:flex;gap:24px;border-bottom:1px solid #f3f4f6;">
      <div>
        <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">Days Worked</p>
        <p style="font-size:20px;font-weight:700;color:#111827;margin:0;">${daysWorked}</p>
      </div>
      <div>
        <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">Hours Billed</p>
        <p style="font-size:20px;font-weight:700;color:#111827;margin:0;">${totalHours.toFixed(2)}h</p>
      </div>
      ${totalOT > 0 ? `<div>
        <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">Overtime</p>
        <p style="font-size:20px;font-weight:700;color:#7c3aed;margin:0;">+${totalOT.toFixed(2)}h</p>
      </div>` : ''}
    </div>

    <!-- Pay breakdown -->
    <div style="padding:20px 32px;border-bottom:1px solid #f3f4f6;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 16px;color:#374151;font-size:13px;">Base Pay</td>
          <td style="padding:8px 16px;text-align:right;font-size:13px;font-weight:600;color:#111827;">${fmt(basePay)}</td>
        </tr>
        ${adjRows}
        <tr style="border-top:2px solid #111827;">
          <td style="padding:12px 16px;font-size:15px;font-weight:700;color:#111827;">Total Payout</td>
          <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:800;color:#FF6B35;">${fmt(payout.final_payout)}</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;background:#f9fafb;">
      <p style="font-size:12px;color:#6b7280;margin:0;">
        This is your official payslip from Huna Creatives for the period <strong>${periodLabel}</strong>.
        Payment has been sent to your account. If you have any questions, please message HR on Slack.
      </p>
    </div>
  </div>
</body>
</html>`;

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: contractor.email,
        subject: `Payslip — ${periodLabel} | Huna Creatives`,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: result }), { status: 500, headers: cors });

    return new Response(JSON.stringify({ ok: true, email_id: result.id }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

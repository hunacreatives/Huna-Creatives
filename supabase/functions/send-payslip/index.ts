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

function pad(n: number) { return String(n).padStart(2, '0'); }

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

    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const shortMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const periodStart = new Date(payout.cutoff_start);
    const periodEnd = new Date(payout.cutoff_end);
    const periodLabel = periodStart.getMonth() === periodEnd.getMonth()
      ? `${months[periodStart.getMonth()]} ${periodStart.getDate()}–${periodEnd.getDate()}, ${periodStart.getFullYear()}`
      : `${months[periodStart.getMonth()]} ${periodStart.getDate()} – ${months[periodEnd.getMonth()]} ${periodEnd.getDate()}, ${periodStart.getFullYear()}`;

    const issuedDate = new Date(payout.paid_at || new Date());
    const issuedLabel = `${shortMonths[issuedDate.getMonth()]} ${issuedDate.getDate()}, ${issuedDate.getFullYear()}`;

    // Invoice number: INV-YYYYMMDD-XXXX (last 4 of payout id)
    const invoiceNo = `INV-${payout.cutoff_start.replace(/-/g,'').slice(0,8)}-${payout_id.slice(-4).toUpperCase()}`;

    const rateLabel = isFixed
      ? `₱${(contractor.monthly_rate || 0).toLocaleString()}/month`
      : isUSD
        ? `$${contractor.hourly_rate}/hr (USD)`
        : `₱${(contractor.hourly_rate || 0).toLocaleString()}/hr`;

    const contractType = isFixed ? 'Fixed Rate' : isUSD ? 'Hourly — USD' : 'Hourly';

    // Base pay description
    let basePayDesc = '';
    if (isFixed) {
      basePayDesc = `Semi-monthly fixed rate (${periodLabel})`;
    } else {
      basePayDesc = `${totalHours.toFixed(2)} hours × ${rateLabel}`;
    }

    const adjRows = adjustments.map((a: any) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0;font-size:13px;color:#374151;">${a.label}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;text-transform:capitalize;">${a.type || 'adjustment'}</p>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;font-weight:600;color:${a.amount >= 0 ? '#059669' : '#ef4444'};">
          ${a.amount > 0 ? '+' : ''}${fmt(a.amount)}
        </td>
      </tr>`).join('');

    const otRow = totalOT > 0 ? `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0;font-size:13px;color:#374151;">Overtime Pay</p>
          <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;">${totalOT.toFixed(2)} hours overtime</p>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;font-weight:600;color:#7c3aed;">
          ${fmt(payout.final_payout - basePay - adjTotal)}
        </td>
      </tr>` : '';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#111827;padding:28px 36px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <p style="color:#FF6B35;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 6px;">Huna Creatives</p>
          <h1 style="color:#fff;font-size:26px;font-weight:800;margin:0;letter-spacing:-0.5px;">Payment Receipt</h1>
          <p style="color:#6b7280;font-size:13px;margin:6px 0 0;">Pay Period: <span style="color:#d1d5db;font-weight:600;">${periodLabel}</span></p>
        </div>
        <div style="text-align:right;">
          <p style="color:#6b7280;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em;">Invoice No.</p>
          <p style="color:#fff;font-size:13px;font-weight:700;margin:0;">${invoiceNo}</p>
          <p style="color:#6b7280;font-size:11px;margin:8px 0 2px;">Issued</p>
          <p style="color:#d1d5db;font-size:12px;margin:0;">${issuedLabel}</p>
        </div>
      </div>
    </div>

    <!-- Status banner -->
    <div style="background:#ecfdf5;padding:12px 36px;border-bottom:1px solid #d1fae5;display:flex;align-items:center;gap:10px;">
      <span style="display:inline-block;width:8px;height:8px;background:#10b981;border-radius:50%;flex-shrink:0;"></span>
      <p style="margin:0;font-size:13px;color:#065f46;font-weight:600;">Payment sent — this is your official payslip for the period above.</p>
    </div>

    <!-- Contractor details -->
    <div style="padding:28px 36px;border-bottom:1px solid #f3f4f6;">
      <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">Issued To</p>
      <p style="font-size:20px;font-weight:700;color:#111827;margin:0 0 4px;">${contractor.full_name}</p>
      <p style="font-size:13px;color:#6b7280;margin:0 0 2px;">${contractor.department || 'Huna Creatives'}</p>
      <p style="font-size:13px;color:#6b7280;margin:0;">${contractType} · ${rateLabel}</p>
    </div>

    <!-- Attendance summary -->
    <div style="padding:24px 36px;background:#fafafa;border-bottom:1px solid #f3f4f6;">
      <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">Attendance Summary</p>
      <div style="display:flex;gap:32px;">
        <div>
          <p style="font-size:11px;color:#9ca3af;margin:0 0 4px;">Days Worked</p>
          <p style="font-size:22px;font-weight:800;color:#111827;margin:0;">${daysWorked}</p>
          <p style="font-size:11px;color:#9ca3af;margin:2px 0 0;">days</p>
        </div>
        <div>
          <p style="font-size:11px;color:#9ca3af;margin:0 0 4px;">Hours Billed</p>
          <p style="font-size:22px;font-weight:800;color:#111827;margin:0;">${totalHours.toFixed(2)}</p>
          <p style="font-size:11px;color:#9ca3af;margin:2px 0 0;">hours</p>
        </div>
        ${totalOT > 0 ? `<div>
          <p style="font-size:11px;color:#9ca3af;margin:0 0 4px;">Overtime</p>
          <p style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">+${totalOT.toFixed(2)}</p>
          <p style="font-size:11px;color:#9ca3af;margin:2px 0 0;">hours</p>
        </div>` : ''}
      </div>
    </div>

    <!-- Pay breakdown -->
    <div style="padding:28px 36px;border-bottom:1px solid #f3f4f6;">
      <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">Earnings Breakdown</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
            <p style="margin:0;font-size:13px;color:#374151;">Base Pay</p>
            <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;">${basePayDesc}</p>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;font-weight:600;color:#111827;">${fmt(basePay)}</td>
        </tr>
        ${otRow}
        ${adjRows}
        <tr>
          <td style="padding:16px 0 4px;" colspan="2">
            <div style="background:#111827;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Total Payout</p>
                <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">${periodLabel}</p>
              </div>
              <p style="margin:0;font-size:24px;font-weight:800;color:#FF6B35;">${fmt(payout.final_payout)}</p>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:24px 36px;">
      <p style="font-size:12px;color:#9ca3af;margin:0 0 8px;line-height:1.6;">
        This is an automatically generated payslip for the pay period <strong style="color:#6b7280;">${periodLabel}</strong>.
        Please keep this for your records. If you notice any discrepancies, reach out to HR on Slack immediately.
      </p>
      <p style="font-size:11px;color:#d1d5db;margin:0;">© ${new Date().getFullYear()} Huna Creatives · payroll@hunacreatives.com</p>
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
        from: `Huna Creatives Payroll <${FROM_EMAIL}>`,
        to: contractor.email,
        subject: `Payment Receipt — ${periodLabel} | ${fmt(payout.final_payout)} | Huna Creatives`,
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

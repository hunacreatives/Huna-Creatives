import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hasPush } from '../_shared/push.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL = 'payroll@hunacreatives.com';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function fmt(val: number, currency = 'PHP') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(val);
}

// Same Chromium-backed rendering as send-hr-certificate — Google Docs' HTML
// importer can't handle the payslip template's modern CSS.
async function htmlToPdf(html: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get('PDFSHIFT_API_KEY');
  if (!apiKey) throw new Error('PDFSHIFT_API_KEY secret is not set');
  const res = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source: html, use_print: true }),
  });
  if (!res.ok) throw new Error(`PDFShift conversion failed: ${res.status} ${await res.text()}`);
  return new Uint8Array(await res.arrayBuffer());
}

// first_on/last_off are stored as UTC instants; render them in PH time like
// the browser does for Manila-based users on the payouts page.
function fmtTimePH(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });
}

function fmtDateShort(dateStr: string) {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

interface PayslipDay {
  date: string;
  hours_raw: number;
  hours_capped: number;
  overtime_hours: number;
  first_on: string | null;
  last_off: string | null;
}

// Server-side port of generatePayslipHTML from src/pages/hub/contractor/payouts/page.tsx
// (the document behind that page's "Download Payslip" button) — keep the two in sync.
function generatePayslipHTML(opts: {
  name: string;
  department: string | null;
  period: { label: string; start: string; end: string };
  days: PayslipDay[];
  paymentType: string;
  hourlyRate: number;
  monthlyRate: number;
  totalDaysWorked: number;
  totalHoursRaw: number;
  totalHoursBillable: number;
  totalOvertime: number;
  basePay: number;
  overtimePay: number;
  adjustments: number;
  totalPay: number;
  generatedDate: string;
  documentNo: string;
  logoUrl: string;
}) {
  // All amounts arrive already converted to PHP — no currency conversion here.
  const { name, department, period, days, paymentType, hourlyRate, monthlyRate,
    totalDaysWorked, totalHoursRaw, totalHoursBillable, totalOvertime,
    basePay, overtimePay, adjustments, totalPay, generatedDate, documentNo, logoUrl } = opts;

  const fmtPHP = (val: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  const rateDisplay = paymentType === 'fixed'
    ? `${fmtPHP(monthlyRate)} / month (bi-monthly disbursement of ${fmtPHP(monthlyRate / 2)})`
    : `₱${hourlyRate.toFixed(2)} per hour`;

  const dayRows = days.map(d => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#374151;">${fmtDateShort(d.date)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#374151;text-align:center;">${fmtTimePH(d.first_on)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#374151;text-align:center;">${fmtTimePH(d.last_off)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#6b7280;text-align:center;">${d.hours_raw.toFixed(2)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#111827;text-align:center;">${d.hours_capped.toFixed(2)}</td>
      ${d.overtime_hours > 0
        ? `<td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#7c3aed;font-weight:600;text-align:center;">+${d.overtime_hours}</td>`
        : `<td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#d1d5db;text-align:center;">—</td>`}
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payslip – ${name} – ${period.label}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111827; background: #fff; padding: 48px; font-size: 13px; line-height: 1.5; }
    @media print {
      body { padding: 24px; }
      .no-print { display: none !important; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>

  <!-- Letterhead -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #FF6B35;margin-bottom:28px;">
    <div style="display:flex;align-items:center;gap:14px;">
      <img src="${logoUrl}" alt="Huna Creatives" style="height:44px;width:auto;object-fit:contain;" />
      <div>
        <div style="font-size:18px;font-weight:800;color:#111827;letter-spacing:-0.3px;">Huna Creatives</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:1px;">Cebu, Philippines · hunacreatives.com</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:22px;font-weight:800;color:#FF6B35;letter-spacing:3px;">PAYSLIP</div>
      <div style="font-size:11px;color:#9ca3af;margin-top:4px;">Document No. ${documentNo}</div>
      <div style="font-size:11px;color:#9ca3af;">Issued: ${generatedDate}</div>
    </div>
  </div>

  <!-- Certification statement -->
  <div style="background:#f9fafb;border-left:3px solid #FF6B35;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:28px;">
    <p style="font-size:12px;color:#374151;line-height:1.7;">
      <strong>To Whom It May Concern:</strong><br>
      This is to certify that <strong>${name}</strong>${department ? `, assigned to the <strong>${department}</strong> department,` : ''} is an active independent contractor of <strong>Huna Creatives</strong>, a creative agency based in Cebu, Philippines. This document serves as an official record of compensation rendered for the pay period indicated below, and may be used for financial, banking, or institutional purposes.
    </p>
  </div>

  <!-- Employee + Period info -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-bottom:28px;">
    <div>
      <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;font-weight:600;">Employee</div>
      <div style="font-size:15px;font-weight:700;color:#111827;">${name}</div>
      ${department ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${department}</div>` : ''}
      <div style="font-size:11px;color:#9ca3af;margin-top:2px;">Independent Contractor</div>
    </div>
    <div>
      <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;font-weight:600;">Pay Period</div>
      <div style="font-size:14px;font-weight:700;color:#111827;">${period.label}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:2px;">${period.start} to ${period.end}</div>
    </div>
    <div>
      <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;font-weight:600;">Compensation Basis</div>
      <div style="font-size:13px;font-weight:600;color:#111827;">${paymentType === 'fixed' ? 'Fixed Monthly Rate' : 'Hourly Rate'}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:2px;">${rateDisplay}</div>
    </div>
  </div>

  <!-- Summary stats -->
  <div style="display:grid;grid-template-columns:repeat(${totalOvertime > 0 ? 4 : 3},1fr);gap:10px;margin-bottom:28px;">
    <div style="background:#f3f4f6;border-radius:10px;padding:14px;text-align:center;">
      <div style="font-size:24px;font-weight:800;color:#111827;">${totalDaysWorked}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px;">Days Worked</div>
    </div>
    <div style="background:#f3f4f6;border-radius:10px;padding:14px;text-align:center;">
      <div style="font-size:24px;font-weight:800;color:#111827;">${totalHoursRaw.toFixed(1)}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px;">Total Hours Logged</div>
    </div>
    <div style="background:#e0f2fe;border-radius:10px;padding:14px;text-align:center;">
      <div style="font-size:24px;font-weight:800;color:#0369a1;">${totalHoursBillable.toFixed(1)}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px;">Billable Hours</div>
    </div>
    ${totalOvertime > 0 ? `
    <div style="background:#ede9fe;border-radius:10px;padding:14px;text-align:center;">
      <div style="font-size:24px;font-weight:800;color:#7c3aed;">+${totalOvertime}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px;">Overtime Hours</div>
    </div>` : ''}
  </div>

  <!-- Attendance table -->
  <div style="margin-bottom:28px;">
    <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">Attendance Record</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:9px 10px;text-align:left;font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Date</th>
          <th style="padding:9px 10px;text-align:center;font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Time In</th>
          <th style="padding:9px 10px;text-align:center;font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Time Out</th>
          <th style="padding:9px 10px;text-align:center;font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Raw Hrs</th>
          <th style="padding:9px 10px;text-align:center;font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Billable Hrs</th>
          <th style="padding:9px 10px;text-align:center;font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Overtime</th>
        </tr>
      </thead>
      <tbody>
        ${days.length > 0 ? dayRows : `<tr><td colspan="6" style="padding:20px;text-align:center;color:#9ca3af;font-style:italic;">No attendance records for this period.</td></tr>`}
      </tbody>
    </table>
  </div>

  <!-- Earnings breakdown -->
  <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:28px;">
    <div style="background:#f9fafb;padding:11px 16px;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid #e5e7eb;">Compensation Breakdown</div>
    <table style="width:100%;border-collapse:collapse;">
      <tbody>
        ${paymentType === 'fixed' ? `
        <tr>
          <td style="padding:11px 16px;color:#374151;border-bottom:1px solid #f3f4f6;">Fixed Service Fee &nbsp;<span style="color:#9ca3af;font-size:11px;">(${fmtPHP(monthlyRate)}/mo ÷ 2 periods)</span></td>
          <td style="padding:11px 16px;text-align:right;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${fmtPHP(basePay)}</td>
        </tr>` : `
        <tr>
          <td style="padding:11px 16px;color:#374151;border-bottom:1px solid #f3f4f6;">Base Pay &nbsp;<span style="color:#9ca3af;font-size:11px;">(${totalHoursBillable.toFixed(2)} billable hrs × ₱${hourlyRate}/hr)</span></td>
          <td style="padding:11px 16px;text-align:right;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${fmtPHP(basePay)}</td>
        </tr>`}
        ${totalOvertime > 0 ? `
        <tr>
          <td style="padding:11px 16px;color:#7c3aed;border-bottom:1px solid #f3f4f6;">Overtime Compensation &nbsp;<span style="color:#9ca3af;font-size:11px;">(${totalOvertime} hrs × ₱${hourlyRate}/hr)</span></td>
          <td style="padding:11px 16px;text-align:right;font-weight:600;color:#7c3aed;border-bottom:1px solid #f3f4f6;">+ ${fmtPHP(overtimePay)}</td>
        </tr>` : ''}
        ${adjustments !== 0 ? `
        <tr>
          <td style="padding:11px 16px;color:${adjustments > 0 ? '#047857' : '#e11d48'};border-bottom:1px solid #f3f4f6;">HR Adjustments</td>
          <td style="padding:11px 16px;text-align:right;font-weight:600;color:${adjustments > 0 ? '#047857' : '#e11d48'};border-bottom:1px solid #f3f4f6;">${adjustments > 0 ? '+ ' : ''}${fmtPHP(adjustments)}</td>
        </tr>` : ''}
        <tr style="background:#fff7f4;">
          <td style="padding:16px;font-weight:800;font-size:15px;color:#111827;">
            TOTAL COMPENSATION
            <div style="font-size:11px;font-weight:400;color:#9ca3af;margin-top:2px;">For the period ${period.label}</div>
          </td>
          <td style="padding:16px;text-align:right;font-weight:900;font-size:22px;color:#FF6B35;">${fmtPHP(totalPay)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Signature block -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:32px;margin-top:16px;">
    <div>
      <div style="border-top:1.5px solid #374151;padding-top:8px;margin-top:48px;">
        <div style="font-size:12px;font-weight:700;color:#111827;">Francis Fiel Roble</div>
        <div style="font-size:11px;color:#6b7280;">Owner, Huna Creatives</div>
        <div style="font-size:11px;color:#6b7280;">Date: ${generatedDate}</div>
      </div>
    </div>
    <div>
      <div style="border-top:1.5px solid #d1d5db;padding-top:8px;margin-top:48px;">
        <div style="font-size:12px;font-weight:700;color:#111827;">${name}</div>
        <div style="font-size:11px;color:#6b7280;">Independent Contractor</div>
        <div style="font-size:11px;color:#6b7280;">Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #f0f0f0;padding-top:16px;display:flex;justify-content:space-between;align-items:flex-start;">
    <div style="font-size:10px;color:#9ca3af;max-width:420px;line-height:1.7;">
      This document is an officially issued payslip by Huna Creatives. Attendance and hours are recorded via the company's internal time-tracking system. This payslip may be presented to banks, government agencies, or other institutions as proof of income.
      <br>For verification, contact us at <strong>hunacreatives.com</strong>.
    </div>
    <div style="text-align:right;">
      <img src="${logoUrl}" alt="Huna Creatives" style="height:28px;width:auto;opacity:0.3;" />
    </div>
  </div>

</body>
</html>`;
}

async function sendPayslip(payout_id: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: payout, error: payoutErr } = await supabase
    .from('hub_payouts')
    .select('*')
    .eq('id', payout_id)
    .single();

  if (payoutErr || !payout) { console.error('payout not found:', payoutErr); return; }

  const { data: contractor, error: contractorErr } = await supabase
    .from('hub_users')
    .select('id, full_name, email, payment_type, hourly_rate, monthly_rate, department, currency, slack_id')
    .eq('id', payout.contractor_id)
    .single();

  if (contractorErr || !contractor) { console.error('contractor not found:', contractorErr); return; }
  if (!contractor.email) { console.error('contractor has no email:', contractor.id); return; }

  console.log('Sending payslip to:', contractor.email, 'payout:', payout_id);

  const { data: dailyHours } = await supabase
    .from('hub_daily_hours')
    .select('date, hours_raw, hours_capped, overtime_hours, first_on, last_off')
    .eq('user_id', contractor.id)
    .gte('date', payout.cutoff_start)
    .lte('date', payout.cutoff_end)
    .order('date');

  const totalHours = (dailyHours || []).reduce((s: number, d: any) => s + (d.hours_capped || 0), 0);
  const totalHoursRaw = (dailyHours || []).reduce((s: number, d: any) => s + (d.hours_raw || 0), 0);
  const totalOT = (dailyHours || []).reduce((s: number, d: any) => s + (d.overtime_hours || 0), 0);
  const daysWorked = (dailyHours || []).length;

  const isFixed = contractor.payment_type === 'fixed';
  const isUSD = contractor.currency === 'USD';

  const adjustments: { label: string; amount: number; type: string }[] = payout.adjustments || [];
  const adjTotal = adjustments.reduce((s: number, a: any) => s + (a.amount || 0), 0);
  const otPay = payout.overtime_pay ?? 0;
  const basePay = payout.final_payout - adjTotal - otPay;

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const shortMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const periodStart = new Date(payout.cutoff_start);
  const periodEnd = new Date(payout.cutoff_end);
  const calendarEndDay = periodStart.getDate() >= 16
    ? new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 0).getDate()
    : periodEnd.getDate();
  const periodLabel = periodStart.getMonth() === periodEnd.getMonth()
    ? `${months[periodStart.getMonth()]} ${periodStart.getDate()}–${calendarEndDay}, ${periodStart.getFullYear()}`
    : `${months[periodStart.getMonth()]} ${periodStart.getDate()} – ${months[periodEnd.getMonth()]} ${calendarEndDay}, ${periodStart.getFullYear()}`;

  const issuedDate = new Date(payout.payment_date || payout.approved_at || new Date());
  const issuedLabel = `${shortMonths[issuedDate.getMonth()]} ${issuedDate.getDate()}, ${issuedDate.getFullYear()}`;

  const invoiceNo = `INV-${(payout.cutoff_start || '').replace(/-/g,'').slice(0,8)}-${String(payout_id).slice(-4).toUpperCase()}`;

  const rateLabel = isFixed
    ? `₱${(contractor.monthly_rate || 0).toLocaleString()}/month`
    : isUSD
      ? `$${contractor.hourly_rate}/hr (USD)`
      : `₱${(contractor.hourly_rate || 0).toLocaleString()}/hr`;

  const contractType = isFixed ? 'Fixed Rate' : isUSD ? 'Hourly — USD' : 'Hourly';

  const basePayDesc = isFixed
    ? `Semi-monthly fixed rate (${periodLabel})`
    : `${totalHours.toFixed(2)} hours × ${rateLabel}`;

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

  // Attach the official payslip document (same template as the payouts page's
  // "Download Payslip" button) rendered to PDF via PDFShift. A PDF failure must
  // not block the payment receipt — it degrades to sending without attachment.
  let attachments: { filename: string; content: string }[] = [];
  try {
    const usdRate = isUSD
      ? parseFloat((await supabase.from('hub_settings').select('value').eq('key', 'usd_rate').single()).data?.value || '56')
      : 1;
    const toPhp = (val: number) => isUSD ? val * usdRate : val;

    const phpHourlyRate = toPhp(Number(payout.hourly_rate ?? contractor.hourly_rate ?? 0));
    const phpMonthlyRate = toPhp(Number(contractor.monthly_rate ?? 0));
    // Mirror the payouts page: if HR set overtime pay but no OT rows exist,
    // derive the display hours from the pay so the payslip still adds up.
    const otRate = phpHourlyRate > 0 ? phpHourlyRate : phpMonthlyRate / 176;
    const displayOT = totalOT > 0 ? totalOT : (otPay > 0 && otRate > 0 ? parseFloat((otPay / otRate).toFixed(2)) : 0);

    const payslipHtml = generatePayslipHTML({
      name: contractor.full_name,
      department: contractor.department || null,
      period: { label: periodLabel, start: payout.cutoff_start, end: payout.cutoff_end },
      days: (dailyHours || []) as PayslipDay[],
      paymentType: contractor.payment_type || 'hourly',
      hourlyRate: phpHourlyRate,
      monthlyRate: phpMonthlyRate,
      totalDaysWorked: daysWorked,
      totalHoursRaw,
      totalHoursBillable: totalHours,
      totalOvertime: displayOT,
      basePay,
      overtimePay: otPay,
      adjustments: adjTotal,
      totalPay: payout.final_payout,
      generatedDate: issuedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }),
      documentNo: invoiceNo,
      logoUrl: 'https://www.hunacreatives.com/images/547b59870e776a20eb28e4f20931787c.png',
    });

    const pdfBytes = await htmlToPdf(payslipHtml);
    let binary = '';
    for (let i = 0; i < pdfBytes.length; i++) binary += String.fromCharCode(pdfBytes[i]);
    attachments = [{ filename: `Payslip - ${contractor.full_name} - ${periodLabel}.pdf`, content: btoa(binary) }];
    console.log('Payslip PDF generated:', pdfBytes.length, 'bytes');
  } catch (pdfErr) {
    console.error('Payslip PDF generation failed — sending receipt without attachment:', pdfErr);
  }
  const payslipAttached = attachments.length > 0;

  const otRow = otPay > 0 ? `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
        <p style="margin:0;font-size:13px;color:#374151;">Overtime Pay</p>
        <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;">${totalOT.toFixed(2)} hours overtime</p>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;font-weight:600;color:#7c3aed;">
        ${fmt(otPay)}
      </td>
    </tr>` : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <div style="background:#111827;padding:28px 36px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="vertical-align:top;">
            <p style="color:#FF6B35;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 6px;">Huna Creatives</p>
            <h1 style="color:#fff;font-size:26px;font-weight:800;margin:0;letter-spacing:-0.5px;">Payment Receipt</h1>
            <p style="color:#6b7280;font-size:13px;margin:6px 0 0;">Pay Period: <span style="color:#d1d5db;font-weight:600;">${periodLabel}</span></p>
          </td>
          <td style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:16px;">
            <p style="color:#6b7280;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em;">Invoice No.</p>
            <p style="color:#fff;font-size:13px;font-weight:700;margin:0;">${invoiceNo}</p>
            <p style="color:#6b7280;font-size:11px;margin:8px 0 2px;">Issued</p>
            <p style="color:#d1d5db;font-size:12px;margin:0;">${issuedLabel}</p>
          </td>
        </tr>
      </table>
    </div>

    <div style="background:#ecfdf5;padding:12px 36px;border-bottom:1px solid #d1fae5;">
      <table style="border-collapse:collapse;"><tr>
        <td style="vertical-align:middle;padding-right:10px;"><span style="display:inline-block;width:8px;height:8px;background:#10b981;border-radius:50%;"></span></td>
        <td style="vertical-align:middle;"><p style="margin:0;font-size:13px;color:#065f46;font-weight:600;">Payment sent — ${payslipAttached ? 'your official payslip is attached to this email as a PDF.' : 'this is your official payslip for the period above.'}</p></td>
      </tr></table>
    </div>

    <div style="padding:28px 36px;border-bottom:1px solid #f3f4f6;">
      <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">Issued To</p>
      <p style="font-size:20px;font-weight:700;color:#111827;margin:0 0 4px;">${contractor.full_name}</p>
      <p style="font-size:13px;color:#6b7280;margin:0 0 2px;">${contractor.department || 'Huna Creatives'}</p>
      <p style="font-size:13px;color:#6b7280;margin:0;">${contractType} · ${rateLabel}</p>
    </div>

    <div style="padding:24px 36px;background:#fafafa;border-bottom:1px solid #f3f4f6;">
      <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">Attendance Summary</p>
      <table style="border-collapse:collapse;"><tr>
        <td style="vertical-align:top;padding-right:32px;">
          <p style="font-size:11px;color:#9ca3af;margin:0 0 4px;">Days Worked</p>
          <p style="font-size:22px;font-weight:800;color:#111827;margin:0;">${daysWorked}</p>
          <p style="font-size:11px;color:#9ca3af;margin:2px 0 0;">days</p>
        </td>
        <td style="vertical-align:top;padding-right:32px;">
          <p style="font-size:11px;color:#9ca3af;margin:0 0 4px;">Hours Billed</p>
          <p style="font-size:22px;font-weight:800;color:#111827;margin:0;">${totalHours.toFixed(2)}</p>
          <p style="font-size:11px;color:#9ca3af;margin:2px 0 0;">hours</p>
        </td>
        ${totalOT > 0 ? `<td style="vertical-align:top;">
          <p style="font-size:11px;color:#9ca3af;margin:0 0 4px;">Overtime</p>
          <p style="font-size:22px;font-weight:800;color:#7c3aed;margin:0;">+${totalOT.toFixed(2)}</p>
          <p style="font-size:11px;color:#9ca3af;margin:2px 0 0;">hours</p>
        </td>` : ''}
      </tr></table>
    </div>

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
            <div style="background:#111827;border-radius:10px;padding:16px 20px;">
              <table style="width:100%;border-collapse:collapse;"><tr>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Total Payout</p>
                  <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">${periodLabel}</p>
                </td>
                <td style="vertical-align:middle;text-align:right;">
                  <p style="margin:0;font-size:24px;font-weight:800;color:#FF6B35;">${fmt(payout.final_payout)}</p>
                </td>
              </tr></table>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <div style="padding:24px 36px;">
      <p style="font-size:12px;color:#9ca3af;margin:0 0 8px;line-height:1.6;">
        This is an automatically generated payslip for the pay period <strong style="color:#6b7280;">${periodLabel}</strong>.
        ${payslipAttached ? 'Your official payslip PDF is attached — the same document available on your Payouts page.' : ''}
        Please keep this for your records. If you notice any discrepancies, reach out to HR on Slack immediately.
      </p>
      <p style="font-size:11px;color:#9ca3af;margin:0 0 4px;">This email is not monitored. Do not reply directly — for concerns, email <a href="mailto:contact@hunacreatives.com" style="color:#9ca3af;">contact@hunacreatives.com</a></p>
      <p style="font-size:11px;color:#d1d5db;margin:0;">© ${new Date().getFullYear()} Huna Creatives · payroll@hunacreatives.com</p>
    </div>

  </div>
</body>
</html>`;

  console.log('Calling Resend API...');
  const resendRes = await fetch('https://api.resend.com/emails', {
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
      ...(payslipAttached ? { attachments } : {}),
    }),
  });

  console.log('Resend response status:', resendRes.status);
  const result = await resendRes.json();
  if (!resendRes.ok) {
    console.error('Resend error:', JSON.stringify(result));
  } else {
    console.log('Resend success:', result.id);
    await supabase.from('hub_payouts').update({ payslip_sent_at: new Date().toISOString() }).eq('id', payout_id);
  }

  // Slack DM to contractor — isolated so a Slack failure doesn't shadow email success
  const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
  if (SLACK_BOT_TOKEN && contractor.slack_id && !(await hasPush(payout.contractor_id))) {
    try {
      const slackPost = async (path: string, body: unknown) => {
        const res = await fetch(`https://slack.com/api/${path}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(path === 'chat.postMessage' ? { unfurl_links: false, unfurl_media: false, ...(body as Record<string, unknown>) } : body),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(`Slack API failed: ${path} - ${json.error ?? res.status}`);
        }
        return json;
      };
      const dm = await slackPost('conversations.open', { users: contractor.slack_id });
      await slackPost('chat.postMessage', {
        channel: dm.channel.id,
        text: `💸 *Payment sent!* Your payslip for *${periodLabel}* has been processed — *${fmt(payout.final_payout)}* is on its way. Check your email for the full receipt.`,
      });
    } catch (slackErr) {
      console.error('Slack DM failed (payslip already sent):', slackErr);
    }
  }

  // App push for installed users (they skip the Slack DM above)
  await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: payout.contractor_id,
      title: 'Payment sent 💸',
      body: `Your payslip for ${periodLabel} has been processed — ${fmt(payout.final_payout)} is on its way. Full receipt in your email.`,
      url: 'https://www.hunacreatives.com/hub/contractor/payouts',
    }),
  }).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { payout_id } = await req.json();
    if (!payout_id) return new Response(JSON.stringify({ error: 'payout_id required' }), { status: 400, headers: cors });

    const payout_id_str = String(payout_id);
    // @ts-ignore
    EdgeRuntime.waitUntil((async () => {
      try {
        await sendPayslip(payout_id_str);
      } catch (error) {
        console.error('sendPayslip background task failed', { payout_id: payout_id_str, error });
      }
    })());

    return new Response(JSON.stringify({ ok: true, queued: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

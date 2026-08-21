import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminOrService, adminClient, authErrorResponse } from '../_shared/requireCaller.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOGO_URL = 'https://www.hunacreatives.com/images/547b59870e776a20eb28e4f20931787c.png';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function fmtPHP(val: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(val);
}

// Same Chromium-backed rendering as send-hr-certificate/send-payslip. This
// replaced the client-side html2canvas → JPEG → hand-built-PDF pipeline, which
// produced a blurry screenshot and captured live UI state instead of the
// closed period's persisted payroll data.
async function htmlToPdf(html: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get('PDFSHIFT_API_KEY');
  if (!apiKey) throw new Error('PDFSHIFT_API_KEY secret is not set');
  const res = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source: html, use_print: true, landscape: true, format: 'Letter' }),
  });
  if (!res.ok) throw new Error(`PDFShift conversion failed: ${res.status} ${await res.text()}`);
  return new Uint8Array(await res.arrayBuffer());
}

interface ReportRow {
  name: string;
  department: string;
  typeLabel: string;
  rateLabel: string;
  days: number;
  billedHours: number;
  overtimeHours: number;
  pay: number;
}

function buildReportHtml(opts: {
  periodLabel: string;
  generatedLabel: string;
  rows: ReportRow[];
  totalPay: number;
  totalHours: number;
  hourlyCount: number;
  fixedCount: number;
}) {
  const { periodLabel, generatedLabel, rows, totalPay, totalHours, hourlyCount, fixedCount } = opts;

  const th = (label: string, right = false) =>
    `<th style="background:#111827;color:#ffffff;padding:11px 12px;text-align:${right ? 'right' : 'left'};font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">${label}</th>`;

  const tableRows = rows.map(r => `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;">${r.name}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;">${r.department}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;">${r.typeLabel}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;">${r.rateLabel}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;">${r.days}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;">${r.billedHours.toFixed(2)}h</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;">${r.overtimeHours > 0 ? `${r.overtimeHours.toFixed(2)}h` : '—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;">${fmtPHP(r.pay)}</td>
    </tr>
  `).join('');

  const statCards = [
    { label: 'Total Payroll', value: fmtPHP(totalPay) },
    { label: 'Total Hours', value: `${totalHours.toFixed(2)}h` },
    { label: 'Employees', value: `${rows.length}` },
    { label: 'Hourly / Fixed', value: `${hourlyCount} / ${fixedCount}` },
  ].map((item) => `
    <div style="border:1px solid #e5e7eb;border-radius:16px;background:#f9fafb;padding:14px 16px;">
      <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;font-weight:700;">${item.label}</div>
      <div style="font-size:20px;font-weight:800;color:${item.label === 'Total Payroll' ? '#FF6B35' : '#111827'};margin-top:6px;">${item.value}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payroll Report – ${periodLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111827; background: #fff; padding: 36px 40px; font-size: 13px; line-height: 1.5; }
    @page { size: Letter landscape; margin: 0.75cm; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  </style>
</head>
<body>

  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #FF6B35;padding-bottom:20px;margin-bottom:28px;">
    <div style="display:flex;align-items:center;gap:14px;">
      <img src="${LOGO_URL}" alt="Huna Creatives" style="height:46px;object-fit:contain;" />
      <div>
        <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9ca3af;font-weight:700;">Huna Creatives</div>
        <div style="font-size:24px;font-weight:800;color:#111827;margin-top:2px;">Payroll Report</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:16px;font-weight:700;">${periodLabel}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">${generatedLabel}</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:24px;">
    ${statCards}
  </div>

  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead>
      <tr>
        ${th('Employee')}${th('Department')}${th('Type')}${th('Rate')}${th('Days')}${th('Billed Hours')}${th('Overtime')}${th('Pay', true)}
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr>
        <td colspan="7" style="padding:12px;border-top:2px solid #111827;font-weight:800;font-size:14px;">Total</td>
        <td style="padding:12px;border-top:2px solid #111827;text-align:right;font-weight:800;font-size:14px;">${fmtPHP(totalPay)}</td>
      </tr>
    </tbody>
  </table>

</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Run both by an admin from the payroll page and by the pg_net close trigger,
  // so either credential is accepted.
  try { await requireAdminOrService(req, adminClient()); }
  catch (e) { const r = authErrorResponse(e, cors); if (r) return r; throw e; }

  try {
    const { period_start, period_end, period_label } = await req.json();
    if (!period_start || !period_end || !period_label) {
      return new Response(JSON.stringify({ error: 'period_start, period_end, and period_label are required' }), { status: 400, headers: cors });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Idempotence lives here (not in the frontend) so the close trigger, the
    // manual "Save PDF to Drive" button, and retries can't double-upload.
    const flagKey = `payroll_pdf_saved_${period_start}`;
    const { data: flag } = await supabase.from('hub_settings').select('value').eq('key', flagKey).maybeSingle();
    if (flag?.value === 'true') {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'Report already saved for this period' }), { headers: cors });
    }

    // The persisted payout rows are the source of truth for a closed period —
    // the admin UI's live table intentionally zeroes out hours already covered
    // by a paid payout, which is exactly the wrong data for an archive report.
    const [usersRes, payoutsRes, hoursRes] = await Promise.all([
      supabase
        .from('hub_users')
        .select('id, full_name, department, currency, payment_type, hourly_rate, monthly_rate, start_date, status, role')
        .eq('status', 'active')
        .in('role', ['contractor', 'admin']),
      supabase
        .from('hub_payouts')
        .select('contractor_id, final_payout, overtime_pay, hourly_rate')
        .eq('cutoff_start', period_start),
      supabase
        .from('hub_daily_hours')
        .select('user_id, date, hours_capped, overtime_hours')
        .gte('date', period_start)
        .lte('date', period_end),
    ]);
    if (usersRes.error) throw usersRes.error;
    if (payoutsRes.error) throw payoutsRes.error;
    if (hoursRes.error) throw hoursRes.error;

    const payoutByUser: Record<string, any> = {};
    for (const p of payoutsRes.data || []) payoutByUser[p.contractor_id] = p;

    // Same eligibility as the admin payroll table, plus anyone who has a
    // payout row for the period even if since deactivated.
    const eligible = (usersRes.data || []).filter((u: any) =>
      u.payment_type !== 'project_based' && (!u.start_date || u.start_date <= period_end)
    );
    const eligibleIds = new Set(eligible.map((u: any) => u.id));
    const missingIds = Object.keys(payoutByUser).filter((id) => !eligibleIds.has(id));
    if (missingIds.length > 0) {
      const { data: extraUsers } = await supabase
        .from('hub_users')
        .select('id, full_name, department, currency, payment_type, hourly_rate, monthly_rate, start_date, status, role')
        .in('id', missingIds);
      for (const u of extraUsers || []) eligible.push(u);
    }

    const hoursByUser: Record<string, { days: number; capped: number; overtime: number }> = {};
    for (const h of hoursRes.data || []) {
      if (!hoursByUser[h.user_id]) hoursByUser[h.user_id] = { days: 0, capped: 0, overtime: 0 };
      const agg = hoursByUser[h.user_id];
      if ((h.hours_capped || 0) > 0 || (h.overtime_hours || 0) > 0) agg.days += 1;
      agg.capped += h.hours_capped || 0;
      agg.overtime += h.overtime_hours || 0;
    }

    const rows: ReportRow[] = eligible
      .map((u: any) => {
        const isFixed = u.payment_type === 'fixed' || u.payment_type === 'fixed_flexible';
        const isUSD = u.currency === 'USD';
        const payout = payoutByUser[u.id];
        const hrs = hoursByUser[u.id] || { days: 0, capped: 0, overtime: 0 };
        // If HR set overtime pay manually but no OT rows exist, derive display
        // hours from the pay (same fallback as the payslip).
        const otRate = Number(payout?.hourly_rate || u.hourly_rate || 0) || Number(u.monthly_rate || 0) / 176;
        const otPay = Number(payout?.overtime_pay || 0);
        const overtimeHours = hrs.overtime > 0 ? hrs.overtime : (otPay > 0 && otRate > 0 ? parseFloat((otPay / otRate).toFixed(2)) : 0);
        return {
          name: u.full_name,
          department: u.department || '—',
          typeLabel: isFixed ? 'Fixed' : 'Hourly',
          rateLabel: isFixed
            ? isUSD ? `$${(u.monthly_rate || 0).toLocaleString()}/mo` : `PHP ${(u.monthly_rate || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}/mo`
            : isUSD ? `$${u.hourly_rate}/hr` : `PHP ${(u.hourly_rate || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}/hr`,
          days: hrs.days,
          billedHours: hrs.capped,
          overtimeHours,
          pay: Number(payout?.final_payout || 0),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const totalPay = rows.reduce((s, r) => s + r.pay, 0);
    const totalHours = rows.reduce((s, r) => s + r.billedHours, 0);
    const hourlyCount = rows.filter(r => r.typeLabel === 'Hourly').length;
    const fixedCount = rows.length - hourlyCount;

    const generatedLabel = `Closed ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })}`;
    const html = buildReportHtml({ periodLabel: period_label, generatedLabel, rows, totalPay, totalHours, hourlyCount, fixedCount });
    const pdfBytes = await htmlToPdf(html);

    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < pdfBytes.length; i += chunk) binary += String.fromCharCode(...pdfBytes.subarray(i, i + chunk));
    const base64Content = btoa(binary);

    const year = String(period_start).slice(0, 4);
    const safeName = String(period_label).replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_');
    const filename = `Payroll_${safeName}.pdf`;

    const uploadRes = await fetch(`${SUPABASE_URL}/functions/v1/upload-to-drive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'payroll', year, filename, base64Content, mimeType: 'application/pdf', meta: { year } }),
    });
    const uploadResult = await uploadRes.json();
    if (!uploadRes.ok || uploadResult?.error) {
      throw new Error(`Drive upload failed: ${JSON.stringify(uploadResult)}`);
    }

    await supabase.from('hub_settings').upsert(
      { key: flagKey, value: 'true', updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    );

    return new Response(JSON.stringify({ ok: true, filename, ...uploadResult }), { headers: cors });
  } catch (err) {
    console.error('save-payroll-report failed:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

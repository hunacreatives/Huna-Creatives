import { refNumber } from './certificateTemplate';

export interface PayoutRow {
  cutoff_start: string;
  cutoff_end: string;
  approved_hours: number | null;
  base_pay: number | null;
  overtime_pay: number | null;
  bonus: number | null;
  incentives: number | null;
  reimbursements: number | null;
  deductions: number | null;
  advances: number | null;
  penalties: number | null;
  final_payout: number | null;
  payment_date: string | null;
}

export interface ProjectPayoutRow {
  paid_at: string;
  amount: number | null;
  project_label: string;
  notes: string | null;
}

const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const sym = (currency: string) => (currency === 'USD' ? '$' : '₱');
const fmtMoney = (n: number | null | undefined, currency: string) =>
  `${sym(currency)}${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Branded like the in-app payslip (dark navy header, orange accent, stat
// tiles) but laid out as a proper A4 printable page — same page mechanics
// as certificateTemplate.ts — so it reads as an official document rather
// than a browser-width web card.
export function renderPaymentSummaryHTML(
  contractorName: string,
  rateCurrency: string,
  payrollRows: PayoutRow[],
  projectRows: ProjectPayoutRow[],
  dateFrom: string,
  dateTo: string,
  contractorId: string,
  logoData: string,
  _sigData: string,
): string {
  const issued = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const ref = refNumber(contractorId);
  const showsConversionNote = rateCurrency !== 'PHP';

  const payrollTotals = payrollRows.reduce((acc, r) => ({
    hours: acc.hours + (r.approved_hours ?? 0),
    base: acc.base + (r.base_pay ?? 0),
    overtime: acc.overtime + (r.overtime_pay ?? 0),
    extras: acc.extras + (r.bonus ?? 0) + (r.incentives ?? 0) + (r.reimbursements ?? 0),
    deductions: acc.deductions + (r.deductions ?? 0) + (r.advances ?? 0) + (r.penalties ?? 0),
    net: acc.net + (r.final_payout ?? 0),
  }), { hours: 0, base: 0, overtime: 0, extras: 0, deductions: 0, net: 0 });

  const projectTotal = projectRows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const grandTotalPhp = payrollTotals.net + projectTotal;

  const payrollListRows = payrollRows.map(r => `
    <div class="row">
      <div class="row-main">
        <span class="row-title">${fmtDate(r.cutoff_start)} &ndash; ${fmtDate(r.cutoff_end)}</span>
        <span class="row-sub">${(r.approved_hours ?? 0).toLocaleString()}h &middot; Base ${fmtMoney(r.base_pay, rateCurrency)}${(r.overtime_pay ?? 0) > 0 ? ` &middot; OT ${fmtMoney(r.overtime_pay, rateCurrency)}` : ''}${((r.bonus ?? 0) + (r.incentives ?? 0) + (r.reimbursements ?? 0)) > 0 ? ` &middot; Other ${fmtMoney((r.bonus ?? 0) + (r.incentives ?? 0) + (r.reimbursements ?? 0), rateCurrency)}` : ''}${((r.deductions ?? 0) + (r.advances ?? 0) + (r.penalties ?? 0)) > 0 ? ` &middot; Deductions -${fmtMoney((r.deductions ?? 0) + (r.advances ?? 0) + (r.penalties ?? 0), rateCurrency)}` : ''}</span>
      </div>
      <span class="row-amount">${fmtMoney(r.final_payout, 'PHP')}</span>
    </div>`).join('\n');

  const projectListRows = projectRows.map(r => `
    <div class="row">
      <div class="row-main">
        <span class="row-title">${r.project_label}</span>
        <span class="row-sub">${fmtDate(r.paid_at)}${r.notes ? ` &middot; ${r.notes}` : ''}</span>
      </div>
      <span class="row-amount">${fmtMoney(r.amount, 'PHP')}</span>
    </div>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 9.5pt; color: #111827; background: #e9e9ea; -webkit-font-smoothing: antialiased;
  }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 12mm; }
  .doc { background: #fff; min-height: 273mm; position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }

  .head { background: #111827; padding: 14mm 16mm 10mm; display: flex; align-items: flex-start; justify-content: space-between; }
  .head-logo { height: 22pt; width: auto; display: block; margin-bottom: 6pt; filter: invert(1) brightness(1.6); }
  .head-left .sub { color: rgba(255,255,255,0.45); font-size: 8pt; }
  .head-right { text-align: right; }
  .head-right .tag { color: #FF6B35; font-weight: 700; font-size: 10.5pt; letter-spacing: 0.12em; }
  .head-right .sub { color: rgba(255,255,255,0.45); font-size: 8pt; margin-top: 4pt; }

  .body-pad { padding: 0 16mm; }

  .info { padding: 10pt 0; border-bottom: 1pt solid #f0f0f0; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12pt; }
  .info .lbl { font-size: 7.5pt; color: #9ca3af; margin-bottom: 2pt; text-transform: uppercase; letter-spacing: 0.04em; }
  .info .val { font-size: 10pt; font-weight: 600; color: #111827; }
  .info .sub2 { font-size: 7.5pt; color: #9ca3af; margin-top: 2pt; }

  .stats { padding: 10pt 0; border-bottom: 1pt solid #f0f0f0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8pt; text-align: center; }
  .stats .tile { background: #f9fafb; border-radius: 6pt; padding: 8pt 6pt; }
  .stats .tile .num { font-size: 13pt; font-weight: 700; color: #111827; }
  .stats .tile .lbl { font-size: 7.5pt; color: #9ca3af; margin-top: 2pt; }

  .section { padding: 10pt 0; border-bottom: 1pt solid #f0f0f0; }
  .section-title { font-size: 8pt; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7pt; }
  .note { font-size: 8pt; color: #9ca3af; font-style: italic; margin: -3pt 0 7pt; text-align: justify; }

  .row { display: flex; align-items: center; justify-content: space-between; gap: 8pt; padding: 6pt 0; border-bottom: 0.5pt solid #f5f5f5; }
  .row:last-child { border-bottom: none; }
  .row-main { display: flex; flex-direction: column; min-width: 0; }
  .row-title { font-size: 9pt; font-weight: 500; color: #111827; }
  .row-sub { font-size: 7.5pt; color: #9ca3af; margin-top: 1pt; }
  .row-amount { font-size: 9pt; font-weight: 600; color: #111827; white-space: nowrap; }
  .empty { text-align: center; color: #9ca3af; font-size: 8.5pt; padding: 10pt 0; }

  .subtotal { display: flex; justify-content: space-between; padding-top: 6pt; margin-top: 1pt; border-top: 0.75pt solid #eee; font-size: 8pt; color: #6b7280; }
  .subtotal .amt { font-weight: 700; color: #374151; }

  .total-row { padding: 12pt 0; display: flex; align-items: center; justify-content: space-between; }
  .total-row .label { font-weight: 600; color: #111827; font-size: 10pt; }
  .total-row .value { font-size: 15pt; font-weight: 800; color: #FF6B35; }

  .footer { margin-top: 20pt; padding: 0 16mm 12mm; border-top: 0.75pt solid #e5e5e5; padding-top: 8pt; }
  .footer p { text-align: justify; margin: 0 0 3pt; font-size: 6.8pt; line-height: 1.5; color: #9a9a9a; }
  .footer p:last-child { margin-bottom: 0; }
  .footer strong { color: #7a7a7a; }

  @media print {
    body { background: #fff; }
    .sheet { margin: 0; padding: 0; }
    .doc { box-shadow: none; min-height: auto; }
    @page { size: A4; margin: 0; }
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="doc">
    <div class="head">
      <div class="head-left">
        <img src="${logoData}" alt="Huna Creatives" class="head-logo" />
        <p class="sub">Employee Payment Summary</p>
      </div>
      <div class="head-right">
        <p class="tag">PAYMENT SUMMARY</p>
        <p class="sub">${fmtDate(dateFrom)} &ndash; ${fmtDate(dateTo)}</p>
      </div>
    </div>

    <div class="body-pad">
      <div class="info">
        <div>
          <p class="lbl">Employee</p>
          <p class="val">${contractorName}</p>
        </div>
        <div>
          <p class="lbl">Period Covered</p>
          <p class="val">${fmtDate(dateFrom)} &ndash; ${fmtDate(dateTo)}</p>
        </div>
        <div>
          <p class="lbl">Reference No.</p>
          <p class="val">${ref}</p>
          <p class="sub2">Issued ${issued}</p>
        </div>
      </div>

      <div class="stats">
        <div class="tile">
          <p class="num">${payrollRows.length}</p>
          <p class="lbl">Pay Periods</p>
        </div>
        <div class="tile">
          <p class="num">${payrollTotals.hours.toLocaleString()}h</p>
          <p class="lbl">Hours Logged</p>
        </div>
        <div class="tile">
          <p class="num">${projectRows.length}</p>
          <p class="lbl">Project Payments</p>
        </div>
      </div>

      <div class="section">
        <p class="section-title">Regular Payroll</p>
        ${showsConversionNote ? `<p class="note">Base pay, overtime, and deductions are quoted in ${rateCurrency}; amounts shown per period are the actual PHP disbursement.</p>` : ''}
        ${payrollListRows || '<p class="empty">No paid payroll records found for this period.</p>'}
        ${payrollRows.length > 0 ? `<div class="subtotal"><span>Payroll Subtotal</span><span class="amt">${fmtMoney(payrollTotals.net, 'PHP')}</span></div>` : ''}
      </div>

      <div class="section">
        <p class="section-title">Project-Based Payments</p>
        ${projectListRows || '<p class="empty">No project-based payments found for this period.</p>'}
        ${projectRows.length > 0 ? `<div class="subtotal"><span>Project Subtotal</span><span class="amt">${fmtMoney(projectTotal, 'PHP')}</span></div>` : ''}
      </div>

      <div class="total-row">
        <span class="label">Grand Total Paid (PHP)</span>
        <span class="value">${fmtMoney(grandTotalPhp, 'PHP')}</span>
      </div>
    </div>

    <div class="footer">
      <p><strong>Huna Creatives</strong> &middot; Cebu, Philippines &middot; This document is an officially issued payment summary generated from payroll and project payment records, and is valid without a physical signature.</p>
      <p>This document is confidential and intended solely for the named recipient and the party or institution for which it was requested. It may be presented to banks, government agencies, or other institutions as proof of income.</p>
      <p>To verify the authenticity of this document, contact Huna Creatives at contact@hunacreatives.com quoting Reference No. ${ref}.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

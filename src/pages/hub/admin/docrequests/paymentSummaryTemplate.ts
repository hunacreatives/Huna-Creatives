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

// Branded to match the in-app payslip look (dark navy header, orange accent,
// rounded card, stat tiles) instead of a plain legal-letter style — this is
// an internal/financial statement, not a certificate for embassies/banks.
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
    font-size: 13px; color: #111827; background: #f3f4f6; -webkit-font-smoothing: antialiased;
  }
  .sheet { max-width: 700px; margin: 32px auto 60px; }
  .card { background: #fff; border-radius: 16px; border: 1px solid #f3f4f6; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }

  .head { background: #111827; padding: 24px 28px; display: flex; align-items: flex-start; justify-content: space-between; }
  .head-left p:first-child { color: #fff; font-weight: 700; font-size: 16px; }
  .head-left p:last-child { color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 2px; }
  .head-right { text-align: right; }
  .head-right .tag { color: #FF6B35; font-weight: 700; font-size: 13px; letter-spacing: 0.15em; }
  .head-right .sub { color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 4px; }

  .info { padding: 16px 28px; border-bottom: 1px solid #f9fafb; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .info .lbl { font-size: 11px; color: #9ca3af; margin-bottom: 2px; }
  .info .val { font-size: 14px; font-weight: 600; color: #111827; }
  .info .sub2 { font-size: 11px; color: #9ca3af; margin-top: 2px; }

  .stats { padding: 16px 28px; border-bottom: 1px solid #f9fafb; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; }
  .stats .tile { background: #f9fafb; border-radius: 12px; padding: 12px 8px; }
  .stats .tile .num { font-size: 18px; font-weight: 700; color: #111827; }
  .stats .tile .lbl { font-size: 10.5px; color: #9ca3af; margin-top: 2px; }

  .section { padding: 16px 28px; border-bottom: 1px solid #f9fafb; }
  .section-title { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
  .note { font-size: 11px; color: #9ca3af; font-style: italic; margin: -4px 0 10px; }

  .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid #f9fafb; }
  .row:last-child { border-bottom: none; }
  .row-main { display: flex; flex-direction: column; min-width: 0; }
  .row-title { font-size: 13px; font-weight: 500; color: #111827; }
  .row-sub { font-size: 11px; color: #9ca3af; margin-top: 1px; }
  .row-amount { font-size: 13px; font-weight: 600; color: #111827; white-space: nowrap; }
  .empty { text-align: center; color: #9ca3af; font-size: 12px; padding: 16px 0; }

  .subtotal { display: flex; justify-content: space-between; padding-top: 8px; margin-top: 2px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #6b7280; }
  .subtotal .amt { font-weight: 700; color: #374151; }

  .total-row { padding: 18px 28px; display: flex; align-items: center; justify-content: space-between; }
  .total-row .label { font-weight: 600; color: #111827; font-size: 14px; }
  .total-row .value { font-size: 22px; font-weight: 800; color: #FF6B35; }

  .footer { max-width: 700px; margin: 18px auto 0; padding: 0 4px; font-size: 10.5px; color: #9ca3af; line-height: 1.6; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  .footer img { height: 20px; width: auto; opacity: 0.35; flex-shrink: 0; }

  @media print {
    body { background: #fff; }
    .sheet { margin: 0 auto; }
    .card { box-shadow: none; }
    @page { size: A4; margin: 12mm; }
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="card">
    <div class="head">
      <div class="head-left">
        <p>Huna Creatives</p>
        <p>Employee Payment Summary</p>
      </div>
      <div class="head-right">
        <p class="tag">PAYMENT SUMMARY</p>
        <p class="sub">${fmtDate(dateFrom)} &ndash; ${fmtDate(dateTo)}</p>
      </div>
    </div>

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
    <span>This document is an officially issued payment summary by Huna Creatives, generated from payroll and project payment records. It may be presented to banks, government agencies, or other institutions as proof of income. For verification, contact contact@hunacreatives.com quoting Reference No. ${ref}.</span>
    <img src="${logoData}" alt="Huna Creatives" />
  </div>
</div>
</body>
</html>`;
}

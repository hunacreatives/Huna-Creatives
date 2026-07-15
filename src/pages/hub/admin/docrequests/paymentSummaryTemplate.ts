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
const fmtDateLong = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const sym = (currency: string) => (currency === 'USD' ? '$' : '₱');
const fmtMoney = (n: number | null | undefined, currency: string) =>
  `${sym(currency)}${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function issuedLine(): string {
  const now = new Date();
  return `Issued this ${ordinal(now.getDate())} day of ${now.toLocaleDateString('en-US', { month: 'long' })}, ${now.getFullYear()} in Cebu City, Philippines, for whatever legal purpose it may serve.`;
}

// Spells out a PHP amount the way official Philippine financial documents
// (checks, ORs, certifications) require, e.g.
// "SEVENTY-EIGHT THOUSAND FIVE HUNDRED FIFTEEN PESOS ONLY".
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function chunkToWords(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(n % 10 ? `${TENS[Math.floor(n / 10)]}-${ONES[n % 10]}` : TENS[Math.floor(n / 10)]);
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(' ');
}

function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  const scales = [
    { value: 1_000_000_000, label: 'Billion' },
    { value: 1_000_000, label: 'Million' },
    { value: 1_000, label: 'Thousand' },
    { value: 1, label: '' },
  ];
  const parts: string[] = [];
  for (const { value, label } of scales) {
    if (n >= value) {
      const chunk = Math.floor(n / value);
      n %= value;
      parts.push(label ? `${chunkToWords(chunk)} ${label}` : chunkToWords(chunk));
    }
  }
  return parts.join(' ');
}

export function amountInWordsPhp(amount: number): string {
  const pesos = Math.floor(amount);
  const centavos = Math.round((amount - pesos) * 100);
  let words = `${numberToWords(pesos)} Pesos`;
  if (centavos > 0) words += ` and ${numberToWords(centavos)} Centavos`;
  return `${words} Only`.toUpperCase();
}

// Official payment certification: branded dark letterhead, but the body is
// structured the way Philippine government agencies and banks expect —
// certification statement, fully bordered tables, amount in words, an
// "issued this Nth day" attestation, and a signed certification block.
export function renderPaymentSummaryHTML(
  contractorName: string,
  rateCurrency: string,
  payrollRows: PayoutRow[],
  projectRows: ProjectPayoutRow[],
  dateFrom: string,
  dateTo: string,
  contractorId: string,
  logoData: string,
  sigData: string,
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

  const payrollBodyRows = payrollRows.map(r => `
    <tr>
      <td>${fmtDate(r.cutoff_start)} &ndash; ${fmtDate(r.cutoff_end)}</td>
      <td class="num">${(r.approved_hours ?? 0).toLocaleString()}</td>
      <td class="num">${fmtMoney(r.base_pay, rateCurrency)}</td>
      <td class="num">${fmtMoney(r.overtime_pay, rateCurrency)}</td>
      <td class="num">${fmtMoney((r.bonus ?? 0) + (r.incentives ?? 0) + (r.reimbursements ?? 0), rateCurrency)}</td>
      <td class="num">${fmtMoney((r.deductions ?? 0) + (r.advances ?? 0) + (r.penalties ?? 0), rateCurrency)}</td>
      <td class="num strong">${fmtMoney(r.final_payout, 'PHP')}</td>
    </tr>`).join('\n');

  const projectBodyRows = projectRows.map(r => `
    <tr>
      <td>${fmtDate(r.paid_at)}</td>
      <td>${r.project_label}</td>
      <td>${r.notes || '—'}</td>
      <td class="num strong">${fmtMoney(r.amount, 'PHP')}</td>
    </tr>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 9pt; color: #111827; background: #e9e9ea; -webkit-font-smoothing: antialiased;
  }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 12mm; }
  .doc { background: #fff; min-height: 273mm; position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }

  .head { background: #111827; padding: 10mm 14mm 8mm; display: flex; align-items: flex-start; justify-content: space-between; }
  .head-logo { height: 36pt; width: auto; display: block; margin-bottom: 6pt; filter: invert(1) brightness(1.6); }
  .head-left .sub { color: rgba(255,255,255,0.5); font-size: 7.5pt; line-height: 1.6; }
  .head-right { text-align: right; }
  .head-right .tag { color: #FF6B35; font-weight: 700; font-size: 11pt; letter-spacing: 0.12em; }
  .head-right .sub { color: rgba(255,255,255,0.5); font-size: 7.5pt; margin-top: 4pt; line-height: 1.6; }

  .body-pad { padding: 10pt 14mm 0; }

  .certify { background: #f9fafb; border-left: 2.5pt solid #FF6B35; border-radius: 0 6pt 6pt 0; padding: 9pt 12pt; margin-bottom: 14pt; }
  .certify p { font-size: 8.5pt; line-height: 1.65; color: #374151; text-align: justify; }

  .info { margin-bottom: 14pt; display: grid; grid-template-columns: 1fr 1fr 1fr; border: 0.75pt solid #e5e7eb; border-radius: 6pt; overflow: hidden; }
  .info > div { padding: 8pt 12pt; border-left: 0.75pt solid #e5e7eb; }
  .info > div:first-child { border-left: none; }
  .info .lbl { font-size: 7pt; color: #9ca3af; margin-bottom: 2pt; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .info .val { font-size: 9.5pt; font-weight: 700; color: #111827; white-space: nowrap; }
  .info .sub2 { font-size: 7.5pt; color: #9ca3af; margin-top: 1pt; }

  .section-title { font-size: 8pt; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; margin: 12pt 0 6pt; }
  .note { font-size: 7.5pt; color: #9ca3af; font-style: italic; margin-bottom: 6pt; text-align: justify; }

  table { width: 100%; border-collapse: collapse; font-size: 8pt; }
  thead th { background: #f9fafb; border: 0.75pt solid #e5e7eb; padding: 5pt 6pt; text-align: left; font-size: 6.8pt; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; font-weight: 700; }
  thead th.num { text-align: right; }
  tbody td { border: 0.75pt solid #ececec; padding: 5pt 6pt; color: #374151; }
  tbody td.num { text-align: right; }
  td.strong { font-weight: 700; color: #111827; }
  tfoot td { border: 0.75pt solid #e5e7eb; background: #fafafa; padding: 6pt; font-weight: 700; color: #111827; }
  tfoot td.num { text-align: right; }
  .empty-cell { text-align: center; color: #9ca3af; font-style: italic; }

  .grand { margin-top: 14pt; border: 1pt solid #e5e7eb; border-radius: 6pt; overflow: hidden; }
  .grand-row { display: flex; justify-content: space-between; align-items: center; }
  .grand-row.main { background: #fff7f4; padding: 10pt 12pt; }
  .grand-row.main span:first-child { font-weight: 800; font-size: 10pt; color: #111827; }
  .grand-row.main span:last-child { font-weight: 800; font-size: 14pt; color: #FF6B35; }
  .in-words { padding: 7pt 12pt; background: #fff; border-top: 0.75pt solid #f0f0f0; font-size: 7.5pt; color: #6b7280; }
  .in-words strong { color: #374151; letter-spacing: 0.02em; }

  .issued-line { margin-top: 14pt; color: #555; font-size: 8.5pt; }

  .sign-block { margin-top: 22pt; display: flex; justify-content: flex-end; }
  .sign-col { text-align: center; width: 190pt; }
  .sign-label { font-size: 7.5pt; color: #6b7280; text-align: left; margin-bottom: 2pt; }
  .sign-img { height: 42pt; width: auto; max-width: 170pt; object-fit: contain; margin: 0 auto 2pt; display: block; }
  .sign-line { border-top: 1pt solid #222; margin-top: 2pt; padding-top: 5pt; }
  .sign-name { font-weight: 700; font-size: 9.5pt; color: #111; }
  .sign-title { font-size: 7.5pt; color: #777; margin-top: 1pt; }

  .footer { margin: 18pt 14mm 0; border-top: 0.75pt solid #e5e5e5; padding: 8pt 0 10mm; }
  .footer p { text-align: justify; margin: 0 0 3pt; font-size: 6.8pt; line-height: 1.5; color: #9a9a9a; }
  .footer p:last-child { margin-bottom: 0; }
  .footer strong { color: #7a7a7a; }

  @media print {
    body { background: #fff; }
    .sheet { margin: 0; padding: 0; min-height: auto; }
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
        <p class="sub">Cebu, Philippines, 6004<br />contact@hunacreatives.com &middot; (032) 505 6921</p>
      </div>
      <div class="head-right">
        <p class="tag">PAYMENT SUMMARY</p>
        <p class="sub">Certification of Compensation Paid</p>
      </div>
    </div>

    <div class="body-pad">
      <div class="certify">
        <p><strong>TO WHOM IT MAY CONCERN:</strong> This is to certify that the records set out below constitute a true, complete, and accurate summary of all compensation paid by <strong>Huna Creatives</strong> to <strong>${contractorName}</strong> for the period of <strong>${fmtDateLong(dateFrom)}</strong> to <strong>${fmtDateLong(dateTo)}</strong>, as extracted from the company's official payroll and project payment records. All figures reflect finalized, disbursed amounts only.</p>
      </div>

      <div class="info">
        <div>
          <p class="lbl">Payee</p>
          <p class="val">${contractorName}</p>
          <p class="sub2">Independent Contractor</p>
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

      <p class="section-title">I. Regular Payroll</p>
      ${showsConversionNote ? `<p class="note">Base pay, overtime, bonuses, and deductions are quoted in ${rateCurrency} per the contractor's engagement terms; Net Paid reflects the actual amount disbursed in Philippine Pesos (PHP) at the prevailing exchange rate for each period.</p>` : ''}
      <table>
        <thead>
          <tr>
            <th>Pay Period</th>
            <th class="num">Hours</th>
            <th class="num">Base Pay (${rateCurrency})</th>
            <th class="num">Overtime (${rateCurrency})</th>
            <th class="num">Bonus / Other (${rateCurrency})</th>
            <th class="num">Deductions (${rateCurrency})</th>
            <th class="num">Net Paid (PHP)</th>
          </tr>
        </thead>
        <tbody>
          ${payrollBodyRows || '<tr><td colspan="7" class="empty-cell">No paid payroll records found for this period.</td></tr>'}
        </tbody>
        <tfoot>
          <tr>
            <td>Subtotal</td>
            <td class="num">${payrollTotals.hours.toLocaleString()}</td>
            <td class="num">${fmtMoney(payrollTotals.base, rateCurrency)}</td>
            <td class="num">${fmtMoney(payrollTotals.overtime, rateCurrency)}</td>
            <td class="num">${fmtMoney(payrollTotals.extras, rateCurrency)}</td>
            <td class="num">${fmtMoney(payrollTotals.deductions, rateCurrency)}</td>
            <td class="num">${fmtMoney(payrollTotals.net, 'PHP')}</td>
          </tr>
        </tfoot>
      </table>

      <p class="section-title">II. Project-Based Payments</p>
      <table>
        <thead>
          <tr>
            <th>Date Paid</th>
            <th>Project / Client</th>
            <th>Particulars</th>
            <th class="num">Amount (PHP)</th>
          </tr>
        </thead>
        <tbody>
          ${projectBodyRows || '<tr><td colspan="4" class="empty-cell">No project-based payments found for this period.</td></tr>'}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3">Subtotal</td>
            <td class="num">${fmtMoney(projectTotal, 'PHP')}</td>
          </tr>
        </tfoot>
      </table>

      <div class="grand">
        <div class="grand-row main"><span>GRAND TOTAL PAID (PHP)</span><span>${fmtMoney(grandTotalPhp, 'PHP')}</span></div>
        <div class="in-words">Amount in words: <strong>${amountInWordsPhp(grandTotalPhp)}</strong></div>
      </div>

      <p class="issued-line">${issuedLine()}</p>

      <div class="sign-block">
        <div class="sign-col">
          <p class="sign-label">Certified true and correct:</p>
          <img src="${sigData}" class="sign-img" alt="Signature" />
          <div class="sign-line">
            <div class="sign-name">Francis Fiel Roble</div>
            <div class="sign-title">Owner, Huna Creatives</div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p><strong>Huna Creatives</strong> &middot; Cebu, Philippines &middot; This certification is issued electronically, is valid without a physical signature, and may be presented to banks, government agencies, or other institutions as proof of income. Unauthorized reproduction or alteration is prohibited.</p>
      <p>To verify authenticity, contact contact@hunacreatives.com quoting Reference No. ${ref}.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

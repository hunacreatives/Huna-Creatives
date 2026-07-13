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

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function issuedLine(): string {
  const now = new Date();
  return `Issued this ${ordinal(now.getDate())} day of ${now.toLocaleDateString('en-US', { month: 'long' })}, ${now.getFullYear()} in Cebu City, Philippines, for whatever legal purpose it may serve.`;
}

const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtMoney = (n: number | null | undefined, currency: string) =>
  `${currency === 'USD' ? '$' : '₱'}${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Data-driven statement of real payouts — no AI involved in the figures.
// Reuses the same modern letterhead/footer look as the HR certificates.
export function renderPaymentSummaryHTML(
  contractorName: string,
  currency: string,
  rows: PayoutRow[],
  dateFrom: string,
  dateTo: string,
  contractorId: string,
  logoData: string,
  sigData: string,
): string {
  const issued = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const ref = refNumber(contractorId);

  const totals = rows.reduce((acc, r) => ({
    hours: acc.hours + (r.approved_hours ?? 0),
    base: acc.base + (r.base_pay ?? 0),
    overtime: acc.overtime + (r.overtime_pay ?? 0),
    extras: acc.extras + (r.bonus ?? 0) + (r.incentives ?? 0) + (r.reimbursements ?? 0),
    deductions: acc.deductions + (r.deductions ?? 0) + (r.advances ?? 0) + (r.penalties ?? 0),
    net: acc.net + (r.final_payout ?? 0),
  }), { hours: 0, base: 0, overtime: 0, extras: 0, deductions: 0, net: 0 });

  const bodyRows = rows.map(r => `
    <tr>
      <td>${fmtDate(r.cutoff_start)} &ndash; ${fmtDate(r.cutoff_end)}</td>
      <td class="num">${(r.approved_hours ?? 0).toLocaleString()}</td>
      <td class="num">${fmtMoney(r.base_pay, currency)}</td>
      <td class="num">${fmtMoney(r.overtime_pay, currency)}</td>
      <td class="num">${fmtMoney((r.bonus ?? 0) + (r.incentives ?? 0) + (r.reimbursements ?? 0), currency)}</td>
      <td class="num">${fmtMoney((r.deductions ?? 0) + (r.advances ?? 0) + (r.penalties ?? 0), currency)}</td>
      <td class="num strong">${fmtMoney(r.final_payout, currency)}</td>
    </tr>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 9.5pt; color: #1a1a1a; background: #e9e9ea; -webkit-font-smoothing: antialiased;
  }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 12mm; }
  .doc { background: #fff; min-height: 273mm; padding: 16mm 18mm; position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }

  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10pt; }
  .logo-block img { height: 26pt; width: auto; display: block; }
  .header-contact { text-align: right; font-size: 7.5pt; color: #6b6b6b; line-height: 1.6; }
  .header-rule { border: none; border-top: 1pt solid #D64F1E; margin: 0 0 10pt; }

  .meta-row { display: flex; justify-content: space-between; font-size: 7.5pt; color: #8a8a8a; margin-bottom: 26pt; letter-spacing: 0.02em; text-transform: uppercase; }

  .doc-title { font-size: 13.5pt; font-weight: 600; letter-spacing: 0.01em; margin: 0 0 3pt; color: #111; }
  .doc-underline { width: 34pt; height: 2pt; background: #D64F1E; margin: 0 0 18pt; }

  p { line-height: 1.6; font-size: 9.5pt; color: #222; margin-bottom: 10pt; }

  table { width: 100%; border-collapse: collapse; margin: 14pt 0 4pt; font-size: 8.5pt; }
  thead th { text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.02em; color: #8a8a8a; font-weight: 600; padding: 0 6pt 6pt; border-bottom: 1pt solid #ddd; }
  thead th.num, td.num { text-align: right; }
  tbody td { padding: 6pt; border-bottom: 0.5pt solid #eee; color: #333; }
  td.strong { font-weight: 600; color: #111; }
  tfoot td { padding: 8pt 6pt; font-weight: 700; color: #111; border-top: 1.25pt solid #222; }

  .issued-line { margin-top: 10pt; color: #555; font-size: 9pt; }

  .sign-block { margin-top: 30pt; display: flex; justify-content: flex-end; }
  .sign-col { text-align: center; width: 190pt; }
  .sign-img { height: 44pt; width: auto; max-width: 170pt; object-fit: contain; margin: 0 auto 2pt; display: block; }
  .sign-line { border-top: 1pt solid #222; margin-top: 2pt; padding-top: 5pt; }
  .sign-name { font-weight: 600; font-size: 9.5pt; color: #111; }
  .sign-title { font-size: 8pt; color: #777; margin-top: 1pt; }

  .footer { position: absolute; bottom: 12mm; left: 18mm; right: 18mm; border-top: 0.75pt solid #e5e5e5; padding-top: 8pt; }
  .footer p { text-align: left; margin: 0 0 3pt; font-size: 6.8pt; line-height: 1.5; color: #9a9a9a; }
  .footer p:last-child { margin-bottom: 0; }
  .footer strong { color: #7a7a7a; }

  @media print {
    body { background: #fff; }
    .sheet { margin: 0; padding: 0; }
    .doc { box-shadow: none; min-height: auto; }
    @page { size: A4; margin: 12mm; }
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="doc">
    <div class="header">
      <div class="logo-block"><img src="${logoData}" alt="Huna Creatives" /></div>
      <div class="header-contact">
        (032) 505 6921 &nbsp;|&nbsp; +63 952 447 2602<br />
        contact@hunacreatives.com<br />
        Cebu, Philippines, 6004
      </div>
    </div>
    <hr class="header-rule" />
    <div class="meta-row">
      <span>Ref. No. ${ref}</span>
      <span>Date Issued: ${issued}</span>
    </div>

    <div class="doc-title">Payment Summary</div>
    <div class="doc-underline"></div>

    <p>This document summarizes payments made by Huna Creatives to <strong>${contractorName}</strong> for the period of <strong>${fmtDate(dateFrom)}</strong> to <strong>${fmtDate(dateTo)}</strong>, based on Huna Creatives' payroll records. All figures reflect finalized, paid payout batches only.</p>

    <table>
      <thead>
        <tr>
          <th>Pay Period</th>
          <th class="num">Hours</th>
          <th class="num">Base Pay</th>
          <th class="num">Overtime</th>
          <th class="num">Bonus / Other</th>
          <th class="num">Deductions</th>
          <th class="num">Net Paid</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows || '<tr><td colspan="7" style="text-align:center;color:#999;padding:16pt;">No paid payout records found for this period.</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          <td class="num">${totals.hours.toLocaleString()}</td>
          <td class="num">${fmtMoney(totals.base, currency)}</td>
          <td class="num">${fmtMoney(totals.overtime, currency)}</td>
          <td class="num">${fmtMoney(totals.extras, currency)}</td>
          <td class="num">${fmtMoney(totals.deductions, currency)}</td>
          <td class="num">${fmtMoney(totals.net, currency)}</td>
        </tr>
      </tfoot>
    </table>

    <p class="issued-line">${issuedLine()}</p>

    <div class="sign-block">
      <div class="sign-col">
        <img src="${sigData}" class="sign-img" alt="Signature" />
        <div class="sign-line">
          <div class="sign-name">Francis Fiel Roble</div>
          <div class="sign-title">Owner, Huna Creatives</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p><strong>Huna Creatives</strong> &middot; Cebu, Philippines &middot; This document was generated electronically from payroll records and is valid without a physical signature.</p>
      <p>This document is confidential and intended solely for the named recipient and the party or institution for which it was requested. Unauthorized reproduction, alteration, or redistribution is prohibited.</p>
      <p>To verify the authenticity of this document, contact Huna Creatives at contact@hunacreatives.com quoting Reference No. ${ref}.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

// Quotation rendering — shared by send-quotation (inline email HTML) and
// accept-quotation (PDFShift print document).
//
// The money maths mirrors src/lib/quotation.ts. Deno edge functions can't
// import from the Vite app, so the two are kept deliberately identical --
// change one, change the other.

export type QuoteCurrency = 'PHP' | 'USD';

export interface QuoteLineItem {
  description: string;
  qty: number | string;
  unit_price: number | string;
  notes?: string;
}

export interface QuotePaymentMilestone {
  label: string;
  amount: number | string;
  due?: string;
}

export interface QuoteSection {
  heading: string;
  body: string;
}

export interface QuoteRecord {
  slug: string;
  client_name: string;
  project_title: string | null;
  tagline: string | null;
  accent_color: string;
  sections: QuoteSection[];
  line_items: QuoteLineItem[];
  currency: QuoteCurrency;
  discount: number | string;
  tax_rate: number | string;
  valid_until: string | null;
  terms: string | null;
  payment_schedule: QuotePaymentMilestone[];
  accepted_at?: string | null;
  accepted_by_name?: string | null;
}

const num = (v: number | string | null | undefined, fallback = 0): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  if (v == null || v === '') return fallback;
  const parsed = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const lineTotal = (i: QuoteLineItem) => num(i.qty, 1) * num(i.unit_price);

export function computeQuoteTotals(
  items: QuoteLineItem[],
  discount: number | string = 0,
  taxRate: number | string = 0,
) {
  const subtotal = (items ?? []).reduce((s, i) => s + lineTotal(i), 0);
  const discountAmount = Math.min(Math.max(num(discount), 0), subtotal);
  const taxable = subtotal - discountAmount;
  const tax = taxable * (num(taxRate) / 100);
  return { subtotal, discount: discountAmount, taxable, tax, total: taxable + tax };
}

export const fmtMoney = (amount: number, currency: QuoteCurrency) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);

export const fmtDate = (value: string | null | undefined) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : '';

/** Client-supplied strings land inside HTML we email -- escape every one. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The pricing table. Table-based and inline-styled with no flex/grid, because
 * this same markup has to survive Outlook in the email path.
 */
export function renderQuoteTable(quote: QuoteRecord): string {
  const accent = /^#[0-9a-f]{3,8}$/i.test(quote.accent_color) ? quote.accent_color : '#FF6B35';
  const currency = quote.currency === 'USD' ? 'USD' : 'PHP';
  const totals = computeQuoteTotals(quote.line_items, quote.discount, quote.tax_rate);

  const rows = (quote.line_items ?? []).map((item) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0efed;vertical-align:top">
        <p style="margin:0;font-size:14px;color:#1a1a1a;font-weight:500">${esc(item.description)}</p>
        ${item.notes ? `<p style="margin:3px 0 0;font-size:12px;color:#8a8a8a;line-height:1.5">${esc(item.notes)}</p>` : ''}
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f0efed;text-align:center;font-size:13px;color:#6b6b6b;white-space:nowrap">
        ${esc(num(item.qty, 1))}
      </td>
      <td style="padding:12px 0 12px 16px;border-bottom:1px solid #f0efed;text-align:right;font-size:14px;color:#1a1a1a;white-space:nowrap">
        ${fmtMoney(lineTotal(item), currency)}
      </td>
    </tr>`).join('');

  const totalRow = (label: string, value: string, strong = false) => `
    <tr>
      <td colspan="2" style="padding:${strong ? '14px' : '7px'} 0 ${strong ? '14px' : '7px'};text-align:right;font-size:${strong ? '14px' : '13px'};color:${strong ? '#1a1a1a' : '#6b6b6b'};font-weight:${strong ? '700' : '400'}${strong ? ';border-top:2px solid #1a1a1a' : ''}">
        ${esc(label)}
      </td>
      <td style="padding:${strong ? '14px' : '7px'} 0 ${strong ? '14px' : '7px'} 16px;text-align:right;font-size:${strong ? '18px' : '13px'};color:${strong ? accent : '#1a1a1a'};font-weight:${strong ? '700' : '500'};white-space:nowrap${strong ? ';border-top:2px solid #1a1a1a' : ''}">
        ${esc(value)}
      </td>
    </tr>`;

  const schedule = (quote.payment_schedule ?? []).length ? `
    <p style="margin:28px 0 10px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8a8a8a">Payment Schedule</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
      ${(quote.payment_schedule ?? []).map((m) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0efed;font-size:13px;color:#1a1a1a">
            ${esc(m.label)}${m.due ? `<span style="color:#8a8a8a"> &middot; ${esc(m.due)}</span>` : ''}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0efed;text-align:right;font-size:13px;color:#1a1a1a;font-weight:600;white-space:nowrap">
            ${fmtMoney(num(m.amount), currency)}
          </td>
        </tr>`).join('')}
    </table>` : '';

  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr>
        <td style="padding-bottom:8px;border-bottom:2px solid #1a1a1a;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8a8a8a">Item</td>
        <td style="padding-bottom:8px;border-bottom:2px solid #1a1a1a;text-align:center;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8a8a8a">Qty</td>
        <td style="padding-bottom:8px;padding-left:16px;border-bottom:2px solid #1a1a1a;text-align:right;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8a8a8a">Amount</td>
      </tr>
      ${rows}
      ${totals.discount > 0 ? totalRow('Subtotal', fmtMoney(totals.subtotal, currency)) : ''}
      ${totals.discount > 0 ? totalRow('Discount', `- ${fmtMoney(totals.discount, currency)}`) : ''}
      ${num(quote.tax_rate) > 0 ? totalRow(`Tax (${num(quote.tax_rate)}%)`, fmtMoney(totals.tax, currency)) : ''}
      ${totalRow('Total', fmtMoney(totals.total, currency), true)}
    </table>
    ${schedule}
    ${quote.valid_until ? `<p style="margin:20px 0 0;font-size:12px;color:#8a8a8a">Valid until <strong style="color:#1a1a1a">${esc(fmtDate(quote.valid_until))}</strong>.</p>` : ''}
    ${quote.terms ? `<p style="margin:10px 0 0;font-size:12px;color:#8a8a8a;line-height:1.7;white-space:pre-wrap">${esc(quote.terms)}</p>` : ''}`;
}

/** Prose sections, rendered above the pricing table. */
export function renderQuoteSections(quote: QuoteRecord): string {
  const accent = /^#[0-9a-f]{3,8}$/i.test(quote.accent_color) ? quote.accent_color : '#FF6B35';
  return (quote.sections ?? [])
    .filter((s) => (s.heading ?? '').trim() || (s.body ?? '').trim())
    .map((s, i) => `
      <div style="margin:0 0 26px">
        <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.16em;color:${accent}">${String(i + 1).padStart(2, '0')}</p>
        <h3 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:400;color:#1a1a1a">${esc(s.heading)}</h3>
        ${(s.body ?? '').split('\n\n').filter((p) => p.trim()).map((p) =>
          `<p style="margin:0 0 10px;font-size:14px;line-height:1.8;color:#5a5a5a">${esc(p.trim())}</p>`).join('')}
      </div>`).join('');
}

/**
 * Full standalone print document for PDFShift. Sent as the acceptance receipt,
 * so it carries the acceptance stamp when one exists.
 */
export function renderQuotePdf(quote: QuoteRecord): string {
  const accent = /^#[0-9a-f]{3,8}$/i.test(quote.accent_color) ? quote.accent_color : '#FF6B35';
  const title = quote.project_title || `Quotation for ${quote.client_name}`;

  const stamp = quote.accepted_at ? `
    <div style="margin:34px 0 0;padding:18px 20px;border:1px solid #d9ecd9;background:#f4faf4;border-radius:4px">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#2f7a3f">Accepted</p>
      <p style="margin:0;font-size:13px;color:#1a1a1a;line-height:1.7">
        Accepted by <strong>${esc(quote.accepted_by_name || quote.client_name)}</strong>
        on ${esc(new Date(quote.accepted_at).toLocaleString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila',
        }))} (Philippine time).
      </p>
      <p style="margin:6px 0 0;font-size:11px;color:#8a8a8a">
        Recorded electronically at hunacreatives.com/p/${esc(quote.slug)}
      </p>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; color:#1a1a1a; }
  .sheet { max-width: 680px; margin: 0 auto; }
</style></head>
<body>
  <div class="sheet">

    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
      style="border-bottom:3px solid ${accent};padding-bottom:16px;margin-bottom:28px">
      <tr>
        <td>
          <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png"
               alt="Huna Creatives" height="26" style="display:block;height:26px;width:auto;border:0">
        </td>
        <td align="right" style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${accent}">
          Quotation
        </td>
      </tr>
    </table>

    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a8a8a">
      Prepared for ${esc(quote.client_name)}
    </p>
    <h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;line-height:1.2;color:#1a1a1a">
      ${esc(title)}
    </h1>
    ${quote.tagline ? `<p style="margin:0 0 4px;font-size:14px;color:#6b6b6b;line-height:1.6">${esc(quote.tagline)}</p>` : ''}

    <div style="margin:30px 0 0">${renderQuoteSections(quote)}</div>

    <p style="margin:34px 0 12px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8a8a8a">Investment</p>
    ${renderQuoteTable(quote)}
    ${stamp}

    <p style="margin:36px 0 0;padding-top:14px;border-top:1px solid #ececec;font-size:11px;color:#a0a0a0">
      Huna Creatives &middot; Cebu City, Philippines &middot; contact@hunacreatives.com
    </p>
  </div>
</body></html>`;
}

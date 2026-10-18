// The quotation (or proposal) email. Pricing is rebuilt from the layout's blocks here;
// _shared/quotationTemplate.ts keeps the PDF version.
import { BLACK, esc, hunaEmail, itemsTable, label, MUTED, p, S } from '../_shared/emailLayout.ts';
import { computeQuoteTotals, fmtDate, fmtMoney, lineTotal, type QuoteRecord } from '../_shared/quotationTemplate.ts';

const CALENDLY = 'https://calendly.com/hunacreatives/30min';

const n = (v: number | string | null | undefined) => {
  const x = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(x) ? x : 0;
};

function sections(q: QuoteRecord): string {
  return (q.sections ?? [])
    .filter((s) => (s.heading ?? '').trim() || (s.body ?? '').trim())
    .map((s) => `<p style="${S.section}">${esc(s.heading)}</p>${(s.body ?? '').split('\n\n').filter((x) => x.trim()).map((x) => p(esc(x.trim()))).join('')}`)
    .join('');
}

function pricing(q: QuoteRecord): string {
  const currency = q.currency === 'USD' ? 'USD' : 'PHP';
  const t = computeQuoteTotals(q.line_items, q.discount, q.tax_rate);
  const rows = (q.line_items ?? []).map((i) => [
    `<strong style="font-weight:600;color:${BLACK}">${esc(i.description)}</strong>${i.optional ? ' <span style="color:${MUTED}">(optional)</span>' : ''}${i.notes ? `<br><span style="font-size:13px;color:${MUTED}">${esc(i.notes)}</span>` : ''}`,
    esc(n(i.qty) || 1),
    `${i.optional ? '+ ' : ''}${fmtMoney(lineTotal(i), currency)}`,
  ]);
  const totals: Array<[string, string]> = [];
  if (t.discount > 0) totals.push(['Subtotal', fmtMoney(t.subtotal, currency)], ['You save', `- ${fmtMoney(t.discount, currency)}`]);
  if (n(q.tax_rate) > 0) totals.push([`Tax (${n(q.tax_rate)}%)`, fmtMoney(t.tax, currency)]);
  totals.push(['Total', fmtMoney(t.total, currency)]);
  const optional = t.optionalTotal > 0
    ? p(`Optional add-ons, not in the total: <strong>+ ${fmtMoney(t.optionalTotal, currency)}</strong>`, { small: true, muted: true })
    : '';

  const schedule = (q.payment_schedule ?? []).length
    ? label('Payment schedule') + itemsTable({
        head: ['Milestone', 'Amount'],
        rows: q.payment_schedule.map((m) => [`${esc(m.label)}${m.due ? ` <span style="color:${MUTED}">· ${esc(m.due)}</span>` : ''}`, fmtMoney(n(m.amount), currency)]),
      })
    : '';

  return `<p style="${S.section}">Investment</p>`
    + itemsTable({ head: ['Item', 'Qty', 'Amount'], rows, align: ['left', 'right', 'right'], totals })
    + optional
    + schedule
    + (q.valid_until ? p(`Valid until <strong>${esc(fmtDate(q.valid_until))}</strong>.`, { small: true, muted: true }) : '')
    + (q.terms ? `<p style="${S.p};font-size:13px;line-height:1.6;color:${MUTED};white-space:pre-wrap">${esc(q.terms)}</p>` : '');
}

export interface QuotationEmail {
  quote: QuoteRecord;
  isProposal: boolean;
  intro?: string | null;
  quoteUrl: string;
  acceptUrl: string;
}

export function quotationEmail(e: QuotationEmail): string {
  const q = e.quote;
  const title = q.project_title || `${e.isProposal ? 'Proposal' : 'Quotation'} for ${q.client_name}`;
  const intro = e.intro ? `<p style="${S.p};white-space:pre-wrap">${esc(e.intro)}</p>` : '';
  const prepared = p(`${e.isProposal ? 'Proposal' : 'Quotation'} prepared for ${esc(q.client_name)}${q.tagline ? `. ${esc(q.tagline)}` : ''}`, { muted: true });

  if (e.isProposal) {
    // A proposal is narrative: the page it links to carries the detail and its own approve flow.
    return hunaEmail({
      title,
      heading: esc(title),
      body: prepared + (intro || p('We’ve put together a proposal for you. Have a read through. You can approve it right on the page when you’re ready.')),
      buttons: [{ label: 'View the proposal', url: e.quoteUrl }],
      note: 'Questions? Just reply to this email.',
    });
  }

  return hunaEmail({
    title,
    heading: esc(title),
    body: prepared + intro + sections(q) + pricing(q),
    buttons: [
      { label: 'Accept this quotation', url: e.acceptUrl },
      { label: 'Schedule a call', url: CALENDLY, tone: 'secondary' },
    ],
    note: 'Questions? Just reply to this email.',
  });
}

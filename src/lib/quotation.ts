// Quotation shape + money maths.
//
// Shared by the admin builder, the public /p/:slug page, and (mirrored in
// Deno) the PDF template in supabase/functions/_shared/quotationPdf.ts. If a
// total is computed in more than one place it will eventually disagree with
// itself, so every caller goes through computeQuoteTotals().

export type QuoteCurrency = 'PHP' | 'USD';

export type ProposalDocType = 'proposal' | 'quotation';

export type ProposalStatus =
  | 'draft' | 'published' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';

export interface QuoteLineItem {
  description: string;
  /** Blank/invalid parses to 1 -- a line with no quantity still bills once. */
  qty: number | string;
  unit_price: number | string;
  notes?: string;
}

export interface QuotePaymentMilestone {
  label: string;
  amount: number | string;
  due?: string;
}

export interface QuoteTotals {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
}

const num = (v: number | string | null | undefined, fallback = 0): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  if (v == null || v === '') return fallback;
  // Strip thousands separators and stray currency symbols before parsing --
  // account managers paste "1,250.00" and "₱1,250" from chat threads.
  const parsed = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const lineTotal = (item: QuoteLineItem): number =>
  num(item.qty, 1) * num(item.unit_price);

export function computeQuoteTotals(
  items: QuoteLineItem[],
  discount: number | string = 0,
  taxRate: number | string = 0,
): QuoteTotals {
  const subtotal = (items ?? []).reduce((sum, item) => sum + lineTotal(item), 0);
  // A discount larger than the subtotal would make the total negative and the
  // quote nonsensical; clamp instead of trusting the input.
  const discountAmount = Math.min(Math.max(num(discount), 0), subtotal);
  const taxable = subtotal - discountAmount;
  const tax = taxable * (num(taxRate) / 100);
  return {
    subtotal,
    discount: discountAmount,
    taxable,
    tax,
    total: taxable + tax,
  };
}

export function formatQuoteCurrency(amount: number, currency: QuoteCurrency): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/** Quote expiry is a plain date -- compare in PH local time, not UTC. */
export function isQuoteExpired(validUntil: string | null | undefined): boolean {
  if (!validUntil) return false;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  return validUntil < today;
}

export function formatQuoteDate(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

/** Milestones are advisory -- flag when they don't add up to the total. */
export function paymentScheduleGap(
  schedule: QuotePaymentMilestone[],
  total: number,
): number {
  const scheduled = (schedule ?? []).reduce((sum, m) => sum + num(m.amount), 0);
  return Number((total - scheduled).toFixed(2));
}

// Shared by Checkout, Confirmation and Account: turns checkout URL params into
// an order summary, checks promo codes, and tracks the demo guest's pass credits.

import type { Product, Retreat, Session } from '../lib/types';
import { CLASS, IMAGES, LOC, PRODUCT, TODAY_KEY, bookings, promos, retreats, sessions } from '../lib/data';
import { USD_RATE, addDays } from '../lib/format';

export const SESSION: Record<string, Session> = Object.fromEntries(sessions.map((s) => [s.id, s]));
export const retreatBySlug = (slug: string | null): Retreat | undefined => retreats.find((r) => r.slug === slug);
/** "Stillness Week by the Sea" → "Stillness Week"; "Salt Day: a one-day reset" → "Salt Day". */
export const shortRetreatTitle = (r: Retreat) => r.title.split(/:| in /)[0].trim();

/** Exact US$ for checkout totals (the guide elsewhere rounds to whole dollars). */
export const usdExact = (php: number) =>
  'US$' + (php / USD_RATE).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const ORDER_NUMBER = 'SS-1101';
export const LATE_CANCEL_HOURS = 12;

export interface CheckoutLine { label: string; amount: number }
export interface CheckoutOrder {
  kind: 'pass' | 'class' | 'retreat';
  title: string;
  image: string | null;
  product?: Product;
  session?: Session;
  retreat?: Retreat;
  lines: CheckoutLine[];
  subtotal: number;
  deposit: boolean;
  balanceDue?: string;             // YYYY-MM-DD
  cancellation: string;
  /** Confirmation link without payment params. */
  confirmPath: string;
}

/** Balance date for a deposit: 45 days before start, or a week from today if that has passed. */
export function balanceDueDate(r: Retreat): string {
  const due = addDays(r.startDate, -45);
  const floor = addDays(TODAY_KEY, 7);
  return due < floor ? floor : due;
}

export const DEPOSIT_RATE = 0.3;

export function buildOrder(params: URLSearchParams): CheckoutOrder | null {
  const productId = params.get('product');
  const sessionId = params.get('session');
  const slug = params.get('retreat');

  if (productId && PRODUCT[productId]) {
    const p = PRODUCT[productId];
    return {
      kind: 'pass', title: p.name, image: null, product: p,
      lines: [{ label: p.name, amount: p.price }], subtotal: p.price, deposit: false,
      cancellation: p.kind === 'monthly' || p.kind === 'online'
        ? 'Cancel or freeze anytime from your account. No refunds for part months.'
        : 'Unused passes can be refunded in full within 14 days of purchase.',
      confirmPath: `/confirmation?type=pass&product=${p.id}`,
    };
  }

  if (sessionId && SESSION[sessionId]) {
    const s = SESSION[sessionId];
    const c = CLASS[s.classTypeId];
    return {
      kind: 'class', title: c.name, image: s.locationId ? LOC[s.locationId].image : IMAGES.yoga, session: s,
      lines: [{ label: 'Drop-in', amount: PRODUCT.dropin.price }], subtotal: PRODUCT.dropin.price, deposit: false,
      cancellation: `Cancel up to ${LATE_CANCEL_HOURS} hours before class and the credit goes back to your account.`,
      confirmPath: `/confirmation?type=class&session=${s.id}`,
    };
  }

  const r = retreatBySlug(slug);
  if (r) {
    const guests = Math.max(1, Number(params.get('guests')) || 1);
    const room = r.rooms.find((x) => x.id === params.get('room')) ?? (r.kind === 'multi' ? r.rooms.find((x) => x.available > 0) : undefined);
    const addOnIds = (params.get('addons') ?? '').split(',').filter(Boolean);
    const lines: CheckoutLine[] = [];
    const each = room ? room.pricePerPerson : r.ticketPrice ?? 0;
    lines.push({ label: `${room ? room.name : 'Day ticket'}${guests > 1 ? ` × ${guests}` : ''}`, amount: each * guests });
    r.addOns.filter((a) => addOnIds.includes(a.id)).forEach((a) => lines.push({ label: `${a.name}${guests > 1 ? ` × ${guests}` : ''}`, amount: a.price * guests }));
    const subtotal = lines.reduce((t, l) => t + l.amount, 0);
    const deposit = r.kind === 'multi' && params.get('pay') !== 'full';
    const q = new URLSearchParams({ type: 'retreat', retreat: r.slug });
    if (room) q.set('room', room.id);
    if (addOnIds.length) q.set('addons', addOnIds.join(','));
    if (guests > 1) q.set('guests', String(guests));
    q.set('pay', deposit ? 'deposit' : 'full');
    return {
      kind: 'retreat', title: r.title, image: r.images[0], retreat: r, lines, subtotal, deposit,
      balanceDue: deposit ? balanceDueDate(r) : undefined,
      cancellation: r.cancellation, confirmPath: `/confirmation?${q.toString()}`,
    };
  }
  return null;
}

export type PromoResult = { code: string; percent: number } | { error: string };

export function checkPromo(raw: string): PromoResult | null {
  const code = raw.trim().toUpperCase();
  if (!code) return null;
  const p = promos.find((x) => x.code === code);
  if (!p) return { error: "That code isn't valid" };
  if (!p.active) return { error: 'That code has expired' };
  return { code: p.code, percent: p.percentOff };
}

// ---- Demo guest's pass credits ------------------------------------------------

/** Drop-ins paid at checkout this visit (they don't use a pass credit). Resets on refresh. */
export const paidDropins = new Set<string>();

const SEED_BOOKED = bookings.filter((b) => b.memberId === 'm4' && b.status === 'booked').map((b) => b.sessionId);
const SEED_CREDITS_LEFT = 6;

/** Classes cancelled inside the late-cancel window this visit: the credit stays used. */
export const lateCancelled = new Set<string>();

/** Credits left on w1 after this visit's bookings and cancellations. */
export function passCreditsLeft(myBookings: { sessionId: string; status: string }[]): number {
  const bookedNow = myBookings.filter((b) => b.status === 'booked').map((b) => b.sessionId);
  const refunded = SEED_BOOKED.filter((id) => !bookedNow.includes(id) && !lateCancelled.has(id)).length;
  const lateNew = [...lateCancelled].filter((id) => !SEED_BOOKED.includes(id) && !paidDropins.has(id) && !bookedNow.includes(id)).length;
  const used = bookedNow.filter((id) => !SEED_BOOKED.includes(id) && !paidDropins.has(id)).length + lateNew;
  return Math.max(0, Math.min(10, SEED_CREDITS_LEFT + refunded - used));
}

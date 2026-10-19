// Derived client facts for the admin Clients page (visits, spend, class history).
// Built once from the sample data so every reload shows the same numbers.

import { CLASS, PRODUCT, members, orders, retreatBookings, rosterFor, sessions, wallets } from '../lib/data';
import type { Member, Order, Session, Wallet } from '../lib/types';

const nowIso = new Date().toISOString();
const DAY = 86400000;
const hash = (str: string) => Math.abs([...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7));
const isRegular = (m: Member) => ['Regular', 'Monthly', 'Local'].some((t) => m.tags.includes(t));
const firstTimer = (m: Member) => m.tags.includes('First-timer');

/** memberId → in-person sessions they're on, newest first. A subset of each class roster, sized to how often they come. */
const ROSTER: Record<string, Session[]> = (() => {
  const out: Record<string, Session[]> = {};
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  sessions
    .filter((s) => s.status === 'scheduled' && s.locationId !== null)
    .forEach((s) => rosterFor(s).forEach(({ id }) => {
      const m = byId[id];
      const keep = firstTimer(m) ? 6 : isRegular(m) ? 34 : 16;
      if (hash(s.id + id) % 100 < keep) (out[id] ??= []).push(s);
    }));
  Object.entries(out).forEach(([id, list]) => {
    list.sort((a, b) => b.start.localeCompare(a.start));
    if (firstTimer(byId[id])) out[id] = list.filter((s) => s.start > nowIso).slice(-1).concat(list.filter((s) => s.start <= nowIso).slice(0, 2));
  });
  return out;
})();

export type ClassVisit = { session: Session; status: 'booked' | 'checked_in' | 'no_show' | 'late_cancel' };

/** Recent and upcoming classes for a member, newest first. */
export function classHistory(m: Member): ClassVisit[] {
  return (ROSTER[m.id] ?? []).map((s) => {
    if (s.start > nowIso) return { session: s, status: 'booked' as const };
    const h = hash(s.id + m.id) % 23;
    return { session: s, status: h === 0 ? 'no_show' as const : h === 1 ? 'late_cancel' as const : 'checked_in' as const };
  });
}

/** Visits before the sample window, from how long they've been around. */
const earlierVisits = (m: Member) => {
  if (firstTimer(m)) return 0;
  const days = Math.max(1, Math.round((Date.now() - new Date(m.joinedAt).getTime()) / DAY));
  return Math.round(days / (isRegular(m) ? 6 : 19)) + (hash(m.id) % 4);
};

const synthOrder = (m: Member, id: string, productId: string, at: string): Order => {
  const p = PRODUCT[productId];
  const local = m.country === 'Philippines';
  return {
    id, number: `SS-${1000 - (hash(id) % 400)}`, memberId: m.id, kind: 'pass',
    items: [{ label: p.name, amount: p.price }], total: p.price,
    chargedCurrency: local ? 'PHP' : 'USD', method: local ? 'gcash' : 'card',
    status: 'paid', createdAt: at, locationId: m.homeLocation,
  };
};

/** Real orders, the purchases behind their passes, and older purchases implied by their visits. Newest first. */
const PURCHASES: Record<string, Order[]> = Object.fromEntries(members.map((m) => {
  const real = orders.filter((o) => o.memberId === m.id);
  const fromWallets = wallets
    .filter((w) => w.memberId === m.id && !real.some((o) => o.items[0].label.startsWith(PRODUCT[w.productId].name)))
    .map((w) => synthOrder(m, `${w.id}-o`, w.productId, w.purchasedAt));
  const known = [...real, ...fromWallets];
  const oldest = known.reduce((min, o) => (o.createdAt < min ? o.createdAt : min), nowIso);
  const monthly = m.tags.includes('Monthly');
  const productId = monthly ? 'monthly' : earlierVisits(m) > 12 ? 'pack10' : 'pack5';
  const count = Math.min(5, Math.ceil(earlierVisits(m) / (monthly ? 12 : PRODUCT[productId].credits ?? 5)));
  const past = Array.from({ length: count }, (_, i) =>
    synthOrder(m, `${m.id}-h${i}`, productId, new Date(new Date(oldest).getTime() - (i + 1) * (monthly ? 30 : 41) * DAY).toISOString()));
  return [m.id, [...known, ...past].sort((a, b) => b.createdAt.localeCompare(a.createdAt))];
}));

export const purchasesFor = (m: Member) => PURCHASES[m.id];

export interface ClientStats {
  visits: number;
  lastVisit: string | null;        // ISO
  spend: number;                   // PHP, paid orders
  since: string;                   // ISO, first account activity
  activeWallets: Wallet[];
  retreatGuest: boolean;
}

const STATS: Record<string, ClientStats> = Object.fromEntries(members.map((m) => {
  const hist = classHistory(m).filter((v) => v.status === 'checked_in');
  const buys = PURCHASES[m.id];
  const since = buys.reduce((min, o) => (o.createdAt < min ? o.createdAt : min), m.joinedAt);
  return [m.id, {
    visits: firstTimer(m) ? Math.max(1, hist.length) : hist.length + earlierVisits(m),
    // Before the sample window when nothing recent is on a roster.
    lastVisit: hist[0]?.session.start ?? new Date(Date.now() - (8 + (hash(m.id) % 20)) * DAY).toISOString(),
    spend: buys.filter((o) => o.status === 'paid').reduce((s, o) => s + o.total, 0),
    since,
    activeWallets: wallets.filter((w) => w.memberId === m.id && (w.status === 'active' || w.status === 'frozen')),
    retreatGuest: retreatBookings.some((b) => b.memberId === m.id),
  }];
}));

export const statsFor = (id: string) => STATS[id];

export const isMemberPlan = (w: Wallet) => ['monthly', 'online'].includes(PRODUCT[w.productId]?.kind);
export const className = (s: Session) => CLASS[s.classTypeId]?.name ?? 'Class';

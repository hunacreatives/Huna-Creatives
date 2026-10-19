// Helpers shared by the guest Retreats list and RetreatDetail pages only.

import { retreatBookings } from '../lib/data';
import type { Retreat } from '../lib/types';

/** Places left: capacity minus guests on confirmed or pending bookings. */
export function placesLeft(r: Retreat): number {
  const taken = retreatBookings
    .filter((b) => b.retreatId === r.id && b.status !== 'cancelled')
    .reduce((n, b) => n + b.guests, 0);
  return Math.max(0, r.capacity - taken);
}

export const placesLabel = (n: number) => (n <= 0 ? 'Sold out' : n === 1 ? '1 place left' : `${n} places left`);

export function nightsOf(r: Retreat): number {
  const [ys, ms, ds] = r.startDate.split('-').map(Number);
  const [ye, me, de] = r.endDate.split('-').map(Number);
  return Math.round((Date.UTC(ye, me - 1, de) - Date.UTC(ys, ms - 1, ds)) / 86400000);
}

export function lengthLabel(r: Retreat): string {
  if (r.kind === 'day') return '1 day';
  const n = nightsOf(r);
  return `${n} night${n === 1 ? '' : 's'}`;
}

/** Day retreats: ticket price. Multi-day: lowest room still available (or lowest overall if all sold). */
export function fromPrice(r: Retreat): number {
  if (r.kind === 'day') return r.ticketPrice ?? 0;
  const open = r.rooms.filter((x) => x.available > 0);
  const pool = open.length ? open : r.rooms;
  return pool.length ? Math.min(...pool.map((x) => x.pricePerPerson)) : 0;
}

export const RETREAT_LEVEL: Record<string, string> = {
  'salt-day': 'All levels',
  'stillness-week': 'All levels',
  'breath-and-balance': 'Beginners and regulars',
};

/** Place line for a retreat location: "By the sea". */
export const PLACE: Record<string, string> = {
  beach: 'By the sea',
  town: 'Partner venue',
};

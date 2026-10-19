// Derived retreat numbers shared by the admin Retreats list and the manifest.

import { retreatBookings } from '../lib/data';
import type { Retreat, RetreatBooking } from '../lib/types';
import { addDays } from '../lib/format';

export const bookingsFor = (r: Retreat) => retreatBookings.filter((b) => b.retreatId === r.id && b.status !== 'cancelled');

/** Pre-arrival form is complete when the guest has told us what we need. Day retreats only need the waiver. */
export const formsComplete = (r: Retreat, b: RetreatBooking) =>
  r.kind === 'day' ? b.forms.waiver : Boolean(b.forms.waiver && b.forms.diet && b.forms.emergency);

export function retreatStats(r: Retreat) {
  const list = bookingsFor(r);
  const guests = list.reduce((s, b) => s + b.guests, 0);
  const total = list.reduce((s, b) => s + b.total, 0);
  const collected = list.reduce((s, b) => s + b.paid, 0);
  return {
    list, guests, total, collected, outstanding: total - collected,
    formsDone: list.filter((b) => formsComplete(r, b)).length,
  };
}

export const DEPOSIT_PCT = 30;
export const BALANCE_DAYS = 45;
export const balanceDueKey = (r: Retreat) => addDays(r.startDate, -BALANCE_DAYS);

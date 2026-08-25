/** Leave policy rules, in one place.
 *
 * The advance-notice window and the consecutive-day cap were previously
 * declared separately in the two contractor request forms, each alongside its
 * own hardcoded copy of the policy text — four places to keep in step, and they
 * had already drifted from each other once.
 */

/** Days of notice PTO is expected to carry. Filing inside this window is
 *  allowed, but it is flagged for HR as an exception rather than accepted
 *  silently. */
export const ADVANCE_DAYS = 14;

/** Consecutive PTO days allowed in a month. */
export const MAX_CONSECUTIVE = 3;

export const VL_LIMIT = 6;
export const SL_LIMIT = 4;

/** True when a leave starting on `startDate` was filed with less than the
 *  expected notice.
 *
 * Derived from dates the row already carries, so short-notice requests need no
 * column of their own and every request ever filed can be judged by the same
 * rule — including ones created before this existed.
 *
 * Both arguments are compared as calendar dates. `filedOn` accepts the ISO
 * timestamp Postgres returns for created_at.
 */
export function isShortNotice(
  filedOn: string | Date,
  startDate: string,
  windowDays: number = ADVANCE_DAYS,
): boolean {
  const filed = new Date(filedOn);
  const start = new Date(startDate);
  if (Number.isNaN(filed.getTime()) || Number.isNaN(start.getTime())) return false;

  const days = daysOfNotice(filed, start);
  return days < windowDays;
}

/** Whole days between filing and the first day of leave. Negative when the
 *  leave has already started. */
export function daysOfNotice(filedOn: string | Date, startDate: string | Date): number {
  const filed = new Date(filedOn);
  const start = new Date(startDate);
  const filedMidnight = Date.UTC(filed.getFullYear(), filed.getMonth(), filed.getDate());
  const startMidnight = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  return Math.round((startMidnight - filedMidnight) / 86_400_000);
}

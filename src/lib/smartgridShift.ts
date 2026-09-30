// SmartGrid callers work 11 PM–3 AM Manila, so one shift spans two calendar
// dates. A shift belongs to the Manila date it started on: anything before noon
// counts toward the previous day (same rule slack-attendance uses).

export type TrackerPeriod = 'shift' | 'week' | 'month' | 'all';

const MANILA = 'Asia/Manila';
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

export const shiftDayOf = (ts: string | number | Date) =>
  new Date(new Date(ts).getTime() - TWELVE_HOURS).toLocaleDateString('en-CA', { timeZone: MANILA });

export const currentShiftDay = () => shiftDayOf(Date.now());

// The most recent shift that has already started (shifts start 11 PM Manila).
// Between noon and 11 PM this is still last night's shift, so reports and the
// tracker don't default to a shift nobody has worked yet.
export const latestShiftDay = () =>
  new Date(Date.now() - 23 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: MANILA });

// Shift D runs 11 PM on D to 3 AM on D+1, Manila (UTC+8, no DST)
export const shiftEndsAt = (day: string) => new Date(`${addDays(day, 1)}T03:00:00+08:00`).getTime();

export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const weekday = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sun

export const weekStart = (day: string) => addDays(day, -((weekday(day) + 6) % 7)); // Monday

const fmtDay = (day: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });

export interface PeriodRange {
  start: string | null; // inclusive shift day, null = open-ended
  end: string | null;
  label: string;
}

export function periodRange(period: TrackerPeriod, day: string): PeriodRange {
  if (period === 'shift') {
    return { start: day, end: day, label: `Shift · ${fmtDay(day, { weekday: 'short', month: 'short', day: 'numeric' })}, 11 PM – 3 AM` };
  }
  if (period === 'week') {
    const start = weekStart(day);
    const end = addDays(start, 6);
    return {
      start,
      end,
      label: `Week · ${fmtDay(start, { weekday: 'short', month: 'short', day: 'numeric' })} – ${fmtDay(end, { weekday: 'short', month: 'short', day: 'numeric' })}`,
    };
  }
  if (period === 'month') {
    const start = `${day.slice(0, 7)}-01`;
    const next = new Date(`${start}T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const end = addDays(next.toISOString().slice(0, 10), -1);
    return { start, end, label: fmtDay(start, { month: 'long', year: 'numeric' }) };
  }
  return { start: null, end: null, label: 'All time' };
}

export const inRange = (day: string, range: PeriodRange) =>
  (range.start === null || day >= range.start) && (range.end === null || day <= range.end);

export function stepPeriod(period: TrackerPeriod, day: string, dir: 1 | -1) {
  if (period === 'week') return addDays(day, 7 * dir);
  if (period === 'month') {
    const d = new Date(`${day.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + dir);
    return d.toISOString().slice(0, 10);
  }
  return addDays(day, dir);
}

export const formatManilaTime = (ts: string) =>
  new Date(ts).toLocaleTimeString('en-US', { timeZone: MANILA, hour: 'numeric', minute: '2-digit' });

export const formatManilaDateTime = (ts: string) =>
  new Date(ts).toLocaleString('en-US', { timeZone: MANILA, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const formatShiftDay = (day: string) => fmtDay(day, { weekday: 'short', month: 'short', day: 'numeric' });

// Formatting for the demo. Studio times are always El Nido time (Asia/Manila,
// UTC+8, no daylight saving); "your time" uses the viewer's timezone.

export const STUDIO_TZ = 'Asia/Manila';
export const USD_RATE = 58; // PHP per USD, only for the "≈ US$" guide

export const peso = (n: number) => '₱' + Math.round(n).toLocaleString('en-PH');
export const usd = (php: number) => 'US$' + Math.round(php / USD_RATE).toLocaleString('en-US');
/** "₱6,000 · ≈ US$103" */
export const pesoWithUsd = (php: number) => `${peso(php)} · ≈ ${usd(php)}`;

/** YYYY-MM-DD in studio time for an instant (defaults to now). */
export function studioDateKey(d: Date | string = new Date()): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('en-CA', { timeZone: STUDIO_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Add days to a YYYY-MM-DD key. */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** ISO instant for a studio-local date + "HH:MM". */
export const studioInstant = (key: string, hhmm: string) => `${key}T${hhmm}:00+08:00`;

/** "7:00 am" in studio time. */
export function studioTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: STUDIO_TZ, hour: 'numeric', minute: '2-digit' })
    .format(new Date(iso)).toLowerCase().replace(' ', ' ');
}

/** "3:00 pm Mon" in the viewer's timezone (adds the weekday when it differs from the studio's). */
export function yourTime(iso: string, tz: string): string {
  const d = new Date(iso);
  const time = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })
    .format(d).toLowerCase().replace(' ', ' ');
  const wk = (zone: string) => new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short' }).format(d);
  return wk(tz) === wk(STUDIO_TZ) ? time : `${time} ${wk(tz)}`;
}

/** Short city name for a timezone: "Australia/Sydney" → "Sydney". */
export const tzCity = (tz: string) => tz.split('/').pop()!.replace(/_/g, ' ');

/** "Mon 21 Oct" for a YYYY-MM-DD key. */
export function dayLabel(key: string, opts: { weekday?: 'short' | 'long'; month?: 'short' | 'long' } = {}): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: opts.weekday ?? 'short', day: 'numeric', month: opts.month ?? 'short' })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

/** "21 Oct 2026" for a YYYY-MM-DD key or ISO instant. */
export function dateLabel(keyOrIso: string): string {
  const key = keyOrIso.length > 10 ? studioDateKey(keyOrIso) : keyOrIso;
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

/** "12–17 Nov 2026" */
export function rangeLabel(start: string, end: string): string {
  if (start === end) return dateLabel(start);
  const [ys, ms, ds] = start.split('-').map(Number);
  const [ye, me, de] = end.split('-').map(Number);
  const mon = (y: number, m: number) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'short' }).format(new Date(Date.UTC(y, m - 1, 1)));
  if (ys === ye && ms === me) return `${ds}–${de} ${mon(ye, me)} ${ye}`;
  return `${ds} ${mon(ys, ms)} – ${de} ${mon(ye, me)} ${ye}`;
}

/** "Today", "Tomorrow" or "Wed 23 Oct". */
export function relativeDay(key: string): string {
  const today = studioDateKey();
  if (key === today) return 'Today';
  if (key === addDays(today, 1)) return 'Tomorrow';
  if (key === addDays(today, -1)) return 'Yesterday';
  return dayLabel(key);
}

/** "2h ago", "3d ago" */
export function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export const pct = (n: number) => `${Math.round(n * 100)}%`;

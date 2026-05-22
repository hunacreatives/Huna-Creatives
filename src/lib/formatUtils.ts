export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function getPeriods(): { label: string; start: string; end: string }[] {
  const periods: { label: string; start: string; end: string }[] = [];
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

  let year = 2026;
  let month = 0;
  let firstHalf = true;

  while (true) {
    const start = firstHalf
      ? `${year}-${pad(month + 1)}-01`
      : `${year}-${pad(month + 1)}-16`;
    if (new Date(start) > now) break;

    const endDay = firstHalf ? 15 : lastDay(year, month);
    const end = `${year}-${pad(month + 1)}-${pad(endDay)}`;
    const label = firstHalf
      ? `${MONTHS[month]} 1–15, ${year}`
      : `${MONTHS[month]} 16–${endDay}, ${year}`;

    periods.push({ label, start, end });

    if (firstHalf) {
      firstHalf = false;
    } else {
      firstHalf = true;
      month += 1;
      if (month > 11) { month = 0; year += 1; }
    }
  }
  return periods;
}

export function fmtCurrency(val: number, currency = 'PHP') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(val);
}

export function fmtPHP(val: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(val);
}

export function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

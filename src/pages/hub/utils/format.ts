// Peso/date formatting helpers shared across hub pages.
export const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtRate = (rate: number | null, currency?: string | null) =>
  rate == null ? '—' : currency === 'USD' ? `$${rate.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}/mo` : `${fmt(rate)}/mo`;
export const fmtDate = (d: string | null | undefined, fallback = '—') => {
  if (!d) return fallback;
  const s = d.length === 10 ? d + 'T00:00:00' : d;
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? fallback : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

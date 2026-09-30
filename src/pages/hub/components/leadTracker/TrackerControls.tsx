import { useEffect, useState, type ReactNode } from 'react';
import { latestShiftDay, periodRange, stepPeriod, type TrackerPeriod } from '@/lib/smartgridShift';

const PERIODS: { value: TrackerPeriod; label: string }[] = [
  { value: 'shift', label: 'Shift' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All time' },
];

interface Props {
  period: TrackerPeriod;
  day: string;
  onPeriod: (p: TrackerPeriod) => void;
  onDay: (day: string) => void;
  live: boolean;
  lastUpdated: number | null;
  onRefresh: () => void;
  actions?: ReactNode;
}

function useSecondsSince(ts: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  return ts ? Math.max(0, Math.round((now - ts) / 1000)) : null;
}

const ago = (s: number) => (s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`);

export default function TrackerControls({ period, day, onPeriod, onDay, live, lastUpdated, onRefresh, actions }: Props) {
  const since = useSecondsSince(lastUpdated);
  const today = latestShiftDay();
  const range = periodRange(period, day);
  const isCurrent = period === 'all' || (range.start !== null && range.end !== null && today >= range.start && today <= range.end);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => onPeriod(p.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              period === p.value ? 'bg-sky-500 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period !== 'all' && (
        <div className="inline-flex items-center gap-1">
          <button onClick={() => onDay(stepPeriod(period, day, -1))} className="w-7 h-7 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50" aria-label="Previous">
            <i className="ri-arrow-left-s-line" />
          </button>
          <input
            type="date"
            value={day}
            max={today}
            onChange={e => e.target.value && onDay(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
          <button
            onClick={() => onDay(stepPeriod(period, day, 1))}
            disabled={isCurrent}
            className="w-7 h-7 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            aria-label="Next"
          >
            <i className="ri-arrow-right-s-line" />
          </button>
          {!isCurrent && (
            <button onClick={() => onDay(today)} className="ml-1 px-2.5 py-1 text-xs font-medium text-sky-700 bg-sky-50 rounded-md hover:bg-sky-100">
              Current {period === 'shift' ? 'shift' : period}
            </button>
          )}
        </div>
      )}

      <p className="text-sm text-gray-600">{range.label}</p>

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
          title={`${live ? 'Updates live' : 'Refreshes every 2 minutes'}${since !== null ? ` · updated ${ago(since)}` : ''} · click to reload`}
        >
          <span className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-500' : 'bg-gray-300'}`} />
          {live ? 'Live' : 'Auto'}
        </button>
        {actions}
      </div>
    </div>
  );
}

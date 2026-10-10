import type { pipeline } from './metrics';

type Pipeline = ReturnType<typeof pipeline>;

const PARTS: { key: keyof Omit<Pipeline, 'total' | 'retired'>; label: string; bar: string }[] = [
  { key: 'complete', label: 'Complete', bar: 'bg-emerald-500' },
  { key: 'callbacks', label: 'Callbacks scheduled', bar: 'bg-amber-400' },
  { key: 'retry', label: 'Called, retry later', bar: 'bg-sky-300' },
  { key: 'outOfAttempts', label: 'Out of attempts', bar: 'bg-rose-300' },
  { key: 'inQueue', label: "In a caller's queue", bar: 'bg-sky-600' },
  { key: 'neverCalled', label: 'Not called yet', bar: 'bg-gray-200' },
];

export default function PipelineCard({ p }: { p: Pipeline }) {
  const worked = p.total - p.neverCalled - p.inQueue;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Whole list</p>
        <p className="text-xs text-gray-500">
          <b className="text-gray-800">{worked.toLocaleString()}</b> of {p.total.toLocaleString()} leads worked ({p.total ? Math.round((worked / p.total) * 100) : 0}%)
        </p>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
        {PARTS.map(part => p[part.key] > 0 && (
          <div key={part.key} className={part.bar} style={{ width: `${(p[part.key] / Math.max(p.total, 1)) * 100}%` }} title={`${part.label}: ${p[part.key]}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {PARTS.map(part => (
          <div key={part.key} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-sm ${part.bar}`} />
            <span className="text-[11px] text-gray-600">{part.label}</span>
            <span className="text-[11px] font-semibold text-gray-800 ml-auto">{p[part.key].toLocaleString()}</span>
          </div>
        ))}
      </div>
      {p.retired > 0 && (
        <p className="text-[11px] text-gray-400">{p.retired.toLocaleString()} retired leads (under 30 rooms) aren't counted. Filter All leads by "Retired" to see them.</p>
      )}
    </div>
  );
}

import type { LeadList, TrackerLead } from './types';
import { listPipeline } from './metrics';

interface Props {
  lists: LeadList[];
  leads: TrackerLead[];
  onMove: (id: number, direction: -1 | 1) => void;
  onPause: (id: number, paused: boolean) => void;
}

// Calling order. Callers get the first list that isn't paused and still has leads.
export default function ListsCard({ lists, leads, onMove, onPause }: Props) {
  const rows = listPipeline(lists, leads);
  const nowId = rows.find(r => !r.list.paused && r.remaining > 0)?.list.id;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Calling order</p>
        <p className="text-[11px] text-gray-400">Pause a list to move callers on to the next one</p>
      </div>
      <div className="divide-y divide-gray-50">
        {rows.map((r, i) => (
          <div key={r.list.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2 ${r.list.paused ? 'opacity-60' : ''}`}>
            <div className="flex flex-col -my-1">
              <button onClick={() => onMove(r.list.id, -1)} disabled={i === 0} aria-label={`Move ${r.list.name} up`} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none"><i className="ri-arrow-up-s-line" /></button>
              <button onClick={() => onMove(r.list.id, 1)} disabled={i === rows.length - 1} aria-label={`Move ${r.list.name} down`} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none"><i className="ri-arrow-down-s-line" /></button>
            </div>
            <div className="w-36 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{r.list.name}</p>
              <p className="text-[11px]">
                {r.list.id === nowId ? <span className="font-semibold text-sky-700">Calling now</span>
                  : r.list.paused ? <span className="text-gray-500">Paused</span>
                  : r.remaining === 0 ? <span className="text-emerald-700">Finished</span>
                  : <span className="text-gray-400">Up next</span>}
              </p>
            </div>
            <div className="flex-1 min-w-40">
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-sky-500" style={{ width: `${r.total ? (r.called / r.total) * 100 : 0}%` }} />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {r.called.toLocaleString()} of {r.total.toLocaleString()} called · {r.remaining.toLocaleString()} left
                {r.results > 0 ? ` · ${r.results.toLocaleString()} meetings or bills` : ''}
                {r.held > 0 ? ` · ${r.held.toLocaleString()} held back` : ''}
              </p>
            </div>
            <button onClick={() => onPause(r.list.id, !r.list.paused)} className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50">
              {r.list.paused ? 'Resume' : 'Pause'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

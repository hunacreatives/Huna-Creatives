import { useMemo, useState } from 'react';
import { formatManilaDateTime, inRange, shiftDayOf, type PeriodRange } from '@/lib/smartgridShift';
import { isCall } from './metrics';
import { OUTCOME_LABEL, type CallLogEntry, type Caller, type TrackerLead } from './types';

interface Props {
  callLog: CallLogEntry[];
  leads: TrackerLead[];
  callers: Caller[];
  range: PeriodRange;
  onOpenLead: (lead: TrackerLead) => void;
}

const OUTCOME_TONE: Record<string, string> = {
  interested: 'bg-emerald-100 text-emerald-700',
  callback: 'bg-amber-100 text-amber-700',
  not_interested: 'bg-rose-100 text-rose-700',
  voicemail: 'bg-gray-100 text-gray-600',
  no_answer: 'bg-gray-100 text-gray-600',
};

const PAGE = 100;

export default function CallLogTab({ callLog, leads, callers, range, onOpenLead }: Props) {
  const [callerId, setCallerId] = useState<string>('all');
  const [limit, setLimit] = useState(PAGE);
  const leadById = useMemo(() => new Map(leads.map(l => [l.id, l])), [leads]);
  const names = useMemo(() => new Map(callers.map(c => [c.id, c.name])), [callers]);

  const entries = useMemo(
    () => callLog
      .filter(e => isCall(e) && inRange(shiftDayOf(e.created_at), range) && (callerId === 'all' || e.user_id === callerId))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [callLog, range, callerId],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select value={callerId} onChange={e => { setCallerId(e.target.value); setLimit(PAGE); }} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
          <option value="all">All callers</option>
          {callers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-xs text-gray-500">{entries.length} calls</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-gray-400 py-6 text-center">No calls in this period.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500">
                <th className="text-left font-medium px-4 py-2.5 whitespace-nowrap">Time</th>
                <th className="text-left font-medium px-3 py-2.5">Caller</th>
                <th className="text-left font-medium px-3 py-2.5">Hotel</th>
                <th className="text-left font-medium px-3 py-2.5">Outcome</th>
                <th className="text-left font-medium px-4 py-2.5">Email</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, limit).map(e => {
                const lead = leadById.get(String(e.entity_id));
                const outcome = e.meta?.outcome || '';
                return (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer align-top" onClick={() => lead && onOpenLead(lead)}>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatManilaDateTime(e.created_at)}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{names.get(e.user_id || '') || 'Former caller'}</td>
                    <td className="px-3 py-2 min-w-[12rem]">
                      <p className="font-medium text-gray-800">{lead?.account_name || '(deleted lead)'}</p>
                      {e.meta?.notes && <p className="text-xs text-gray-400 truncate max-w-md" title={e.meta.notes}>{e.meta.notes}</p>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${OUTCOME_TONE[outcome] || 'bg-gray-100 text-gray-600'}`}>
                        {OUTCOME_LABEL[outcome] || outcome || '–'}{outcome === 'callback' && e.meta?.callback_date ? ` · ${e.meta.callback_date.slice(5).replace('-', '/')}` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sky-700">{e.meta?.email_found ? lead?.email || 'Yes' : <span className="text-gray-300">–</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {entries.length > limit && (
            <button onClick={() => setLimit(l => l + PAGE)} className="w-full py-2 text-xs font-medium text-sky-700 bg-gray-50 hover:bg-gray-100">
              Show more ({entries.length - limit} left)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

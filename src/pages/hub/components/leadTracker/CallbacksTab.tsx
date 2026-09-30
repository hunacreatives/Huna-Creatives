import { useMemo } from 'react';
import { currentShiftDay, formatShiftDay } from '@/lib/smartgridShift';
import { GOAL_LABEL, type Caller, type TrackerLead } from './types';

interface Props {
  leads: TrackerLead[];
  callers: Caller[];
  onOpenLead: (lead: TrackerLead) => void;
}

export default function CallbacksTab({ leads, callers, onOpenLead }: Props) {
  const names = useMemo(() => new Map(callers.map(c => [c.id, c.name])), [callers]);
  const today = currentShiftDay();

  const groups = useMemo(() => {
    const cbs = leads
      .filter(l => l.status === 'callback_pending')
      .sort((a, b) => (a.callback_date || '9999').localeCompare(b.callback_date || '9999') || (a.callback_time || '').localeCompare(b.callback_time || ''));
    return [
      { title: 'Overdue', tone: 'text-rose-600', items: cbs.filter(l => l.callback_date && l.callback_date < today) },
      { title: 'Due this shift', tone: 'text-amber-700', items: cbs.filter(l => l.callback_date === today) },
      { title: 'Upcoming', tone: 'text-gray-700', items: cbs.filter(l => l.callback_date && l.callback_date > today) },
      { title: 'No date set', tone: 'text-gray-500', items: cbs.filter(l => !l.callback_date) },
    ].filter(g => g.items.length > 0);
  }, [leads, today]);

  if (groups.length === 0) return <p className="text-xs text-gray-400 py-6 text-center">No callbacks scheduled.</p>;

  return (
    <div className="space-y-4">
      {groups.map(g => (
        <div key={g.title}>
          <p className={`text-xs font-semibold mb-1.5 ${g.tone}`}>{g.title} ({g.items.length})</p>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {g.items.map(l => (
              <button key={l.id} onClick={() => onOpenLead(l)} className="w-full text-left px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-gray-50">
                <span className="text-xs font-medium text-gray-800 flex-1 min-w-40">{l.account_name}</span>
                <span className="text-[11px] text-gray-500">{names.get(l.assigned_to || '') || 'Unassigned'}</span>
                <span className="text-[11px] text-gray-700">
                  {l.callback_date ? formatShiftDay(l.callback_date) : '–'}{l.callback_time ? ` · ${l.callback_time.slice(0, 5)}` : ''}
                </span>
                {l.next_call_goal && <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-700">{GOAL_LABEL[l.next_call_goal]}</span>}
                {l.locked_by && <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-100 text-sky-700">In queue now</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

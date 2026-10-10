import { Fragment, useState } from 'react';
import { formatManilaTime } from '@/lib/smartgridShift';
import { pct, type CallerQueue, type CallerStats, type QueueLeadRow, type Totals } from './metrics';
import { GOAL_LABEL, OUTCOME_LABEL, type TrackerLead } from './types';
import RoomsBadge from './RoomsBadge';

interface Props {
  rows: CallerStats[];
  totals: Totals;
  queues: CallerQueue[]; // empty unless a single shift is selected
  isCurrentShift: boolean;
  onOpenLead: (lead: TrackerLead) => void;
  onRelease: (callerId: string, name: string, count: number) => void;
}

const COLS: { label: string; hint: string }[] = [
  { label: 'Calls', hint: 'Every saved call outcome (skips not counted)' },
  { label: 'Successful', hint: 'Leads where an email was captured on the call' },
  { label: 'Rate', hint: 'Successful ÷ calls' },
  { label: 'Callbacks', hint: 'Leads given a callback date' },
  { label: 'Meetings', hint: 'Meetings booked with the decision maker' },
  { label: 'Bills', hint: 'Utility bills received (marked by admin)' },
];

function StateChip({ row }: { row: QueueLeadRow }) {
  if (row.state === 'waiting') return <span className="text-[11px] text-gray-400">Not called yet</span>;
  if (row.state === 'callback_due') {
    return <span className="text-[11px] text-amber-700">Callback due{row.lead.next_call_goal ? ` · ${GOAL_LABEL[row.lead.next_call_goal]}` : ''}</span>;
  }
  return (
    <span className="text-[11px] text-gray-600">
      {OUTCOME_LABEL[row.outcome || ''] || row.outcome}{row.emailFound ? ' · email' : ''} · {formatManilaTime(row.calledAt!)}
    </span>
  );
}

export default function CallerTable({ rows, totals, queues, isCurrentShift, onOpenLead, onRelease }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const queueFor = new Map(queues.map(q => [q.caller.id, q]));
  const expandable = queues.length > 0;

  // Each metric keeps one color everywhere; zeros fade so real numbers stand out
  const TONES = ['text-gray-900', 'text-emerald-600', '', 'text-amber-600', 'text-violet-600', 'text-sky-600'];
  const num = (v: number, i: number, bold = false) => (
    <span className={`${v === 0 ? 'text-gray-300' : TONES[i]} ${bold || i === 1 ? 'font-semibold' : ''}`}>{v}</span>
  );
  const rate = (emails: number, calls: number) => {
    if (!calls) return <span className="text-gray-300">–</span>;
    const r = emails / calls;
    const tone = r >= 0.5 ? 'bg-emerald-50 text-emerald-700' : r >= 0.25 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700';
    return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${tone}`}>{pct(emails, calls)}</span>;
  };
  const cells = (s: Omit<Totals, 'lastCall'>, bold = false) => [
    num(s.calls, 0, bold), num(s.emails, 1, bold), rate(s.emails, s.calls), num(s.callbacks, 3, bold), num(s.meetings, 4, bold), num(s.bills, 5, bold),
  ];
  const queueBadge = (left: number, called: number, callbacksDue: number) => {
    const total = left + called;
    const done = total ? Math.round((called / total) * 100) : 0;
    return (
      <div className="inline-flex flex-col items-end">
        <div className="flex items-center gap-2.5" title={`${called} of ${total} called (${done}%)`}>
          <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${left <= 5 ? 'bg-orange-400' : 'bg-sky-500'}`} style={{ width: `${done}%` }} />
          </div>
          <span className={`w-7 text-right text-base font-bold ${left === 0 ? 'text-gray-300' : left <= 5 ? 'text-orange-600' : 'text-sky-700'}`}>{left}</span>
        </div>
        {callbacksDue > 0 && <span className="text-[11px] text-amber-700 mt-0.5">+{callbacksDue} callback{callbacksDue === 1 ? '' : 's'} due</span>}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs text-gray-500">
            <th className="text-left font-medium px-4 py-2.5">Caller</th>
            {COLS.map(c => <th key={c.label} className="text-right font-medium px-3 py-2.5 cursor-help" title={c.hint}>{c.label}</th>)}
            {isCurrentShift && <th className="text-right font-medium px-4 py-2.5 cursor-help" title="Leads they hold that aren't called yet">Left in queue</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const q = queueFor.get(r.callerId);
            const isOpen = open === r.callerId;
            return (
              <Fragment key={r.callerId}>
                <tr
                  onClick={() => expandable && setOpen(isOpen ? null : r.callerId)}
                  className={`border-b border-gray-50 ${expandable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                >
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {expandable && <i className={`ri-arrow-${isOpen ? 'down' : 'right'}-s-line text-gray-400 mr-1`} />}
                    {r.name}
                  </td>
                  {cells(r).map((v, i) => <td key={i} className="px-3 py-2.5 text-right tabular-nums">{v}</td>)}
                  {isCurrentShift && (
                    <td className="px-4 py-2 text-right tabular-nums">{queueBadge(q?.holding ?? 0, q?.called ?? 0, q?.callbacksDue ?? 0)}</td>
                  )}
                </tr>
                {isOpen && q && (
                  <tr className="border-b border-gray-50 bg-gray-50/60">
                    <td colSpan={COLS.length + (isCurrentShift ? 2 : 1)} className="px-4 py-2">
                      {isCurrentShift && q.holding > 0 && (
                        <div className="flex justify-end pb-1.5">
                          <button
                            onClick={() => onRelease(r.callerId, r.name, q.holding)}
                            className="text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:underline"
                            title="Send their uncalled leads back to the shared pool (callbacks stay theirs)"
                          >
                            Release {q.holding} uncalled lead{q.holding === 1 ? '' : 's'}
                          </button>
                        </div>
                      )}
                      {q.rows.length === 0 ? (
                        <p className="text-xs text-gray-400 py-1">Nothing yet.</p>
                      ) : (
                        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                          {q.rows.map(row => (
                            <button key={`${row.state}-${row.lead.id}`} onClick={() => onOpenLead(row.lead)}
                              className="w-full flex items-center gap-3 py-1.5 text-left hover:text-sky-700">
                              <span className="flex-1 min-w-0 truncate text-xs text-gray-800">{row.lead.account_name}</span>
                              <RoomsBadge rooms={row.lead.number_of_rooms} />
                              <StateChip row={row} />
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          <tr className="bg-gray-50 border-t border-gray-200 font-semibold text-gray-900">
            <td className="px-4 py-2.5">Team</td>
            {cells(totals, true).map((v, i) => <td key={i} className="px-3 py-2.5 text-right tabular-nums">{v}</td>)}
            {isCurrentShift && (
              <td className="px-4 py-2 text-right tabular-nums">
                {queueBadge(queues.reduce((n, q) => n + q.holding, 0), queues.reduce((n, q) => n + q.called, 0), queues.reduce((n, q) => n + q.callbacksDue, 0))}
              </td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

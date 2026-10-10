import { useMemo, useState } from 'react';
import { ROOM_SIZES, leadStatusLabel, roomSize, type Caller, type RoomSize, type TrackerLead } from './types';
import RoomsBadge from './RoomsBadge';

interface Props {
  leads: TrackerLead[];
  callers: Caller[];
  onOpenLead: (lead: TrackerLead) => void;
}

type StatusFilter = 'all' | 'Not called' | 'In a queue' | 'Retry later' | 'Callback' | 'Complete' | 'Out of attempts' | 'Retired';
const STATUS_OPTIONS: StatusFilter[] = ['all', 'Not called', 'In a queue', 'Retry later', 'Callback', 'Complete', 'Out of attempts', 'Retired'];
const PAGE = 50;

export default function AllLeadsTab({ leads, callers, onOpenLead }: Props) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [callerId, setCallerId] = useState('all');
  const [followUp, setFollowUp] = useState<'all' | 'not_sent' | 'sent'>('all');
  const [size, setSize] = useState<'all' | RoomSize>('all');
  const [sort, setSort] = useState<'name' | 'rooms'>('name');
  const [page, setPage] = useState(0);
  const names = useMemo(() => new Map(callers.map(c => [c.id, c.name])), [callers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads
      // Retired leads only show when asked for
      .filter(l => (status === 'all' ? !l.retired_at : leadStatusLabel(l).label === status))
      .filter(l => callerId === 'all' || l.assigned_to === callerId || l.locked_by === callerId || l.last_caller_id === callerId)
      .filter(l => followUp === 'all' || (!!l.email && (followUp === 'sent' ? l.follow_up_email_sent : !l.follow_up_email_sent)))
      .filter(l => size === 'all' || roomSize(l.number_of_rooms)?.value === size)
      .filter(l => !q || l.account_name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q)
        || l.phone?.includes(q) || l.primary_contact?.toLowerCase().includes(q))
      .sort((a, b) => (sort === 'rooms' ? (b.number_of_rooms ?? -1) - (a.number_of_rooms ?? -1) : 0)
        || a.account_name.localeCompare(b.account_name));
  }, [leads, search, status, callerId, followUp, size, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search account, contact, email or phone…"
          className="flex-1 min-w-48 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
        <select value={status} onChange={e => { setStatus(e.target.value as StatusFilter); setPage(0); }} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
        </select>
        <select value={callerId} onChange={e => { setCallerId(e.target.value); setPage(0); }} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
          <option value="all">Any caller</option>
          {callers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={followUp} onChange={e => { setFollowUp(e.target.value as typeof followUp); setPage(0); }} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
          <option value="all">All follow-ups</option>
          <option value="not_sent">Follow-up not sent</option>
          <option value="sent">Follow-up sent</option>
        </select>
        <select value={size} onChange={e => { setSize(e.target.value as typeof size); setPage(0); }} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
          <option value="all">Any size</option>
          {ROOM_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={sort} onChange={e => { setSort(e.target.value as typeof sort); setPage(0); }} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
          <option value="name">Sort: A–Z</option>
          <option value="rooms">Sort: Most rooms</option>
        </select>
      </div>
      <p className="text-xs text-gray-500">{filtered.length.toLocaleString()} leads</p>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600">
              <th className="text-left px-4 py-2.5 font-semibold">Account</th>
              <th className="text-left px-3 py-2.5 font-semibold">Rooms</th>
              <th className="text-left px-3 py-2.5 font-semibold">Contact</th>
              <th className="text-left px-3 py-2.5 font-semibold">Phone</th>
              <th className="text-left px-3 py-2.5 font-semibold">Email</th>
              <th className="text-left px-3 py-2.5 font-semibold">Status</th>
              <th className="text-right px-3 py-2.5 font-semibold">Attempts</th>
              <th className="text-left px-4 py-2.5 font-semibold">Caller</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(current * PAGE, current * PAGE + PAGE).map(l => {
              const s = leadStatusLabel(l);
              const caller = l.locked_by || l.assigned_to || l.last_caller_id;
              return (
                <tr key={l.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => onOpenLead(l)}>
                  <td className="px-4 py-2 font-medium text-gray-800">{l.account_name}</td>
                  <td className="px-3 py-2">{l.number_of_rooms == null ? <span className="text-gray-300">–</span> : <RoomsBadge rooms={l.number_of_rooms} />}</td>
                  <td className="px-3 py-2 text-gray-600">{l.primary_contact || '–'}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{l.phone || '–'}</td>
                  <td className="px-3 py-2 text-blue-600 truncate max-w-48">{l.email || '–'}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${s.tone}`}>{s.label}</span></td>
                  <td className="px-3 py-2 text-right text-gray-600">{l.attempts_count}</td>
                  <td className="px-4 py-2 text-gray-600">{caller ? names.get(caller) || '–' : '–'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>Page {current + 1} of {pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(current - 1)} disabled={current === 0} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50">← Prev</button>
            <button onClick={() => setPage(current + 1)} disabled={current >= pages - 1} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50">Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

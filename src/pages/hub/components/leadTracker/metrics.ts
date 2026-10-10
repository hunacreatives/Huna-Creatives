import { inRange, shiftDayOf, type PeriodRange } from '@/lib/smartgridShift';
import type { CallLogEntry, Caller, TrackerLead } from './types';

const CONVERSATION = new Set(['interested', 'not_interested', 'callback']);

export const isCall = (e: CallLogEntry) => !!e.user_id && e.meta?.outcome !== 'skip';

export interface CallerStats {
  callerId: string;
  name: string;
  calls: number;
  conversations: number;
  emails: number;
  callbacks: number;
  meetings: number;
  bills: number;
  lastCall: string | null;
}

export type Totals = Omit<CallerStats, 'callerId' | 'name'>;

const emptyStats = (callerId: string, name: string): CallerStats => ({
  callerId, name, calls: 0, conversations: 0, emails: 0, callbacks: 0, meetings: 0, bills: 0, lastCall: null,
});

// Calls count every saved outcome; emails/callbacks count each lead once per period.
export function periodStats(callLog: CallLogEntry[], leads: TrackerLead[], callers: Caller[], range: PeriodRange) {
  const byCaller = new Map<string, CallerStats & { _emails: Set<string>; _callbacks: Set<string>; _convos: Set<string> }>();
  const names = new Map(callers.map(c => [c.id, c.name]));
  const get = (id: string) => {
    if (!byCaller.has(id)) {
      byCaller.set(id, { ...emptyStats(id, names.get(id) || 'Former caller'), _emails: new Set(), _callbacks: new Set(), _convos: new Set() });
    }
    return byCaller.get(id)!;
  };
  callers.forEach(c => get(c.id));

  for (const e of callLog) {
    if (!isCall(e) || !inRange(shiftDayOf(e.created_at), range)) continue;
    const s = get(e.user_id!);
    s.calls++;
    const lead = String(e.entity_id);
    if (e.meta?.email_found) s._emails.add(lead);
    if (e.meta?.outcome === 'callback') s._callbacks.add(lead);
    if (CONVERSATION.has(e.meta?.outcome || '')) s._convos.add(lead);
    if (!s.lastCall || e.created_at > s.lastCall) s.lastCall = e.created_at;
  }

  // Meetings and bills are stamped on the lead; credit the caller who last worked it
  for (const l of leads) {
    if (!l.last_caller_id) continue;
    if (l.meeting_scheduled && l.meeting_scheduled_at && inRange(shiftDayOf(l.meeting_scheduled_at), range)) get(l.last_caller_id).meetings++;
    if (l.bill_received && l.bill_received_at && inRange(shiftDayOf(l.bill_received_at), range)) get(l.last_caller_id).bills++;
  }

  const rows: CallerStats[] = [...byCaller.values()].map(({ _emails, _callbacks, _convos, ...s }) => ({
    ...s, emails: _emails.size, callbacks: _callbacks.size, conversations: _convos.size,
  })).sort((a, b) => a.name.localeCompare(b.name));

  const totals: Totals = rows.reduce<Totals>((t, r) => ({
    calls: t.calls + r.calls,
    conversations: t.conversations + r.conversations,
    emails: t.emails + r.emails,
    callbacks: t.callbacks + r.callbacks,
    meetings: t.meetings + r.meetings,
    bills: t.bills + r.bills,
    lastCall: !t.lastCall || (r.lastCall && r.lastCall > t.lastCall) ? r.lastCall : t.lastCall,
  }), { calls: 0, conversations: 0, emails: 0, callbacks: 0, meetings: 0, bills: 0, lastCall: null });

  return { rows, totals };
}

export const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '–');

export interface QueueLeadRow {
  lead: TrackerLead;
  state: 'waiting' | 'called' | 'callback_due';
  outcome?: string;
  calledAt?: string;
  emailFound?: boolean;
}

export interface CallerQueue {
  caller: Caller;
  holding: number;
  called: number;
  callbacksDue: number;
  lastCall: string | null;
  rows: QueueLeadRow[];
}

// What each caller holds and handled for one shift. Locked leads are the ones
// not yet called (saving an outcome releases the lock).
export function shiftQueues(callLog: CallLogEntry[], leads: TrackerLead[], callers: Caller[], day: string, isCurrent: boolean): CallerQueue[] {
  const leadById = new Map(leads.map(l => [l.id, l]));
  return callers.map(caller => {
    const lastByLead = new Map<string, CallLogEntry>();
    for (const e of callLog) {
      if (e.user_id !== caller.id || !isCall(e) || shiftDayOf(e.created_at) !== day) continue;
      const prev = lastByLead.get(String(e.entity_id));
      if (!prev || e.created_at > prev.created_at) lastByLead.set(String(e.entity_id), e);
    }
    const calledRows: QueueLeadRow[] = [...lastByLead.values()]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .flatMap(e => {
        const lead = leadById.get(String(e.entity_id));
        return lead ? [{ lead, state: 'called' as const, outcome: e.meta?.outcome, calledAt: e.created_at, emailFound: !!e.meta?.email_found }] : [];
      });

    const waiting: QueueLeadRow[] = isCurrent
      ? leads.filter(l => l.locked_by === caller.id)
          .sort((a, b) => (a.locked_at || '').localeCompare(b.locked_at || ''))
          .map(lead => ({ lead, state: 'waiting' as const }))
      : [];
    const dueCallbacks: QueueLeadRow[] = isCurrent
      ? leads.filter(l => l.status === 'callback_pending' && !l.retired_at && l.assigned_to === caller.id && !l.locked_by && !!l.callback_date && l.callback_date <= day)
          .map(lead => ({ lead, state: 'callback_due' as const }))
      : [];

    return {
      caller,
      holding: waiting.length,
      called: calledRows.length,
      callbacksDue: dueCallbacks.length,
      lastCall: calledRows[0]?.calledAt ?? null,
      rows: [...dueCallbacks, ...waiting, ...calledRows],
    };
  });
}

export function pipeline(leads: TrackerLead[]) {
  const p = { total: 0, neverCalled: 0, inQueue: 0, callbacks: 0, retry: 0, complete: 0, outOfAttempts: 0, retired: 0 };
  for (const l of leads) {
    if (l.retired_at) { p.retired++; continue; }
    p.total++;
    if (l.locked_by) p.inQueue++;
    else if (l.status === 'callback_pending') p.callbacks++;
    else if (l.status === 'complete') p.complete++;
    else if (l.status === 'attempted') p.outOfAttempts++;
    else if (l.last_worked_at) p.retry++;
    else p.neverCalled++;
  }
  return p;
}

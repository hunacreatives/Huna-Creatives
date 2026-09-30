import { addDays, inRange, shiftDayOf, weekStart, type PeriodRange } from '@/lib/smartgridShift';

export interface ClientCall {
  id: number;
  leadId: string;
  callerId: string;
  at: string;
  outcome: string;
  emailFound: boolean;
  notes: string | null;
}

export interface ClientLead {
  id: string;
  account: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  attempts: number;
  callbackDate: string | null;
  callbackTime: string | null;
  nextGoal: 'email' | 'meeting' | 'bill' | null;
  meetingBooked: boolean;
  meetingAt: string | null;
  billReceived: boolean;
  billAt: string | null;
  replied: boolean;
  repliedAt: string | null;
  lastCallerId: string | null;
  lastCalledAt: string | null;
  notes: string | null;
}

export interface ClientIncentive {
  id: number;
  account: string;
  milestone: 'reply' | 'meeting' | 'bill';
  amount: number;
  at: string;
  paid: boolean;
  paidAt: string | null;
}

export const INCENTIVE_RATES: Record<ClientIncentive['milestone'], { label: string; rate: number }> = {
  reply: { label: 'Email reply received', rate: 5 },
  meeting: { label: 'Meeting booked', rate: 10 },
  bill: { label: 'Utility bill received', rate: 25 },
};

export const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// Months follow the calling-session day, same as every other number on the dashboard
export const incentiveMonth = (i: ClientIncentive) => shiftDayOf(i.at).slice(0, 7);

export function incentiveSummary(items: ClientIncentive[]) {
  const byType = (Object.keys(INCENTIVE_RATES) as ClientIncentive['milestone'][]).map(m => {
    const list = items.filter(i => i.milestone === m);
    return { milestone: m, count: list.length, total: list.reduce((s, i) => s + i.amount, 0) };
  });
  const total = items.reduce((s, i) => s + i.amount, 0);
  const paid = items.filter(i => i.paid).reduce((s, i) => s + i.amount, 0);
  return { byType, total, paid, owed: total - paid };
}

export interface ClientPayload {
  generatedAt: string;
  incentives: ClientIncentive[];
  callers: { id: string; name: string }[];
  calls: ClientCall[];
  leads: ClientLead[];
}

const PACIFIC = 'America/Los_Angeles';

export const formatPacific = (ts: string) =>
  new Date(ts).toLocaleString('en-US', { timeZone: PACIFIC, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const GOAL_TEXT: Record<string, string> = { email: 'Get email', meeting: 'Book meeting', bill: 'Get utility bill' };
export const OUTCOME_TEXT: Record<string, string> = {
  interested: 'Interested', not_interested: 'Not interested', callback: 'Callback', voicemail: 'Voicemail', no_answer: 'No answer',
};

const CONVERSATION = new Set(['interested', 'not_interested', 'callback']);

export interface Funnel {
  calls: number;
  conversations: number;
  emails: number;
  meetings: number;
  bills: number;
}

const emptyFunnel = (): Funnel => ({ calls: 0, conversations: 0, emails: 0, meetings: 0, bills: 0 });

// Same definitions as the hub Lead Tracker: calls = every logged call,
// conversations/emails = distinct leads, meetings/bills by the date they happened.
export function funnelFor(data: ClientPayload, range: PeriodRange, callerId?: string): Funnel {
  const f = emptyFunnel();
  const convos = new Set<string>();
  const emails = new Set<string>();
  for (const c of data.calls) {
    if (callerId && c.callerId !== callerId) continue;
    if (!inRange(shiftDayOf(c.at), range)) continue;
    f.calls++;
    if (CONVERSATION.has(c.outcome)) convos.add(c.leadId);
    if (c.emailFound) emails.add(c.leadId);
  }
  f.conversations = convos.size;
  f.emails = emails.size;
  for (const l of data.leads) {
    if (callerId && l.lastCallerId !== callerId) continue;
    if (l.meetingBooked && l.meetingAt && inRange(shiftDayOf(l.meetingAt), range)) f.meetings++;
    if (l.billReceived && l.billAt && inRange(shiftDayOf(l.billAt), range)) f.bills++;
  }
  return f;
}

export interface TrendPoint {
  key: string;
  label: string;
  calls: number;
  emails: number;
}

// Days for short periods, Mon–Sun weeks for long ones, ending at the picked date
export function trend(data: ClientPayload, byWeek: boolean, endDay: string): TrendPoint[] {
  const points: TrendPoint[] = [];
  const count = byWeek ? 8 : 14;
  for (let i = count - 1; i >= 0; i--) {
    const start = byWeek ? addDays(weekStart(endDay), -7 * i) : addDays(endDay, -i);
    const end = byWeek ? addDays(start, 6) : start;
    const d = new Date(`${start}T12:00:00Z`);
    points.push({
      key: start,
      label: byWeek
        ? `Wk ${d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' })}`
        : d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', day: 'numeric' }),
      ...(({ calls, emails }) => ({ calls, emails }))(funnelFor(data, { start, end, label: '' })),
    });
  }
  return points;
}

export interface Win {
  lead: ClientLead;
  achieved: string[];
  when: string;
  callerId: string | null;
}

export function winsFor(data: ClientPayload, range: PeriodRange): Win[] {
  const emailAt = new Map<string, { at: string; callerId: string }>();
  for (const c of data.calls) {
    if (!c.emailFound) continue;
    const prev = emailAt.get(c.leadId);
    if (!prev || c.at < prev.at) emailAt.set(c.leadId, { at: c.at, callerId: c.callerId });
  }
  const wins: Win[] = [];
  for (const l of data.leads) {
    const achieved: string[] = [];
    const times: string[] = [];
    const e = emailAt.get(l.id);
    if (e && inRange(shiftDayOf(e.at), range)) { achieved.push('Email'); times.push(e.at); }
    if (l.meetingBooked && l.meetingAt && inRange(shiftDayOf(l.meetingAt), range)) { achieved.push('Meeting booked'); times.push(l.meetingAt); }
    if (l.billReceived && l.billAt && inRange(shiftDayOf(l.billAt), range)) { achieved.push('Utility bill'); times.push(l.billAt); }
    if (achieved.length) wins.push({ lead: l, achieved, when: times.sort()[times.length - 1], callerId: e?.callerId || l.lastCallerId });
  }
  return wins.sort((a, b) => b.when.localeCompare(a.when));
}

export function listProgress(data: ClientPayload) {
  const counts: Record<string, number> = {};
  for (const l of data.leads) counts[l.status] = (counts[l.status] || 0) + 1;
  return { total: data.leads.length, counts };
}

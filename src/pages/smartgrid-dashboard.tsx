import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { currentShiftDay, formatShiftDay, latestShiftDay, periodRange, stepPeriod, type TrackerPeriod } from '@/lib/smartgridShift';
import {
  GOAL_TEXT, INCENTIVE_RATES, OUTCOME_TEXT, formatPacific, funnelFor, incentiveMonth, incentiveSummary, listProgress, money, trend, winsFor,
  type ClientPayload, type Funnel,
} from './smartgridDashboard/clientData';

const ENDPOINT = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/smartgrid-client-dashboard`;
const PW_KEY = 'smartgrid_dashboard_pw';
const REFRESH_MS = 60000;

const PERIODS: { value: TrackerPeriod; label: string }[] = [
  { value: 'shift', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All time' },
];

const readPw = () => { try { return sessionStorage.getItem(PW_KEY) || ''; } catch { return ''; } };
const savePw = (v: string) => { try { v ? sessionStorage.setItem(PW_KEY, v) : sessionStorage.removeItem(PW_KEY); } catch { /* private mode */ } };

async function fetchDashboard(password: string): Promise<ClientPayload> {
  const res = await fetch(ENDPOINT, { headers: { 'x-dashboard-password': password } });
  if (res.status === 401) throw Object.assign(new Error('Incorrect password'), { unauthorized: true });
  if (!res.ok) throw new Error('Could not load the dashboard. Please try again shortly.');
  return res.json();
}

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '–');

function PasswordGate({ onUnlock, error, busy }: { onUnlock: (pw: string) => void; error: string | null; busy: boolean }) {
  const [value, setValue] = useState('');
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <form
        onSubmit={e => { e.preventDefault(); if (value) onUnlock(value); }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SmartGrid Western</h1>
          <p className="text-sm text-gray-500 mt-1">Calling campaign dashboard</p>
        </div>
        <input
          type="password"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button disabled={busy || !value} className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50">
          {busy ? 'Checking…' : 'View dashboard'}
        </button>
      </form>
    </div>
  );
}

const STEPS: { key: keyof Funnel; label: string; hint: string }[] = [
  { key: 'calls', label: 'Calls made', hint: 'Every call the team logged' },
  { key: 'conversations', label: 'Conversations', hint: 'Reached a person (interested, not interested or asked for a callback)' },
  { key: 'emails', label: 'Emails captured', hint: 'Decision-maker email collected' },
  { key: 'meetings', label: 'Meetings booked', hint: 'Meeting set with Dan / Chris' },
  { key: 'bills', label: 'Utility bills', hint: 'Utility bill received for a savings estimate' },
];

function FunnelRow({ f }: { f: Funnel }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {STEPS.map((s, i) => (
        <div key={s.key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3" title={s.hint}>
          <p className="text-2xl font-bold text-gray-900">{f[s.key].toLocaleString()}</p>
          <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
          {i > 0 && <p className="text-[11px] text-gray-400 mt-1">{pct(f[s.key], f[STEPS[i - 1].key])} of {STEPS[i - 1].label.toLowerCase()}</p>}
        </div>
      ))}
    </div>
  );
}

function TrendChart({ points }: { points: ReturnType<typeof trend> }) {
  const max = Math.max(1, ...points.map(p => p.calls));
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-4 mb-3 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sky-300" />Calls</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Emails captured</span>
      </div>
      <div className="flex items-end gap-1.5 h-36">
        {points.map(p => (
          <div key={p.key} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${p.label}: ${p.calls} calls, ${p.emails} emails`}>
            <div className="w-full flex items-end justify-center gap-0.5 h-28">
              <div className="w-1/2 bg-sky-300 rounded-t" style={{ height: `${(p.calls / max) * 100}%` }} />
              <div className="w-1/2 bg-emerald-500 rounded-t" style={{ height: `${(p.emails / max) * 100}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 truncate w-full text-center">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CONTACT_PAGE = 50;

export default function SmartGridDashboard() {
  const [password, setPassword] = useState(readPw);
  const [data, setData] = useState<ClientPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<TrackerPeriod>('week');
  const [day, setDay] = useState(latestShiftDay);
  const [tab, setTab] = useState<'wins' | 'callbacks' | 'emails' | 'contacts' | 'incentives'>('wins');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const load = useCallback(async (pw: string) => {
    setBusy(true);
    try {
      const payload = await fetchDashboard(pw);
      setData(payload);
      setError(null);
      savePw(pw);
      setPassword(pw);
    } catch (e: any) {
      setError(e.message);
      if (e.unauthorized) { savePw(''); setPassword(''); setData(null); }
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { if (password) load(password); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!password || !data) return;
    const t = setInterval(() => load(password), REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') load(password); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [password, !!data, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const range = useMemo(() => periodRange(period, day), [period, day]);
  const names = useMemo(() => new Map((data?.callers || []).map(c => [c.id, c.name])), [data]);
  const funnel = useMemo(() => (data ? funnelFor(data, range) : null), [data, range]);
  const points = useMemo(() => (data ? trend(data, period === 'month' || period === 'all', range.end || latestShiftDay()) : []), [data, period, range]);
  const wins = useMemo(() => (data ? winsFor(data, range) : []), [data, range]);
  const callbacks = useMemo(
    () => (data?.leads || []).filter(l => l.status === 'Callback scheduled')
      .sort((a, b) => (a.callbackDate || '9999').localeCompare(b.callbackDate || '9999')),
    [data],
  );
  const progress = useMemo(() => (data ? listProgress(data) : null), [data]);
  // Every contact with an email on file, with when/who captured it (if a caller did)
  const emailContacts = useMemo(() => {
    if (!data) return [];
    const captured = new Map<string, { at: string; callerId: string }>();
    for (const c of data.calls) {
      if (!c.emailFound) continue;
      const prev = captured.get(c.leadId);
      if (!prev || c.at < prev.at) captured.set(c.leadId, { at: c.at, callerId: c.callerId });
    }
    return data.leads
      .filter(l => l.email)
      .map(l => ({ lead: l, captured: captured.get(l.id) || null }))
      // Replies first (newest reply on top), then everyone else by when the email was captured
      .sort((a, b) =>
        Number(b.lead.replied) - Number(a.lead.replied)
        || (b.lead.repliedAt || '').localeCompare(a.lead.repliedAt || '')
        || (b.captured?.at || '').localeCompare(a.captured?.at || '')
        || a.lead.account.localeCompare(b.lead.account));
  }, [data]);
  const repliedCount = emailContacts.filter(e => e.lead.replied).length;

  const [incMonth, setIncMonth] = useState(() => latestShiftDay().slice(0, 7));
  const incentiveMonths = useMemo(() => {
    const set = new Set((data?.incentives || []).map(incentiveMonth));
    set.add(latestShiftDay().slice(0, 7));
    return [...set].sort().reverse();
  }, [data]);
  const monthItems = useMemo(
    () => (data?.incentives || []).filter(i => incentiveMonth(i) === incMonth).sort((a, b) => b.at.localeCompare(a.at)),
    [data, incMonth],
  );
  const monthSummary = useMemo(() => incentiveSummary(monthItems), [monthItems]);
  const allTime = useMemo(() => incentiveSummary(data?.incentives || []), [data]);
  const monthName = (m: string) => new Date(`${m}-15T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });

  const downloadIncentives = () => {
    const cell = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Date (Pacific)', 'Business', 'For', 'Amount (USD)', 'Status'],
      ...monthItems.map(i => [formatPacific(i.at), i.account, INCENTIVE_RATES[i.milestone].label, i.amount.toFixed(2), i.paid ? `Paid ${i.paidAt ? formatPacific(i.paidAt) : ''}` : 'Owed']),
      [],
      ['', '', 'Total', monthSummary.total.toFixed(2), ''],
      ['', '', 'Paid', monthSummary.paid.toFixed(2), ''],
      ['', '', 'Owed', monthSummary.owed.toFixed(2), ''],
    ];
    const blob = new Blob([rows.map(r => r.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartgrid-incentives-${incMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadEmails = () => {
    const cell = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Business', 'Contact', 'Email', 'Phone', 'Replied to our email (Pacific)', 'Status', 'Email captured (Pacific)', 'Caller', 'Notes'],
      ...emailContacts.map(({ lead, captured }) => [
        lead.account, lead.contact, lead.email, lead.phone, lead.replied ? (lead.repliedAt ? formatPacific(lead.repliedAt) : 'Yes') : '', lead.status,
        captured ? formatPacific(captured.at) : '', captured ? names.get(captured.callerId) || '' : '', lead.notes,
      ]),
    ];
    const blob = new Blob([rows.map(r => r.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartgrid-contacts-with-email-${currentShiftDay()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const contacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.leads || [])
      .filter(l => !q || l.account.toLowerCase().includes(q) || l.contact?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.phone?.includes(q))
      .sort((a, b) => a.account.localeCompare(b.account));
  }, [data, search]);

  if (!password || !data) {
    return <PasswordGate onUnlock={load} error={password ? null : error} busy={busy} />;
  }

  const today = latestShiftDay();
  const isCurrent = period === 'all' || (range.start !== null && range.end !== null && today >= range.start && today <= range.end);
  const periodLabel = period === 'shift' ? `${formatShiftDay(day)} · morning calling session (Pacific)` : range.label.replace(/^Week · /, 'Week of ');
  const pages = Math.max(1, Math.ceil(contacts.length / CONTACT_PAGE));
  const current = Math.min(page, pages - 1);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">SmartGrid Western</h1>
            <p className="text-sm text-gray-500 mt-1">Calling campaign · updated {formatPacific(data.generatedAt)} Pacific</p>
          </div>
          <button onClick={() => { savePw(''); setPassword(''); setData(null); }} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-white">
            Log out
          </button>
        </div>

        {error && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{error} Showing the last loaded numbers.</p>}

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${period === p.value ? 'bg-sky-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {p.label}
              </button>
            ))}
          </div>
          {period !== 'all' && (
            <div className="inline-flex items-center gap-1">
              <button onClick={() => setDay(stepPeriod(period, day, -1))} className="w-8 h-8 rounded-md border border-gray-200 bg-white text-gray-600" aria-label="Previous">‹</button>
              <button onClick={() => setDay(stepPeriod(period, day, 1))} disabled={isCurrent} className="w-8 h-8 rounded-md border border-gray-200 bg-white text-gray-600 disabled:opacity-40" aria-label="Next">›</button>
              {!isCurrent && <button onClick={() => setDay(today)} className="ml-1 px-2.5 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 rounded-md">Today</button>}
            </div>
          )}
          <p className="text-sm font-semibold text-gray-800">{periodLabel}</p>
        </div>

        {funnel && <FunnelRow f={funnel} />}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{period === 'month' || period === 'all' ? 'Last 8 weeks' : 'Last 14 days'}</p>
            <TrendChart points={points} />
          </div>
          <div className="lg:col-span-2 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">By caller</p>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs">
                    <th className="text-left px-3 py-2 font-semibold">Caller</th>
                    <th className="text-right px-2 py-2 font-semibold">Calls</th>
                    <th className="text-right px-2 py-2 font-semibold">Convos</th>
                    <th className="text-right px-2 py-2 font-semibold">Emails</th>
                    <th className="text-right px-2 py-2 font-semibold">Mtgs</th>
                    <th className="text-right px-3 py-2 font-semibold">Bills</th>
                  </tr>
                </thead>
                <tbody>
                  {data.callers.map(c => {
                    const f = funnelFor(data, range, c.id);
                    return (
                      <tr key={c.id} className="border-t border-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800">{c.name}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{f.calls}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{f.conversations}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-emerald-700 font-semibold">{f.emails}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{f.meetings}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{f.bills}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {progress && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact list progress</p>
              <p className="text-xs text-gray-500">
                {(progress.total - (progress.counts['Not called yet'] || 0)).toLocaleString()} of {progress.total.toLocaleString()} contacted at least once
              </p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {['Not called yet', 'Called – will retry', 'Callback scheduled', 'Complete', 'Out of attempts'].map(s => (
                <span key={s} className="text-gray-600">{s}: <b className="text-gray-900">{(progress.counts[s] || 0).toLocaleString()}</b></span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex gap-1 border-b border-gray-200">
            {([
              ['wins', `Wins to follow up (${wins.length})`],
              ['callbacks', `Scheduled callbacks (${callbacks.length})`],
              ['emails', `Emails (${emailContacts.length}${repliedCount ? ` · ${repliedCount} replied` : ''})`],
              ['contacts', `All contacts (${data.leads.length.toLocaleString()})`],
              ['incentives', `Incentives`],
            ] as const).map(([value, label]) => (
              <button key={value} onClick={() => setTab(value)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === value ? 'border-sky-600 text-sky-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'wins' && (
            wins.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center">No emails, meetings or bills in this period yet.</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {wins.map(w => (
                  <div key={w.lead.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900">{w.lead.account}</p>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {w.achieved.map(a => <span key={a} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">{a}</span>)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{w.lead.contact || '–'}{w.lead.phone ? ` · ${w.lead.phone}` : ''}</p>
                    {w.lead.email && <a href={`mailto:${w.lead.email}`} className="text-sm text-sky-700 break-all">{w.lead.email}</a>}
                    <p className="text-xs text-gray-400">{formatPacific(w.when)} Pacific · {names.get(w.callerId || '') || 'Caller'}</p>
                    {w.lead.notes && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2 whitespace-pre-wrap">{w.lead.notes}</p>}
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'callbacks' && (
            callbacks.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center">No callbacks scheduled.</p> : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {callbacks.map(l => (
                  <div key={l.id} className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <p className="font-medium text-gray-900 flex-1 min-w-48">{l.account}</p>
                    <p className="text-sm text-gray-700">{l.callbackDate ? formatShiftDay(l.callbackDate) : 'Date TBD'}{l.callbackTime ? ` · ${l.callbackTime.slice(0, 5)}` : ''}</p>
                    {l.nextGoal && <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">{GOAL_TEXT[l.nextGoal]}</span>}
                    <p className="text-xs text-gray-500">{names.get(l.lastCallerId || '') || ''}</p>
                    {l.notes && <p className="w-full text-sm text-gray-600">{l.notes}</p>}
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'emails' && (
            emailContacts.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center">No emails collected yet.</p> : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-gray-600">
                    {emailContacts.length} contacts with an email address · <b className="text-emerald-700">{repliedCount} replied</b> to our email
                  </p>
                  <button onClick={downloadEmails} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-sky-600 hover:bg-sky-700 text-white">
                    Download CSV
                  </button>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-xs">
                        <th className="text-left px-4 py-2 font-semibold">Business</th>
                        <th className="text-left px-3 py-2 font-semibold">Contact</th>
                        <th className="text-left px-3 py-2 font-semibold">Email</th>
                        <th className="text-left px-3 py-2 font-semibold">Phone</th>
                        <th className="text-left px-3 py-2 font-semibold">Status</th>
                        <th className="text-left px-4 py-2 font-semibold">Captured</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailContacts.map(({ lead, captured }, i) => (
                        <Fragment key={lead.id}>
                        {(i === 0 || emailContacts[i - 1].lead.replied !== lead.replied) && (
                          <tr className={lead.replied ? 'bg-emerald-50' : 'bg-gray-50'}>
                            <td colSpan={6} className={`px-4 py-1.5 text-xs font-semibold ${lead.replied ? 'text-emerald-800' : 'text-gray-500'}`}>
                              {lead.replied ? `Replied to our email (${repliedCount})` : `No reply yet (${emailContacts.length - repliedCount})`}
                            </td>
                          </tr>
                        )}
                        <tr className={`border-t border-gray-50 align-top ${lead.replied ? 'bg-emerald-50/40' : ''}`}>
                          <td className="px-4 py-2 font-medium text-gray-900 min-w-[14rem] max-w-sm">
                            {lead.account}
                            {lead.notes && <p className="text-xs font-normal text-gray-500 mt-0.5 line-clamp-2" title={lead.notes}>{lead.notes}</p>}
                          </td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{lead.contact || '–'}</td>
                          <td className="px-3 py-2 whitespace-nowrap"><a href={`mailto:${lead.email}`} className="text-sky-700 hover:underline">{lead.email}</a></td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{lead.phone || '–'}</td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{lead.status}</td>
                          <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                            {lead.replied && <p className="text-xs font-semibold text-emerald-700">Replied{lead.repliedAt ? ` ${formatPacific(lead.repliedAt)}` : ''}</p>}
                            {captured ? <>{formatPacific(captured.at)}<br /><span className="text-xs">{names.get(captured.callerId) || 'Caller'}</span></> : 'On file'}
                          </td>
                        </tr>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {tab === 'incentives' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs text-gray-500">Balance owed to Huna (all months)</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{money(allTime.owed)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs text-gray-500">Paid to date</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{money(allTime.paid)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs text-gray-500">Rates</p>
                  <p className="text-sm text-gray-700 mt-1">
                    {Object.values(INCENTIVE_RATES).map(r => `${money(r.rate)} per ${r.label.toLowerCase()}`).join(' · ')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <select value={incMonth} onChange={e => setIncMonth(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
                  {incentiveMonths.map(m => <option key={m} value={m}>{monthName(m)}</option>)}
                </select>
                {monthItems.length > 0 && (
                  <button onClick={downloadIncentives} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-sky-600 hover:bg-sky-700 text-white">
                    Download CSV
                  </button>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-xs">
                      <th className="text-left px-4 py-2 font-semibold">{monthName(incMonth)}</th>
                      <th className="text-right px-3 py-2 font-semibold">Count</th>
                      <th className="text-right px-3 py-2 font-semibold">Rate</th>
                      <th className="text-right px-4 py-2 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthSummary.byType.map(t => (
                      <tr key={t.milestone} className="border-t border-gray-50">
                        <td className="px-4 py-2 text-gray-800">{INCENTIVE_RATES[t.milestone].label}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{t.count}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">{money(INCENTIVE_RATES[t.milestone].rate)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{money(t.total)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-gray-200 font-semibold">
                      <td className="px-4 py-2" colSpan={3}>Total for {monthName(incMonth)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{money(monthSummary.total)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-1.5 text-emerald-700" colSpan={3}>Paid</td>
                      <td className="px-4 py-1.5 text-right tabular-nums text-emerald-700">{money(monthSummary.paid)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 pt-1.5 pb-3 text-amber-700 font-semibold" colSpan={3}>Owed</td>
                      <td className="px-4 pt-1.5 pb-3 text-right tabular-nums text-amber-700 font-semibold">{money(monthSummary.owed)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {monthItems.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No incentives earned in {monthName(incMonth)} yet.</p>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-xs">
                        <th className="text-left px-4 py-2 font-semibold">Date (Pacific)</th>
                        <th className="text-left px-3 py-2 font-semibold">Business</th>
                        <th className="text-left px-3 py-2 font-semibold">For</th>
                        <th className="text-right px-3 py-2 font-semibold">Amount</th>
                        <th className="text-left px-4 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthItems.map(i => (
                        <tr key={i.id} className="border-t border-gray-50">
                          <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatPacific(i.at)}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{i.account}</td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{INCENTIVE_RATES[i.milestone].label}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{money(i.amount)}</td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {i.paid
                              ? <span className="text-emerald-700">Paid{i.paidAt ? ` ${new Date(i.paidAt).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric' })}` : ''}</span>
                              : <span className="text-amber-700 font-medium">Owed</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'contacts' && (
            <div className="space-y-3">
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search business, contact, email or phone…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30" />
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-xs">
                      <th className="text-left px-4 py-2 font-semibold">Business</th>
                      <th className="text-left px-3 py-2 font-semibold">Contact</th>
                      <th className="text-left px-3 py-2 font-semibold">Phone</th>
                      <th className="text-left px-3 py-2 font-semibold">Email</th>
                      <th className="text-left px-3 py-2 font-semibold">Status</th>
                      <th className="text-left px-4 py-2 font-semibold">Last called</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.slice(current * CONTACT_PAGE, current * CONTACT_PAGE + CONTACT_PAGE).map(l => (
                      <tr key={l.id} className="border-t border-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">{l.account}</td>
                        <td className="px-3 py-2 text-gray-700">{l.contact || '–'}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{l.phone || '–'}</td>
                        <td className="px-3 py-2 text-sky-700 whitespace-nowrap">{l.email || '–'}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{l.status}</td>
                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{l.lastCalledAt ? formatPacific(l.lastCalledAt) : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                  <span>{contacts.length.toLocaleString()} contacts · page {current + 1} of {pages}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(current - 1)} disabled={current === 0} className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">← Prev</button>
                    <button onClick={() => setPage(current + 1)} disabled={current >= pages - 1} className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Next →</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400">
          A "day" is one morning calling session, Pacific time. Calls counts every logged call; conversations and emails count each business once per period. Outcome labels: {Object.values(OUTCOME_TEXT).join(', ')}.
        </p>
      </div>
    </div>
  );
}

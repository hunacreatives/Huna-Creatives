import { useEffect, useMemo, useRef, useState } from 'react';
import CommissionsReport from './CommissionsReport';
import { formatShiftDay, latestShiftDay, periodRange, type TrackerPeriod } from '@/lib/smartgridShift';
import { buildTeamsReport, copyReport } from './leadTracker/report';
import { useLeadTrackerData } from './leadTracker/useLeadTrackerData';
import { periodStats, pipeline, shiftQueues } from './leadTracker/metrics';
import TrackerControls from './leadTracker/TrackerControls';
import CallerTable from './leadTracker/CallerTable';
import CallLogTab from './leadTracker/CallLogTab';
import CallbacksTab from './leadTracker/CallbacksTab';
import AllLeadsTab from './leadTracker/AllLeadsTab';
import PipelineCard from './leadTracker/PipelineCard';
import LeadDetailModal from './leadTracker/LeadDetailModal';
import type { TrackerLead } from './leadTracker/types';

interface Props {
  projectId: number;
  isAdmin: boolean;
}

type Tab = 'log' | 'callbacks' | 'leads';

export default function LeadsDatabase({ projectId, isAdmin }: Props) {
  const { leads, callLog, callers, loading, error, lastUpdated, live, reload, patchLead, releaseCaller } = useLeadTrackerData(projectId);
  const [period, setPeriod] = useState<TrackerPeriod>('shift');
  const [day, setDay] = useState(latestShiftDay);
  const [tab, setTab] = useState<Tab>('log');
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  // Follow the latest shift (a new one starts at 11 PM Manila) until the admin picks another date
  const followingCurrent = useRef(true);
  useEffect(() => {
    const t = setInterval(() => {
      const today = latestShiftDay();
      if (followingCurrent.current) setDay(d => (d === today ? d : today));
    }, 60000);
    return () => clearInterval(t);
  }, []);
  const pickDay = (d: string) => {
    followingCurrent.current = d === latestShiftDay();
    setDay(d);
  };

  const range = useMemo(() => periodRange(period, day), [period, day]);
  const isCurrentShift = period === 'shift' && day === latestShiftDay();
  const summary = useMemo(() => periodStats(callLog, leads, callers, range), [callLog, leads, callers, range]);
  const queues = useMemo(
    () => (period === 'shift' ? shiftQueues(callLog, leads, callers, day, isCurrentShift) : []),
    [period, callLog, leads, callers, day, isCurrentShift],
  );
  const pipe = useMemo(() => pipeline(leads), [leads]);
  const openLead = openLeadId ? leads.find(l => l.id === openLeadId) || null : null;
  const onOpenLead = (l: TrackerLead) => setOpenLeadId(l.id);

  // The report is always for one shift: the one being viewed, or the latest one
  const reportDay = period === 'shift' ? day : latestShiftDay();
  const copyTeamsReport = async () => {
    const ok = await copyReport(buildTeamsReport({ callLog, leads, callers, day: reportDay }));
    setCopyState(ok ? 'copied' : 'failed');
    setTimeout(() => setCopyState('idle'), 4000);
  };

  const onRelease = async (callerId: string, name: string, count: number) => {
    const ok = confirm(
      `Release ${name}'s ${count} uncalled lead${count === 1 ? '' : 's'}?\n\n` +
      `Their callbacks stay with them; the rest go back to the shared pool for anyone to call.\n` +
      `If ${name} is calling right now, their screen will skip released leads.`,
    );
    if (!ok) return;
    try {
      const released = await releaseCaller(callerId);
      alert(`Released ${released} lead${released === 1 ? '' : 's'}.`);
    } catch (err: any) {
      alert(`Couldn't release: ${err?.message || err}`);
    }
  };

  if (!isAdmin) {
    return <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">The Lead Tracker is available to admins.</div>;
  }
  if (loading) return <div className="text-center py-8 text-gray-400 text-sm">Loading tracker…</div>;
  if (error && leads.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-sm text-rose-600">Couldn't load the tracker: {error}</p>
        <button onClick={reload} className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200">Try again</button>
      </div>
    );
  }

  const TABS: { value: Tab; label: string }[] = [
    { value: 'log', label: `Call log` },
    { value: 'callbacks', label: `Callbacks (${pipe.callbacks})` },
    { value: 'leads', label: `All leads (${pipe.total.toLocaleString()})` },
  ];

  return (
    <div className="space-y-5">
      <TrackerControls
        period={period}
        day={day}
        onPeriod={setPeriod}
        onDay={pickDay}
        live={live}
        lastUpdated={lastUpdated}
        onRefresh={reload}
        actions={
          <button
            onClick={copyTeamsReport}
            title={copyState === 'failed' ? "Couldn't copy. Allow clipboard access for this site." : `Copies the ${formatShiftDay(reportDay)} shift report, ready to paste in Teams`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              copyState === 'copied' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : copyState === 'failed' ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <i className={copyState === 'copied' ? 'ri-check-line' : 'ri-clipboard-line'} />
            {copyState === 'copied' ? 'Copied, paste in Teams' : copyState === 'failed' ? 'Copy failed' : 'Copy Teams report'}
          </button>
        }
      />

      <CallerTable rows={summary.rows} totals={summary.totals} queues={queues} isCurrentShift={isCurrentShift} onOpenLead={onOpenLead} onRelease={onRelease} />

      <div className="space-y-3">
        <div className="flex gap-1 border-b border-gray-200">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                tab === t.value ? 'border-sky-500 text-sky-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
          {tab === 'log' && <span className="ml-auto self-center text-[11px] text-gray-400">{range.label}</span>}
        </div>
        {tab === 'log' && <CallLogTab callLog={callLog} leads={leads} callers={callers} range={range} onOpenLead={onOpenLead} />}
        {tab === 'callbacks' && <CallbacksTab leads={leads} callers={callers} onOpenLead={onOpenLead} />}
        {tab === 'leads' && <AllLeadsTab leads={leads} callers={callers} onOpenLead={onOpenLead} />}
      </div>

      <PipelineCard p={pipe} />

      <CommissionsReport projectId={projectId} />

      {openLead && (
        <LeadDetailModal lead={openLead} callLog={callLog} callers={callers} onClose={() => setOpenLeadId(null)} onChanged={patchLead} />
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { ADVANCE_DAYS, isShortNotice } from '@/lib/leavePolicy';
import { createPortal } from 'react-dom';
import ContractorLayout from '@/pages/hub/components/ContractorLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/contexts/DemoContext';
import { supabase } from '@/lib/supabase';
import { DEMO_REQUESTS, DEMO_TIME_OFF, DEMO_OVERTIME } from '@/lib/demoData';
import { HubRequest, HubTimeOff } from '@/lib/types';

// ── Shared ────────────────────────────────────────────────────────────────────

type Tab = 'requests' | 'timeoff' | 'overtime';

// ── Requests constants ────────────────────────────────────────────────────────

const reqStatusColors: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  in_review: 'bg-sky-100 text-sky-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-500',
};
const reqTypeLabels: Record<string, string> = {
  reimbursement: 'Reimbursement',
  account_access: 'Account Access',
  hr_concern: 'HR Concern',
  schedule: 'Schedule Adj.',
  equipment: 'Equipment/Software',
  client_reassignment: 'Client Reassignment',
};
const emptyReqForm = { title: '', description: '', type: 'reimbursement' };

// ── Time-off constants ────────────────────────────────────────────────────────

const VL_LIMIT = 6;
const SL_LIMIT = 4;
const MAX_CONSECUTIVE = 3;

const toTypeLabels: Record<string, string> = {
  pto: 'Vacation Leave (VL)',
  sick: 'Sick Leave (SL)',
  emergency: 'Emergency Leave',
  unpaid: 'Unpaid Leave',
};
const toTypeColors: Record<string, string> = {
  pto: 'bg-sky-100 text-sky-700',
  sick: 'bg-rose-100 text-rose-700',
  emergency: 'bg-orange-100 text-orange-700',
  unpaid: 'bg-gray-100 text-gray-600',
};
const toStatusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  forwarded: 'bg-purple-100 text-purple-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};
const toStatusLabels: Record<string, string> = {
  pending: 'Pending',
  forwarded: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

// ── Overtime constants ────────────────────────────────────────────────────────

const otStatusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};
const otStatusLabels: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0];
const addDays = (date: string, n: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};
const daysBetween = (a: string, b: string) =>
  Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1;

// ── Component ─────────────────────────────────────────────────────────────────

export default function ContractorMyRequestsPage() {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const [tab, setTab] = useState<Tab>('requests');

  // ── Requests state ──────────────────────────────────────────────────────────
  const [reqs, setReqs] = useState<HubRequest[]>([]);
  const [reqsLoading, setReqsLoading] = useState(true);
  const [showReqModal, setShowReqModal] = useState(false);
  const [reqForm, setReqForm] = useState(emptyReqForm);
  const [reqSaving, setReqSaving] = useState(false);
  const [selectedReq, setSelectedReq] = useState<HubRequest | null>(null);
  const [reqToast, setReqToast] = useState('');

  // ── Time-off state ──────────────────────────────────────────────────────────
  const [leaves, setLeaves] = useState<HubTimeOff[]>([]);
  const [blackouts, setBlackouts] = useState<{ start_date: string; end_date: string; reason?: string }[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(true);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [leaveType, setLeaveType] = useState('pto');
  const [halfDay, setHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState('morning');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // ── Overtime state ──────────────────────────────────────────────────────────
  const [ots, setOts] = useState<any[]>([]);
  const [otsLoading, setOtsLoading] = useState(true);
  const [showOtModal, setShowOtModal] = useState(false);
  const [otSaving, setOtSaving] = useState(false);
  const [otError, setOtError] = useState('');
  const [otDate, setOtDate] = useState('');
  const [otHours, setOtHours] = useState('');
  const [otReason, setOtReason] = useState('');

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchReqs = async () => {
    if (isDemo) { setReqs(DEMO_REQUESTS as HubRequest[]); setReqsLoading(false); return; }
    if (!user) return;
    setReqsLoading(true);
    const { data } = await supabase.from('hub_requests').select('*').eq('contractor_id', user.id).order('created_at', { ascending: false });
    setReqs((data as HubRequest[]) ?? []);
    setReqsLoading(false);
  };

  const fetchLeaves = async () => {
    if (isDemo) { setLeaves(DEMO_TIME_OFF as HubTimeOff[]); setBlackouts([]); setLeavesLoading(false); return; }
    if (!user) return;
    setLeavesLoading(true);
    const [{ data: l }, { data: bd }] = await Promise.all([
      supabase.from('hub_time_off').select('*').eq('contractor_id', user.id).order('created_at', { ascending: false }),
      supabase.from('hub_blackout_dates').select('start_date, end_date, reason').gte('end_date', todayStr()),
    ]);
    setLeaves((l as HubTimeOff[]) ?? []);
    setBlackouts(bd ?? []);
    setLeavesLoading(false);
  };

  const fetchOts = async () => {
    if (isDemo) { setOts(DEMO_OVERTIME); setOtsLoading(false); return; }
    if (!user) return;
    setOtsLoading(true);
    const { data } = await supabase.from('hub_overtime_requests').select('*').eq('contractor_id', user.id).order('created_at', { ascending: false });
    setOts(data ?? []);
    setOtsLoading(false);
  };

  useEffect(() => { fetchReqs(); fetchLeaves(); fetchOts(); }, [user, isDemo]);

  // ── Leave balance calculation ───────────────────────────────────────────────

  const year = new Date().getFullYear();
  const approvedThisYear = leaves.filter(r => r.status === 'approved' && new Date(r.start_date).getFullYear() === year);
  const ptoUsed = approvedThisYear.filter(r => r.type === 'pto' || r.type === 'vacation').reduce((s, r) => s + (r.half_day ? 0.5 : daysBetween(r.start_date, r.end_date)), 0);
  const sickUsed = approvedThisYear.filter(r => r.type === 'sick').reduce((s, r) => s + (r.half_day ? 0.5 : daysBetween(r.start_date, r.end_date)), 0);
  const ptoLeft = Math.max(0, VL_LIMIT - ptoUsed);
  const sickLeft = Math.max(0, SL_LIMIT - sickUsed);

  const startDateUser = user?.start_date;
  const ptoEligibleDate = startDateUser
    ? new Date(new Date(startDateUser).setMonth(new Date(startDateUser).getMonth() + 6))
    : null;
  const isEligibleForPTO = ptoEligibleDate ? new Date() >= ptoEligibleDate : false;
  const ptoEligibleLabel = ptoEligibleDate
    ? ptoEligibleDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const effectiveDays = halfDay ? 0.5 : (leaveStart && leaveEnd ? daysBetween(leaveStart, leaveEnd) : 0);
  const advanceWarning = leaveType === 'pto' && leaveStart && isShortNotice(todayStr(), leaveStart)
    ? `This is inside the ${ADVANCE_DAYS}-day notice window. You can still submit it — give a reason and HR will review it as an exception.`
    : null;

  // ── Submitters ──────────────────────────────────────────────────────────────

  const submitReq = async () => {
    if (!reqForm.title.trim() || !user) return;
    setReqSaving(true);
    const { error } = await supabase.from('hub_requests').insert({ ...reqForm, contractor_id: user.id, status: 'open' });
    setReqSaving(false);
    if (error) {
      console.error('Failed to submit request:', error);
      setReqToast('Failed to submit request. Please try again.');
      setTimeout(() => setReqToast(''), 4000);
      return;
    }
    setShowReqModal(false);
    setReqForm(emptyReqForm);
    setReqToast('Request submitted successfully.');
    setTimeout(() => setReqToast(''), 3000);
    supabase.functions.invoke('notify-admin', {
      body: { type: 'request_submitted', data: { contractor_name: user.full_name, request_type: reqForm.type, title: reqForm.title } },
    }).catch(console.error);
    fetchReqs();
  };

  const validateLeave = () => {
    if (!leaveStart) return 'Please select a start date.';
    if (!halfDay && !leaveEnd) return 'Please select an end date.';
    const effectiveEnd = halfDay ? leaveStart : leaveEnd;
    if (!halfDay && new Date(leaveEnd) < new Date(leaveStart)) return 'End date must be after start date.';
    if (leaveType === 'pto') {
      if (!isEligibleForPTO) return 'You are not yet eligible for PTO. Available 6 months after your start date.';
      if (ptoLeft <= 0) return 'You have no PTO days remaining for this year.';
      if (effectiveDays > ptoLeft) return `You only have ${ptoLeft} PTO day${ptoLeft !== 1 ? 's' : ''} left.`;
      if (isShortNotice(todayStr(), leaveStart) && !leaveReason.trim()) {
        return `PTO is normally filed ${ADVANCE_DAYS} days ahead. Please give a reason so HR can review this as an exception.`;
      }
      if (!halfDay && effectiveDays > MAX_CONSECUTIVE) return `PTO cannot exceed ${MAX_CONSECUTIVE} consecutive days in a month.`;
    }
    if (leaveType === 'sick') {
      if (!isEligibleForPTO) return 'Sick leave is available 6 months after your start date.';
      if (sickLeft <= 0) return 'You have no sick leave days remaining for this year.';
      if (effectiveDays > sickLeft) return `You only have ${sickLeft} sick day${sickLeft !== 1 ? 's' : ''} left.`;
    }
    if (leaveType !== 'emergency') {
      for (const b of blackouts) {
        if (leaveStart <= b.end_date && effectiveEnd >= b.start_date)
          return `Your dates overlap with a blackout period${b.reason ? `: "${b.reason}"` : '.'}`;
      }
    }
    return null;
  };

  const submitLeave = async () => {
    const err = validateLeave();
    if (err) { setLeaveError(err); return; }
    if (!user) return;
    setLeaveSaving(true);
    setLeaveError('');
    const { error } = await supabase.from('hub_time_off').insert({
      contractor_id: user.id,
      type: leaveType,
      start_date: leaveStart,
      end_date: halfDay ? leaveStart : leaveEnd,
      half_day: halfDay,
      half_day_period: halfDay ? halfDayPeriod : null,
      reason: leaveReason || null,
      status: 'pending',
    });
    setLeaveSaving(false);
    if (error) {
      console.error('Failed to submit leave request:', error);
      setLeaveError('Failed to submit. Please try again.');
      return;
    }
    setShowLeaveModal(false);
    const days = halfDay ? 0.5 : Math.ceil((new Date(leaveEnd).getTime() - new Date(leaveStart).getTime()) / 86400000) + 1;
    supabase.functions.invoke('notify-internal-request', {
      body: { type: 'time_off', contractor_name: user.full_name, detail: `${leaveType} · ${leaveStart}${halfDay ? '' : ` – ${leaveEnd}`}`, notes: leaveReason || null },
    }).catch(console.error);
    supabase.functions.invoke('notify-admin', {
      body: { type: 'time_off_submitted', data: { contractor_name: user.full_name, leave_type: leaveType, start_date: leaveStart, end_date: halfDay ? leaveStart : leaveEnd, days } },
    }).catch(console.error);
    fetchLeaves();
  };

  const openLeaveModal = () => {
    setLeaveType('pto'); setHalfDay(false); setHalfDayPeriod('morning');
    setLeaveStart(''); setLeaveEnd(''); setLeaveReason(''); setLeaveError('');
    setShowLeaveModal(true);
  };

  const submitOt = async () => {
    if (!otDate) { setOtError('Please select a date.'); return; }
    const h = parseFloat(otHours);
    if (isNaN(h) || h <= 0) { setOtError('Please enter a valid number of hours.'); return; }
    if (h > 12) { setOtError('Maximum 12 overtime hours per request.'); return; }
    if (!user) return;
    setOtSaving(true); setOtError('');
    const { error } = await supabase.from('hub_overtime_requests').insert({ contractor_id: user.id, date: otDate, hours: h, reason: otReason.trim() || null, status: 'pending' });
    setOtSaving(false);
    if (error) {
      console.error('Failed to submit overtime request:', error);
      setOtError('Failed to submit. Please try again.');
      return;
    }
    setShowOtModal(false);
    supabase.functions.invoke('notify-internal-request', {
      body: { type: 'overtime', contractor_name: user.full_name, detail: `${otDate} · ${h}hrs`, notes: otReason.trim() || null },
    }).catch(console.error);
    fetchOts();
  };

  const openOtModal = () => { setOtDate(''); setOtHours(''); setOtReason(''); setOtError(''); setShowOtModal(true); };

  // ── Render ──────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'requests', label: 'General', icon: 'ri-inbox-line' },
    { key: 'timeoff', label: 'Time Off', icon: 'ri-calendar-event-line' },
    { key: 'overtime', label: 'Overtime', icon: 'ri-timer-flash-line' },
  ];

  return (
    <ContractorLayout title="Requests">
      {reqToast && (
        <div className="fixed top-5 right-5 z-[60] bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{reqToast}</div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-5">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${tab === t.key ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <i className={`${t.icon} text-[13px]`}></i>{t.label}
          </button>
        ))}
      </div>

      {/* ── General Requests ─────────────────────────────────────────────────── */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{reqs.length} total request{reqs.length !== 1 ? 's' : ''}</p>
            <button onClick={() => setShowReqModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#111827] text-white text-sm rounded-lg hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-add-line"></i> New Request
            </button>
          </div>
          {reqsLoading ? (
            <div className="flex justify-center py-12"><i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i></div>
          ) : reqs.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
              <i className="ri-inbox-line text-3xl text-gray-200 mb-2 block"></i>
              <p className="text-sm text-gray-400">No requests yet</p>
              <button onClick={() => setShowReqModal(true)} className="mt-3 text-sm text-[#FF6B35] hover:underline cursor-pointer">Create your first request</button>
            </div>
          ) : (
            <div className="space-y-2">
              {reqs.map(r => (
                <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4 cursor-pointer hover:border-gray-200 transition-colors" onClick={() => setSelectedReq(r)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#111827]">{r.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{reqTypeLabels[r.type] || r.type} · {new Date(r.created_at!).toLocaleDateString()}</p>
                      {r.description && <p className="text-sm text-gray-500 mt-1.5 line-clamp-1">{r.description}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap capitalize flex-shrink-0 ${reqStatusColors[r.status]}`}>{r.status.replace('_', ' ')}</span>
                  </div>
                  {r.admin_notes && (
                    <div className="mt-2 pt-2 border-t border-gray-50">
                      <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Admin: </span>{r.admin_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Time Off ─────────────────────────────────────────────────────────── */}
      {tab === 'timeoff' && (
        <div className="space-y-5">
          {/* Balance cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`border border-gray-100 rounded-xl p-4 ${isEligibleForPTO ? 'bg-sky-50' : 'bg-gray-50'}`}>
              <p className="text-xs text-gray-400 mb-1">VL Remaining</p>
              {isEligibleForPTO
                ? <p className="text-2xl font-bold text-sky-600">{ptoLeft}<span className="text-sm font-normal text-gray-300">/{VL_LIMIT}</span></p>
                : <p className="text-sm font-semibold text-gray-400">Unlocks {ptoEligibleLabel}</p>}
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">VL Used</p>
              <p className="text-2xl font-bold text-sky-400">{ptoUsed}<span className="text-sm font-normal text-gray-300">/{VL_LIMIT}</span></p>
            </div>
            <div className="bg-rose-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">SL Remaining</p>
              <p className="text-2xl font-bold text-rose-600">{sickLeft}<span className="text-sm font-normal text-gray-300">/{SL_LIMIT}</span></p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">SL Used</p>
              <p className="text-2xl font-bold text-rose-400">{sickUsed}<span className="text-sm font-normal text-gray-300">/{SL_LIMIT}</span></p>
            </div>
          </div>

          {/* Blackout notices */}
          {blackouts.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-1">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5"><i className="ri-calendar-close-line"></i>Upcoming Blackout Dates</p>
              {blackouts.map((b, i) => (
                <p key={i} className="text-xs text-amber-600">
                  {new Date(b.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(b.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {b.reason && ` · ${b.reason}`}
                </p>
              ))}
            </div>
          )}

          {/* Policy */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5"><i className="ri-information-line"></i>Leave Policy</p>
            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
              <li>VL: 6 days/year · available 6 months after start date · no carryover</li>
              <li>SL: 4 days/year · available 6 months after start date · separate from VL</li>
              <li>PTO must be filed <strong className="text-gray-500">{ADVANCE_DAYS} days in advance</strong> · max 3 consecutive days per month</li>
              <li>Emergencies: notify HR immediately</li>
              <li>Unpaid leave: subject to approval based on workload</li>
              <li>Unused leaves are forfeited at year-end</li>
            </ul>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">{leaves.length} request{leaves.length !== 1 ? 's' : ''}</p>
            <button onClick={openLeaveModal} className="flex items-center gap-1.5 px-4 py-2 bg-[#111827] text-white text-sm rounded-lg hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-add-line"></i> Request Leave
            </button>
          </div>

          {leavesLoading ? (
            <div className="flex justify-center py-12"><i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i></div>
          ) : leaves.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
              <i className="ri-calendar-2-line text-3xl text-gray-200 mb-2 block"></i>
              <p className="text-sm text-gray-400">No leave requests yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaves.map(r => {
                const days = r.half_day ? 0.5 : daysBetween(r.start_date, r.end_date);
                return (
                  <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${toTypeColors[r.type] || 'bg-gray-100 text-gray-600'}`}>{toTypeLabels[r.type] || r.type}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${toStatusColors[r.status] || 'bg-gray-100'}`}>{toStatusLabels[r.status] || r.status}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {days === 0.5 ? `Half day (${r.half_day_period})` : `${days} day${days !== 1 ? 's' : ''}`}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[#111827]">
                          {new Date(r.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {!r.half_day && r.start_date !== r.end_date && <> – {new Date(r.end_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>}
                          {r.half_day && `, ${new Date(r.start_date + 'T12:00:00').getFullYear()}`}
                        </p>
                        {r.reason && <p className="text-xs text-gray-400 mt-0.5">{r.reason}</p>}
                        {r.admin_notes && (
                          <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2">
                            <p className="text-xs text-gray-500"><span className="font-medium">HR: </span>{r.admin_notes}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{new Date(r.created_at!).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Overtime ─────────────────────────────────────────────────────────── */}
      {tab === 'overtime' && (
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-1">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5"><i className="ri-timer-flash-line"></i>Overtime Pre-Approval Required</p>
            <p className="text-xs text-amber-600">All overtime must be pre-approved before it's worked. Submit your request with the date and estimated hours, then wait for HR approval before clocking OT hours.</p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">{ots.length} request{ots.length !== 1 ? 's' : ''}</p>
            <button onClick={openOtModal} className="flex items-center gap-1.5 px-4 py-2 bg-[#111827] text-white text-sm rounded-lg hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-add-line"></i> Request Overtime
            </button>
          </div>

          {otsLoading ? (
            <div className="flex justify-center py-12"><i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i></div>
          ) : ots.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
              <i className="ri-timer-flash-line text-3xl text-gray-200 mb-2 block"></i>
              <p className="text-sm text-gray-400">No overtime requests yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ots.map(r => (
                <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${otStatusColors[r.status] || 'bg-gray-100 text-gray-600'}`}>{otStatusLabels[r.status] || r.status}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">+{r.hours}h OT</span>
                      </div>
                      <p className="text-sm font-medium text-[#111827]">{new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      {r.reason && <p className="text-xs text-gray-400 mt-0.5">{r.reason}</p>}
                      {r.admin_notes && (
                        <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-xs text-gray-500"><span className="font-medium">HR: </span>{r.admin_notes}</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────────── */}

      {/* New General Request modal */}
      {showReqModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-4">
          <div className="bg-white rounded-2xl w-full sm:max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-[#111827]">New Request</h2>
              <button onClick={() => setShowReqModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center"><i className="ri-close-line text-lg"></i></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Request Type</label>
                <select value={reqForm.type} onChange={e => setReqForm({ ...reqForm, type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                  {Object.entries(reqTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Subject *</label>
                <input value={reqForm.title} onChange={e => setReqForm({ ...reqForm, title: e.target.value })}
                  placeholder="Brief subject of your request..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Details</label>
                <textarea value={reqForm.description} onChange={e => setReqForm({ ...reqForm, description: e.target.value })} rows={4}
                  placeholder="Describe your request in detail..." maxLength={500}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none" />
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setShowReqModal(false)} className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={submitReq} disabled={reqSaving || !reqForm.title.trim()}
                className="flex-1 py-2.5 text-sm bg-[#111827] text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap">
                {reqSaving ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request detail modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-4">
          <div className="bg-white rounded-2xl w-full sm:max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-[#111827] truncate pr-4">{selectedReq.title}</h2>
              <button onClick={() => setSelectedReq(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center flex-shrink-0"><i className="ri-close-line text-lg"></i></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${reqStatusColors[selectedReq.status]}`}>{selectedReq.status.replace('_', ' ')}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{reqTypeLabels[selectedReq.type]}</span>
              </div>
              {selectedReq.description && <p className="text-sm text-gray-600">{selectedReq.description}</p>}
              {selectedReq.admin_notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">Admin Response</p>
                  <p className="text-sm text-gray-600">{selectedReq.admin_notes}</p>
                </div>
              )}
              <p className="text-xs text-gray-400">Submitted {new Date(selectedReq.created_at!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
        </div>
      )}

      {/* Request Leave modal — portaled to document.body so it isn't trapped
          inside ContractorLayout's backdrop-filter containing block, which
          otherwise caps its effective stacking order below the fixed bottom
          nav on mobile. */}
      {showLeaveModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-4">
          <div
            className="bg-white rounded-2xl w-full sm:max-w-md max-h-[82vh] lg:max-h-[90vh] overflow-y-auto"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-[#111827]">Request Leave</h2>
              <button onClick={() => setShowLeaveModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center"><i className="ri-close-line text-lg"></i></button>
            </div>
            <div className="p-5 space-y-4">
              {leaveError && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-lg">
                  <i className="ri-error-warning-line text-rose-500 text-sm mt-0.5 flex-shrink-0"></i>
                  <p className="text-xs text-rose-600">{leaveError}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Leave Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(toTypeLabels).map(([val, label]) => {
                    const locked = val === 'pto' && !isEligibleForPTO;
                    return (
                      <button key={val} type="button"
                        onClick={() => { if (!locked) { setLeaveType(val); setLeaveError(''); } }}
                        className={`px-3 py-2.5 text-xs rounded-lg border text-left transition-all ${locked ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed' : leaveType === val ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35] font-medium cursor-pointer' : 'border-gray-200 text-gray-600 hover:border-gray-300 cursor-pointer'}`}>
                        <span className="flex items-center gap-1">{locked && <i className="ri-lock-line text-gray-300 text-[10px]"></i>}{label}</span>
                        {val === 'pto' && <span className="block font-normal mt-0.5 text-[10px]">{locked ? `Available ${ptoEligibleLabel}` : `${ptoLeft}/${VL_LIMIT} days left`}</span>}
                        {val === 'sick' && <span className="block text-gray-400 font-normal mt-0.5">{sickLeft}/{SL_LIMIT} days left</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {leaveType === 'emergency' && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                  <i className="ri-alarm-warning-line text-orange-500 text-sm mt-0.5 flex-shrink-0"></i>
                  <p className="text-xs text-orange-700">Please notify HR immediately in addition to submitting this form.</p>
                </div>
              )}
              {leaveType === 'unpaid' && (
                <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <i className="ri-information-line text-gray-400 text-sm mt-0.5 flex-shrink-0"></i>
                  <p className="text-xs text-gray-500">Unpaid leave is subject to approval based on current workload.</p>
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs font-medium text-gray-700">Half Day</p>
                  <p className="text-xs text-gray-400">Uses 0.5 days from your balance</p>
                </div>
                <button type="button" onClick={() => { setHalfDay(!halfDay); setLeaveEnd(''); setLeaveError(''); }}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${halfDay ? 'bg-[#FF6B35]' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${halfDay ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {halfDay && (
                <div className="grid grid-cols-2 gap-2">
                  {['morning', 'afternoon'].map(p => (
                    <button key={p} type="button" onClick={() => setHalfDayPeriod(p)}
                      className={`py-2 text-xs rounded-lg border transition-all cursor-pointer capitalize ${halfDayPeriod === p ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35] font-medium' : 'border-gray-200 text-gray-600'}`}>{p}</button>
                  ))}
                </div>
              )}
              <div className={`grid gap-3 ${halfDay ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">{halfDay ? 'Date' : 'Start Date'}</label>
                  <input type="date" value={leaveStart}
                    min={leaveType === 'emergency' ? undefined : todayStr()}
                    onChange={e => { setLeaveStart(e.target.value); setLeaveError(''); }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                {!halfDay && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">End Date</label>
                    <input type="date" value={leaveEnd} min={leaveStart || todayStr()}
                      max={leaveType === 'pto' && leaveStart ? addDays(leaveStart, MAX_CONSECUTIVE - 1) : undefined}
                      onChange={e => { setLeaveEnd(e.target.value); setLeaveError(''); }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                  </div>
                )}
              </div>
              {effectiveDays > 0 && (
                <p className="text-xs text-gray-400">
                  Duration: <strong className="text-gray-600">{effectiveDays === 0.5 ? 'Half day' : `${effectiveDays} day${effectiveDays !== 1 ? 's' : ''}`}</strong>
                  {(leaveType === 'pto' || leaveType === 'sick') && (
                    <span className="ml-1 text-gray-400">· leaves {leaveType === 'pto' ? ptoLeft - effectiveDays : sickLeft - effectiveDays} day{(leaveType === 'pto' ? ptoLeft - effectiveDays : sickLeft - effectiveDays) !== 1 ? 's' : ''} remaining</span>
                  )}
                </p>
              )}
              {leaveStart && leaveType !== 'emergency' && blackouts.some(b => leaveStart <= b.end_date && (halfDay ? leaveStart : leaveEnd || leaveStart) >= b.start_date) && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-lg">
                  <i className="ri-calendar-close-line text-rose-500 text-sm mt-0.5 flex-shrink-0"></i>
                  <p className="text-xs text-rose-600">Your selected dates fall within a blackout period.</p>
                </div>
              )}
              {advanceWarning && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <i className="ri-calendar-line text-amber-500 text-sm mt-0.5 flex-shrink-0"></i>
                  <p className="text-xs text-amber-700">{advanceWarning}</p>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Reason <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)} rows={2} placeholder="Brief description..." maxLength={300}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none" />
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setShowLeaveModal(false)} className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={submitLeave} disabled={leaveSaving}
                className="flex-1 py-2.5 text-sm bg-[#111827] text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap">
                {leaveSaving ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Request Overtime modal */}
      {showOtModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-4">
          <div className="bg-white rounded-2xl w-full sm:max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-[#111827]">Request Overtime</h2>
              <button onClick={() => setShowOtModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center"><i className="ri-close-line text-lg"></i></button>
            </div>
            <div className="p-5 space-y-4">
              {otError && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-lg">
                  <i className="ri-error-warning-line text-rose-500 text-sm mt-0.5 flex-shrink-0"></i>
                  <p className="text-xs text-rose-600">{otError}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Date</label>
                  <input type="date" value={otDate} max={todayStr()} onChange={e => { setOtDate(e.target.value); setOtError(''); }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Hours</label>
                  <input type="number" value={otHours} min="0.5" max="12" step="0.5" placeholder="e.g. 2"
                    onChange={e => { setOtHours(e.target.value); setOtError(''); }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Reason <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea value={otReason} onChange={e => setOtReason(e.target.value)} rows={2} placeholder="What work requires overtime?" maxLength={300}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none" />
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setShowOtModal(false)} className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={submitOt} disabled={otSaving}
                className="flex-1 py-2.5 text-sm bg-[#111827] text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap">
                {otSaving ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ContractorLayout>
  );
}

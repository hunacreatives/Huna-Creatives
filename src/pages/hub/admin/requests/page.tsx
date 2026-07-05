import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import TimeOffPanel from './TimeOffPanel';
import { supabase } from '@/lib/supabase';
import { HubRequest, HubUser } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/contexts/DemoContext';
import { DEMO_REQUESTS, DEMO_OVERTIME } from '@/lib/demoData';

type Tab = 'requests' | 'overtime' | 'timeoff';

// ── General requests ──────────────────────────────────────────────────────────

const reqTypeLabels: Record<string, string> = {
  reimbursement: 'Reimbursement', account_access: 'Account Access',
  hr_concern: 'HR Concern', schedule: 'Schedule', equipment: 'Equipment', client_reassignment: 'Client Reassignment',
};
const reqStatusColors: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700', in_review: 'bg-sky-100 text-sky-700',
  resolved: 'bg-emerald-100 text-emerald-700', closed: 'bg-gray-100 text-gray-500',
};

// ── Overtime ──────────────────────────────────────────────────────────────────

const otStatusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};
const otStatusLabels: Record<string, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
};

export default function AdminRequestsPage() {
  const { hubUser } = useAuth();
  const { isDemo } = useDemo();
  // ?tab=timeoff|overtime deep links (old /hub/admin/timeoff route redirects here)
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>(tabParam === 'timeoff' || tabParam === 'overtime' ? tabParam : 'requests');
  const switchTab = (t: Tab) => {
    setTab(t);
    setSearchParams(t === 'requests' ? {} : { tab: t }, { replace: true });
  };

  // ── General requests state ────────────────────────────────────────────────
  const [reqs, setReqs] = useState<HubRequest[]>([]);
  const [reqFilter, setReqFilter] = useState('all');
  const [reqsLoading, setReqsLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<HubRequest | null>(null);
  const [reqNotes, setReqNotes] = useState('');
  const [reqUpdating, setReqUpdating] = useState(false);

  // ── Overtime state ────────────────────────────────────────────────────────
  const [ots, setOts] = useState<any[]>([]);
  const [otFilter, setOtFilter] = useState('pending');
  const [otsLoading, setOtsLoading] = useState(true);
  const [selectedOt, setSelectedOt] = useState<any | null>(null);
  const [otNotes, setOtNotes] = useState('');
  const [otUpdating, setOtUpdating] = useState(false);

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchReqs = async () => {
    setReqsLoading(true);
    let q = supabase.from('hub_requests').select('*, hub_users(full_name, avatar_url, department)').order('created_at', { ascending: false });
    if (reqFilter !== 'all') q = q.eq('status', reqFilter);
    const { data } = await q;
    setReqs((data as HubRequest[]) ?? []);
    setReqsLoading(false);
  };

  const fetchOts = async () => {
    setOtsLoading(true);
    let q = supabase.from('hub_overtime_requests').select('*, hub_users!contractor_id(full_name, avatar_url, department)').order('created_at', { ascending: false });
    if (otFilter !== 'all') q = q.eq('status', otFilter);
    const { data } = await q;
    setOts(data ?? []);
    setOtsLoading(false);
  };

  useEffect(() => {
    if (isDemo) {
      const filtered = reqFilter === 'all' ? DEMO_REQUESTS : DEMO_REQUESTS.filter(r => r.status === reqFilter);
      setReqs(filtered); setReqsLoading(false);
      return;
    }
    fetchReqs();
  }, [isDemo, reqFilter]);

  useEffect(() => {
    if (isDemo) {
      const filtered = otFilter === 'all' ? DEMO_OVERTIME : DEMO_OVERTIME.filter(r => r.status === otFilter);
      setOts(filtered); setOtsLoading(false);
      return;
    }
    fetchOts();
  }, [isDemo, otFilter]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const updateReqStatus = async (id: number, status: string) => {
    setReqUpdating(true);
    const { error } = await supabase.from('hub_requests').update({ status, admin_notes: reqNotes, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      window.alert(`Failed to update request: ${error.message}`);
      return;
    }
    setReqUpdating(false);
    setSelectedReq(null);
    fetchReqs();
  };

  const decideOt = async (status: 'approved' | 'rejected') => {
    if (!selectedOt || !hubUser) return;
    setOtUpdating(true);
    await supabase.from('hub_overtime_requests').update({ status, reviewed_by: hubUser.id, admin_notes: otNotes || null, updated_at: new Date().toISOString() }).eq('id', selectedOt.id);

    if (status === 'approved') {
      // The update above already marked this request approved, so the query below
      // includes it — sum directly, do NOT add selectedOt.hours again (double-count).
      const { data: approvedForDate } = await supabase.from('hub_overtime_requests').select('hours').eq('contractor_id', selectedOt.contractor_id).eq('date', selectedOt.date).eq('status', 'approved');
      const totalOT = (approvedForDate ?? []).reduce((s: number, r: any) => s + (r.hours || 0), 0);
      await supabase.from('hub_daily_hours').upsert({ user_id: selectedOt.contractor_id, date: selectedOt.date, overtime_hours: totalOT, updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' });
    }

    supabase.functions.invoke('notify-overtime-decision', {
      body: {
        contractor_id: selectedOt.contractor_id,
        date: selectedOt.date,
        hours: selectedOt.hours,
        decision: status,
      },
    }).catch(console.error);
    setOtUpdating(false);
    setSelectedOt(null);
    fetchOts();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout title="Request Center">
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-5">
        <button onClick={() => switchTab('requests')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${tab === 'requests' ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <i className="ri-inbox-line text-[13px]"></i>General Requests
        </button>
        <button onClick={() => switchTab('overtime')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${tab === 'overtime' ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <i className="ri-timer-flash-line text-[13px]"></i>Overtime
        </button>
        <button onClick={() => switchTab('timeoff')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${tab === 'timeoff' ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <i className="ri-calendar-event-line text-[13px]"></i>Time-Off
        </button>
      </div>

      {/* ── General Requests ─────────────────────────────────────────────────── */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
              {['all', 'open', 'in_review', 'resolved', 'closed'].map(s => (
                <button key={s} onClick={() => setReqFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap capitalize ${reqFilter === s ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {s === 'all' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400">{reqs.length} request{reqs.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="space-y-3">
            {reqsLoading ? <div className="flex justify-center py-12"><i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i></div>
              : reqs.length === 0 ? <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-sm text-gray-400">No requests found</div>
              : reqs.map(r => (
                <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4 cursor-pointer hover:border-gray-200 transition-colors" onClick={() => { setSelectedReq(r); setReqNotes(r.admin_notes || ''); }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {(r.hub_users as HubUser)?.avatar_url
                        ? <img src={(r.hub_users as HubUser).avatar_url || ''} alt="" className="w-8 h-8 rounded-full object-cover object-top flex-shrink-0 mt-0.5" />
                        : <div className="w-8 h-8 rounded-full bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-[#FF6B35] text-xs font-bold">{(r.hub_users as HubUser)?.full_name?.charAt(0) || '?'}</span></div>
                      }
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#111827] truncate">{r.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{(r.hub_users as HubUser)?.full_name} · {reqTypeLabels[r.type] || r.type} · {new Date(r.created_at!).toLocaleDateString()}</p>
                        {r.description && <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{r.description}</p>}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium flex-shrink-0 capitalize ${reqStatusColors[r.status]}`}>{r.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Overtime ─────────────────────────────────────────────────────────── */}
      {tab === 'overtime' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
              {['pending', 'approved', 'rejected', 'all'].map(s => (
                <button key={s} onClick={() => setOtFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap capitalize ${otFilter === s ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {s === 'all' ? 'All' : otStatusLabels[s] || s}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400">{ots.length} request{ots.length !== 1 ? 's' : ''}</span>
          </div>

          {otsLoading ? (
            <div className="flex justify-center py-12"><i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i></div>
          ) : ots.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
              <i className="ri-timer-flash-line text-3xl text-gray-200 mb-2 block"></i>
              <p className="text-sm text-gray-400">No {otFilter !== 'all' ? otFilter : ''} overtime requests</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Employee', 'Date', 'Hours', 'Reason', 'Status', 'Filed', ''].map(h => (
                        <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ots.map(r => {
                      const u = r.hub_users;
                      return (
                        <tr key={r.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-[#FF6B35] text-xs font-bold">{u?.full_name?.charAt(0) || '?'}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#111827]">{u?.full_name}</p>
                                {u?.department && <p className="text-xs text-gray-400">{u.department}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                            {new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3.5"><span className="text-sm font-semibold text-purple-600">+{r.hours}h</span></td>
                          <td className="px-4 py-3.5 text-xs text-gray-500 max-w-[200px] truncate">{r.reason || <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${otStatusColors[r.status]}`}>{otStatusLabels[r.status] || r.status}</span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3.5">
                            <button onClick={() => { setSelectedOt(r); setOtNotes(''); }}
                              className="text-xs text-gray-500 hover:text-[#FF6B35] cursor-pointer transition-colors font-medium whitespace-nowrap">
                              {r.status === 'pending' ? 'Review' : 'View'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Time-Off (full former Time-Off page: requests · blackouts · balances) ── */}
      {tab === 'timeoff' && <TimeOffPanel />}

      {/* ── Modals ────────────────────────────────────────────────────────────── */}

      {/* General request detail */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md space-y-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-[#111827] truncate pr-4">{selectedReq.title}</h2>
              <button onClick={() => setSelectedReq(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0"><i className="ri-close-line text-lg"></i></button>
            </div>
            <div className="px-5 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${reqStatusColors[selectedReq.status]}`}>{selectedReq.status.replace('_', ' ')}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{reqTypeLabels[selectedReq.type] || selectedReq.type}</span>
              </div>
              {selectedReq.description && <p className="text-sm text-gray-600">{selectedReq.description}</p>}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Admin Notes</label>
                <textarea value={reqNotes} onChange={e => setReqNotes(e.target.value)} rows={3} placeholder="Add notes..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none" />
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0 flex-wrap">
              {['open', 'in_review', 'resolved', 'closed'].map(s => (
                <button key={s} onClick={() => updateReqStatus(selectedReq.id, s)} disabled={reqUpdating || selectedReq.status === s}
                  className={`flex-1 py-2 text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap capitalize disabled:opacity-40 ${s === 'resolved' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : s === selectedReq.status ? 'border border-gray-200 text-gray-400' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Overtime review */}
      {selectedOt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-[#111827]">{selectedOt.hub_users?.full_name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">+{selectedOt.hours}h OT · {new Date(selectedOt.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <button onClick={() => setSelectedOt(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center"><i className="ri-close-line text-lg"></i></button>
            </div>
            <div className="p-5 space-y-4">
              {selectedOt.reason && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Reason</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedOt.reason}</p>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Notes <span className="text-gray-400 font-normal">(visible to employee)</span></label>
                <textarea value={otNotes} onChange={e => setOtNotes(e.target.value)} rows={2} placeholder="Optional notes..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none" />
              </div>
              {selectedOt.status === 'pending' ? (
                <div className="flex gap-2">
                  <button onClick={() => decideOt('approved')} disabled={otUpdating}
                    className="flex-1 py-2.5 text-sm bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap">Approve</button>
                  <button onClick={() => decideOt('rejected')} disabled={otUpdating}
                    className="flex-1 py-2.5 text-sm bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap">Reject</button>
                </div>
              ) : (
                <div className={`text-center py-2 text-sm font-medium rounded-lg ${selectedOt.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {selectedOt.status === 'approved' ? 'Approved' : 'Rejected'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

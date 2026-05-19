import { useEffect, useState } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { HubTimeOff, HubUser } from '@/lib/types';

const typeLabels: Record<string, string> = {
  pto: 'PTO', vacation: 'PTO', sick: 'Sick', emergency: 'Emergency', unpaid: 'Unpaid', other: 'Other',
};
const typeColors: Record<string, string> = {
  pto: 'bg-sky-100 text-sky-700', vacation: 'bg-sky-100 text-sky-700',
  sick: 'bg-rose-100 text-rose-700', emergency: 'bg-orange-100 text-orange-700',
  unpaid: 'bg-gray-100 text-gray-600', other: 'bg-purple-100 text-purple-700',
};
const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  forwarded: 'bg-purple-100 text-purple-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};
const statusLabels: Record<string, string> = {
  pending: 'Pending', forwarded: 'Forwarded', approved: 'Approved', rejected: 'Rejected',
};

const daysBetween = (a: string, b: string) =>
  Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1;

export default function AdminTimeOffPage() {
  const { hubUser } = useAuth();
  const isOwner = hubUser?.role === 'owner';

  const [tab, setTab] = useState<'requests' | 'blackouts'>('requests');
  const [requests, setRequests] = useState<HubTimeOff[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HubTimeOff | null>(null);
  const [hrNotes, setHrNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Blackout dates
  const [blackouts, setBlackouts] = useState<any[]>([]);
  const [bdForm, setBdForm] = useState({ start_date: '', end_date: '', reason: '' });
  const [bdSaving, setBdSaving] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    let q = supabase
      .from('hub_time_off')
      .select('*, hub_users(full_name, avatar_url, department, start_date)')
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setRequests((data as HubTimeOff[]) ?? []);
    setLoading(false);
  };

  const fetchBlackouts = async () => {
    const { data } = await supabase.from('hub_blackout_dates').select('*').order('start_date');
    setBlackouts(data ?? []);
  };

  useEffect(() => { fetchRequests(); }, [statusFilter]);
  useEffect(() => { fetchBlackouts(); }, []);

  const days = (r: HubTimeOff) => r.half_day ? 0.5 : daysBetween(r.start_date, r.end_date);

  const openReview = (r: HubTimeOff) => {
    setSelected(r);
    setHrNotes(r.hr_notes || r.admin_notes || '');
  };

  // HR forwards to owner
  const forwardToOwner = async () => {
    if (!selected) return;
    setUpdating(true);
    await supabase.from('hub_time_off').update({
      status: 'forwarded',
      hr_notes: hrNotes,
      admin_notes: hrNotes,
      forwarded_to_owner: true,
    }).eq('id', selected.id);
    setUpdating(false);
    setSelected(null);
    fetchRequests();
  };

  // Owner approves/rejects
  const ownerDecide = async (status: 'approved' | 'rejected') => {
    if (!selected) return;
    setUpdating(true);
    await supabase.from('hub_time_off').update({
      status,
      admin_notes: hrNotes,
      hr_notes: hrNotes,
    }).eq('id', selected.id);
    setUpdating(false);
    setSelected(null);
    fetchRequests();
  };

  const addBlackout = async () => {
    if (!bdForm.start_date || !bdForm.end_date) return;
    setBdSaving(true);
    await supabase.from('hub_blackout_dates').insert({
      ...bdForm,
      created_by: hubUser?.id,
    });
    setBdForm({ start_date: '', end_date: '', reason: '' });
    setBdSaving(false);
    fetchBlackouts();
  };

  const deleteBlackout = async (id: number) => {
    await supabase.from('hub_blackout_dates').delete().eq('id', id);
    fetchBlackouts();
  };

  const filterTabs = ['pending', 'forwarded', 'approved', 'rejected', 'all'];

  return (
    <AdminLayout title="Time Off">
      <div className="space-y-4 max-w-5xl">

        {/* Tab: Requests / Blackouts */}
        <div className="flex gap-2 border-b border-gray-100 pb-0">
          {[{ key: 'requests', label: 'Leave Requests' }, { key: 'blackouts', label: 'Blackout Dates' }].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                tab === t.key ? 'border-[#FF6B35] text-[#FF6B35]' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'requests' && (
          <>
            {/* Status filter */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                {filterTabs.map((s) => {
                  const count = s === 'all' ? requests.length : requests.filter((r) => r.status === s).length;
                  return (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap capitalize ${
                        statusFilter === s ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      {s === 'all' ? 'All' : statusLabels[s]}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-gray-400">{requests.length} request{requests.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Forwarded banner for owner */}
            {isOwner && statusFilter !== 'forwarded' && requests.filter((r) => r.status === 'forwarded').length > 0 && (
              <div
                className="flex items-center justify-between p-3 bg-purple-50 border border-purple-100 rounded-xl cursor-pointer"
                onClick={() => setStatusFilter('forwarded')}
              >
                <div className="flex items-center gap-2">
                  <i className="ri-send-plane-line text-purple-500 text-sm"></i>
                  <p className="text-xs font-medium text-purple-700">
                    {requests.filter((r) => r.status === 'forwarded').length} request{requests.filter((r) => r.status === 'forwarded').length !== 1 ? 's' : ''} forwarded to you for approval
                  </p>
                </div>
                <span className="text-xs text-purple-500 font-medium">Review →</span>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12"><i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i></div>
            ) : requests.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
                <i className="ri-calendar-check-line text-3xl text-gray-200 mb-2 block"></i>
                <p className="text-sm text-gray-400">No {statusFilter !== 'all' ? statusFilter : ''} requests</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Contractor', 'Type', 'Dates', 'Days', 'Status', 'Filed', ''].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {requests.map((r) => {
                      const u = r.hub_users as HubUser;
                      return (
                        <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-[#FF6B35] text-xs font-bold">{u?.full_name?.charAt(0) || '?'}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#111827]">{u?.full_name}</p>
                                <p className="text-xs text-gray-400">{u?.department}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[r.type] || 'bg-gray-100 text-gray-600'}`}>
                              {typeLabels[r.type] || r.type}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                            {new Date(r.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {!r.half_day && r.start_date !== r.end_date && (
                              <> – {new Date(r.end_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">
                            {r.half_day ? '½' : `${days(r)}d`}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[r.status]}`}>
                              {statusLabels[r.status] || r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                            {new Date(r.created_at!).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3.5">
                            <button onClick={() => openReview(r)}
                              className="text-xs text-gray-500 hover:text-[#FF6B35] cursor-pointer transition-colors font-medium whitespace-nowrap">
                              {r.status === 'forwarded' && isOwner ? 'Decide' : 'Review'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'blackouts' && (
          <div className="space-y-4">
            {/* Add blackout */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[#111827]">Add Blackout Period</h3>
              <p className="text-xs text-gray-400">Contractors cannot file PTO or sick leave during blackout dates. Emergencies are exempt.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Start Date</label>
                  <input type="date" value={bdForm.start_date} onChange={(e) => setBdForm({ ...bdForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">End Date</label>
                  <input type="date" value={bdForm.end_date} min={bdForm.start_date} onChange={(e) => setBdForm({ ...bdForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-gray-700">Reason <span className="text-gray-400 font-normal">(shown to contractors)</span></label>
                  <input value={bdForm.reason} onChange={(e) => setBdForm({ ...bdForm, reason: e.target.value })}
                    placeholder="e.g. Client launch period, Q4 crunch"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
              </div>
              <button onClick={addBlackout} disabled={bdSaving || !bdForm.start_date || !bdForm.end_date}
                className="px-4 py-2 text-sm bg-[#111827] text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap">
                {bdSaving ? 'Adding...' : 'Add Blackout Period'}
              </button>
            </div>

            {/* Blackout list */}
            {blackouts.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
                <i className="ri-calendar-close-line text-3xl text-gray-200 mb-2 block"></i>
                <p className="text-sm text-gray-400">No blackout dates set</p>
              </div>
            ) : (
              <div className="space-y-2">
                {blackouts.map((b) => (
                  <div key={b.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#111827]">
                        {new Date(b.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(b.end_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {b.reason && <p className="text-xs text-gray-400 mt-0.5">{b.reason}</p>}
                    </div>
                    <button onClick={() => deleteBlackout(b.id)}
                      className="text-gray-300 hover:text-rose-400 transition-colors cursor-pointer flex-shrink-0">
                      <i className="ri-delete-bin-line text-sm"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-[#111827]">{(selected.hub_users as HubUser)?.full_name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{typeLabels[selected.type] || selected.type} · {days(selected) === 0.5 ? 'Half day' : `${days(selected)} day${days(selected) !== 1 ? 's' : ''}`}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Start</p>
                  <p className="text-sm font-medium text-[#111827]">
                    {new Date(selected.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {selected.half_day && <span className="block text-xs text-gray-400 font-normal capitalize">{selected.half_day_period}</span>}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">{selected.half_day ? 'Type' : 'End'}</p>
                  <p className="text-sm font-medium text-[#111827]">
                    {selected.half_day ? 'Half day' : new Date(selected.end_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeColors[selected.type]}`}>{typeLabels[selected.type] || selected.type}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[selected.status]}`}>{statusLabels[selected.status]}</span>
              </div>

              {selected.reason && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Contractor's Reason</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selected.reason}</p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  {isOwner ? 'Notes (visible to contractor)' : 'HR Notes (forwarded to owner)'}
                </label>
                <textarea value={hrNotes} onChange={(e) => setHrNotes(e.target.value)} rows={3}
                  placeholder={isOwner ? 'Add notes for the contractor...' : 'Add notes before forwarding to owner...'}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none" />
              </div>

              {/* Action buttons based on role + status */}
              {isOwner ? (
                // Owner can approve/reject forwarded requests
                <div className="flex gap-2">
                  <button onClick={() => ownerDecide('approved')} disabled={updating || selected.status === 'approved'}
                    className="flex-1 py-2.5 text-sm bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap">
                    Approve
                  </button>
                  <button onClick={() => ownerDecide('rejected')} disabled={updating || selected.status === 'rejected'}
                    className="flex-1 py-2.5 text-sm bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap">
                    Reject
                  </button>
                </div>
              ) : (
                // HR/Admin forwards to owner
                <div className="space-y-2">
                  {selected.status === 'forwarded' ? (
                    <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-100 rounded-lg">
                      <i className="ri-check-line text-purple-500 text-sm"></i>
                      <p className="text-xs text-purple-700">Forwarded to owner for final approval.</p>
                    </div>
                  ) : (
                    <button onClick={forwardToOwner} disabled={updating}
                      className="w-full py-2.5 text-sm bg-[#111827] text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
                      <i className="ri-send-plane-line text-sm"></i>
                      Forward to Owner for Approval
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

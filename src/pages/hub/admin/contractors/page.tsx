import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { HubUser } from '@/lib/types';
import AddContractorModal from './AddContractorModal';

type ConfirmAction = { type: 'deactivate' | 'delete' | 'resend-invite'; contractor: HubUser };
type Toast = { id: number; message: string; type: 'success' | 'error' };

export default function ContractorsPage() {
  const navigate = useNavigate();
  const [contractors, setContractors] = useState<HubUser[]>([]);
  const [filtered, setFiltered] = useState<HubUser[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const toastCounter = useRef(0);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const fetchContractors = async () => {
    const { data } = await supabase
      .from('hub_users')
      .select('*')
      .in('role', ['contractor', 'admin'])
      .order('full_name');
    setContractors((data as HubUser[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchContractors(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDeactivate = async (c: HubUser) => {
    setActionLoading(true);
    await supabase.from('hub_users').update({ status: 'inactive' }).eq('id', c.id);
    setActionLoading(false);
    setConfirm(null);
    fetchContractors();
  };

  const handleDelete = async (c: HubUser) => {
    setActionLoading(true);
    await supabase.from('hub_users').delete().eq('id', c.id);
    setActionLoading(false);
    setConfirm(null);
    fetchContractors();
  };

  useEffect(() => {
    let result = contractors;
    if (statusFilter !== 'all') result = result.filter((c) => c.status === statusFilter);
    if (search) result = result.filter((c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.department?.toLowerCase().includes(search.toLowerCase()) ||
      c.slack_username?.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(result);
  }, [contractors, search, statusFilter]);

  const departmentColors: Record<string, string> = {
    Creative: 'bg-pink-100 text-pink-700',
    'Media Buying': 'bg-orange-100 text-orange-700',
    Content: 'bg-amber-100 text-amber-700',
    'Social Media': 'bg-sky-100 text-sky-700',
    Tech: 'bg-violet-100 text-violet-700',
    'Account Management': 'bg-teal-100 text-teal-700',
    SEO: 'bg-green-100 text-green-700',
  };

  return (
    <AdminLayout
      title="Contractors"
      actions={
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-[#FF6B35] text-white text-sm px-3 py-2 rounded-lg hover:bg-[#e55a27] transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-user-add-line text-sm"></i>
          Add Contractor
        </button>
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
              <i className="ri-search-line text-gray-400 text-sm"></i>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, department..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(['all', 'active', 'inactive'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap capitalize ${
                  statusFilter === s ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Contractor</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Department</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Rate</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Slack</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Start Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-sm text-gray-400 py-10">
                        No contractors found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/hub/admin/contractors/${c.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={c.avatar_url || ''}
                              alt={c.full_name}
                              className="w-8 h-8 rounded-full object-cover object-top flex-shrink-0"
                            />
                            <div>
                              <p className="text-sm font-medium text-[#111827]">{c.full_name}</p>
                              <p className="text-xs text-gray-400">{c.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${departmentColors[c.department || ''] || 'bg-gray-100 text-gray-600'}`}>
                            {c.department || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700">
                            {c.payment_type === 'fixed' && c.monthly_rate ? `₱${c.monthly_rate.toLocaleString()}/mo` : c.hourly_rate ? `${c.currency === 'USD' ? '$' : '₱'}${c.hourly_rate}/hr${c.currency === 'USD' ? ' USD' : ''}` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500">{c.slack_username || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                            c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {c.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500">
                            {c.start_date ? new Date(c.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="relative flex items-center justify-end gap-1" ref={openMenu === c.id ? menuRef : null}>
                            <button
                              onClick={() => navigate(`/hub/admin/contractors/${c.id}`)}
                              className="text-gray-400 hover:text-[#FF6B35] transition-colors cursor-pointer p-1"
                            >
                              <i className="ri-arrow-right-s-line text-lg"></i>
                            </button>
                            <button
                              onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1"
                            >
                              <i className="ri-more-2-fill text-sm"></i>
                            </button>
                            {openMenu === c.id && (
                              <div className="absolute right-0 top-8 z-20 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 text-sm">
                                {!c.onboarding_completed && (
                                  <>
                                    <button
                                      onClick={() => { setOpenMenu(null); setConfirm({ type: 'resend-invite', contractor: c }); }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sky-600 hover:bg-sky-50 cursor-pointer"
                                    >
                                      <i className="ri-mail-send-line"></i>
                                      Resend Invite
                                    </button>
                                    <div className="border-t border-gray-50 my-1" />
                                  </>
                                )}
                                {c.status === 'active' ? (
                                  <button
                                    onClick={() => { setOpenMenu(null); setConfirm({ type: 'deactivate', contractor: c }); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-amber-600 hover:bg-amber-50 cursor-pointer"
                                  >
                                    <i className="ri-user-forbid-line"></i>
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    onClick={async () => { setOpenMenu(null); await supabase.from('hub_users').update({ status: 'active' }).eq('id', c.id); fetchContractors(); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                  >
                                    <i className="ri-user-follow-line"></i>
                                    Reactivate
                                  </button>
                                )}
                                <div className="border-t border-gray-50 my-1" />
                                <button
                                  onClick={() => { setOpenMenu(null); setConfirm({ type: 'delete', contractor: c }); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 cursor-pointer"
                                >
                                  <i className="ri-delete-bin-line"></i>
                                  Remove permanently
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400">{filtered.length} contractor{filtered.length !== 1 ? 's' : ''} shown</p>
      </div>

      {showAdd && (
        <AddContractorModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); fetchContractors(); }}
        />
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white pointer-events-auto transition-all ${t.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            <i className={t.type === 'success' ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'}></i>
            {t.message}
          </div>
        ))}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
              confirm.type === 'delete' ? 'bg-rose-100' : confirm.type === 'resend-invite' ? 'bg-sky-100' : 'bg-amber-100'
            }`}>
              <i className={`text-xl ${
                confirm.type === 'delete' ? 'ri-delete-bin-line text-rose-600' : confirm.type === 'resend-invite' ? 'ri-mail-send-line text-sky-600' : 'ri-user-forbid-line text-amber-600'
              }`}></i>
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-[#111827]">
                {confirm.type === 'delete' ? 'Remove contractor?' : confirm.type === 'resend-invite' ? 'Resend invite?' : 'Deactivate contractor?'}
              </h3>
              <p className="text-sm text-gray-500">
                {confirm.type === 'delete'
                  ? <>This will permanently delete <strong>{confirm.contractor.full_name}</strong> and all their data. This cannot be undone.</>
                  : confirm.type === 'resend-invite'
                  ? <>A fresh invite link will be sent to <strong>{confirm.contractor.email}</strong>. Any previous link will no longer work.</>
                  : <>This will mark <strong>{confirm.contractor.full_name}</strong> as inactive. They won't be able to log in. You can reactivate them later.</>
                }
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirm(null)}
                disabled={actionLoading || resendingId !== null}
                className="flex-1 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (confirm.type === 'resend-invite') {
                    setResendingId(confirm.contractor.id);
                    try {
                      const { data, error } = await supabase.functions.invoke('resend-invite', {
                        body: { contractor_id: confirm.contractor.id },
                      });
                      if (error || data?.error) {
                        showToast(data?.error ?? 'Failed to resend invite', 'error');
                      } else {
                        showToast(`Invite resent to ${confirm.contractor.email}`, 'success');
                      }
                    } catch {
                      showToast('Failed to resend invite', 'error');
                    } finally {
                      setResendingId(null);
                      setConfirm(null);
                    }
                  } else if (confirm.type === 'delete') {
                    handleDelete(confirm.contractor);
                  } else {
                    handleDeactivate(confirm.contractor);
                  }
                }}
                disabled={actionLoading || resendingId !== null}
                className={`flex-1 py-2.5 text-sm text-white rounded-lg cursor-pointer disabled:opacity-60 ${
                  confirm.type === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : confirm.type === 'resend-invite' ? 'bg-sky-600 hover:bg-sky-700' : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {(actionLoading || resendingId !== null) ? <i className="ri-loader-4-line animate-spin"></i> : confirm.type === 'delete' ? 'Remove' : confirm.type === 'resend-invite' ? 'Send Invite' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
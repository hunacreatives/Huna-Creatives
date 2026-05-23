import { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { HubPayout, HubUser } from '@/lib/types';
import PayoutEditModal from './PayoutEditModal';
import { useAuth } from '@/contexts/AuthContext';
import { getPeriods, fmtPHP as fmt } from '@/lib/formatUtils';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  reviewed: 'bg-amber-100 text-amber-700',
  approved: 'bg-sky-100 text-sky-700',
  paid: 'bg-emerald-100 text-emerald-700',
};

const STATUS_ICONS: Record<string, string> = {
  draft: 'ri-time-line',
  reviewed: 'ri-shield-check-line',
  approved: 'ri-checkbox-circle-line',
  paid: 'ri-money-dollar-circle-line',
};

function Avatar({ name, avatar_url }: { name: string; avatar_url?: string | null }) {
  if (avatar_url) return <img src={avatar_url} alt={name} className="w-8 h-8 rounded-full object-cover object-top flex-shrink-0" />;
  return (
    <div className="w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
      <span className="text-white text-xs font-bold">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

export default function AdminPayoutsPage() {
  const { hubUser } = useAuth();
  const isOwner = hubUser?.role === 'owner';

  const periods = getPeriods();
  const [selectedPeriod, setSelectedPeriod] = useState(periods[periods.length - 1]);
  const [payouts, setPayouts] = useState<HubPayout[]>([]);
  const [contractors, setContractors] = useState<HubUser[]>([]);
  const [payrollRun, setPayrollRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingPayout, setEditingPayout] = useState<HubPayout | null | undefined>(undefined);
  const [toast, setToast] = useState('');
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetchAll(); }, [selectedPeriod]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 3000);
  };

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: p }, { data: c }, { data: run }] = await Promise.all([
      supabase.from('hub_payouts')
        .select('*, hub_users(full_name, avatar_url, department, payment_type, hourly_rate, monthly_rate, currency)')
        .eq('cutoff_start', selectedPeriod.start)
        .order('created_at', { ascending: true }),
      supabase.from('hub_users').select('*').in('role', ['contractor', 'admin']).eq('status', 'active').order('full_name'),
      supabase.from('hub_payroll_runs').select('*').eq('period_start', selectedPeriod.start).maybeSingle(),
    ]);
    setPayouts((p as HubPayout[]) ?? []);
    setContractors((c as HubUser[]) ?? []);
    setPayrollRun(run ?? null);
    setLoading(false);
  };

  const handleVerify = async (p: HubPayout) => {
    if (p.status !== 'draft') return;
    await supabase.from('hub_payouts').update({ status: 'reviewed', updated_at: new Date().toISOString() }).eq('id', p.id);
    setPayouts(prev => prev.map(x => x.id === p.id ? { ...x, status: 'reviewed' } : x));
    showToast('Payout verified');
  };

  const handleUnverify = async (p: HubPayout) => {
    if (p.status !== 'reviewed') return;
    await supabase.from('hub_payouts').update({ status: 'draft', updated_at: new Date().toISOString() }).eq('id', p.id);
    setPayouts(prev => prev.map(x => x.id === p.id ? { ...x, status: 'draft' } : x));
  };

  const handleSubmitToOwner = async () => {
    if (!hubUser || submitting) return;
    setSubmitting(true);
    const total = payouts.reduce((s, p) => s + Number(p.final_payout || 0), 0);
    const { data, error } = await supabase.from('hub_payroll_runs').insert({
      period_start: selectedPeriod.start,
      period_end: selectedPeriod.end,
      period_label: selectedPeriod.label,
      total_amount: total,
      payout_count: payouts.length,
      status: 'pending',
      submitted_by: hubUser.id,
    }).select('*').single();
    if (!error && data) {
      setPayrollRun(data);
      showToast('Payroll submitted to owner ✓');
    }
    setSubmitting(false);
  };

  const handleApprove = async () => {
    if (!payrollRun || !hubUser) return;
    await supabase.from('hub_payroll_runs').update({ status: 'approved', approved_by: hubUser.id, updated_at: new Date().toISOString() }).eq('id', payrollRun.id);
    // Bulk mark all reviewed → approved
    const ids = payouts.filter(p => p.status === 'reviewed').map(p => p.id);
    if (ids.length) await supabase.from('hub_payouts').update({ status: 'approved', updated_at: new Date().toISOString() }).in('id', ids);
    showToast('Payroll approved');
    fetchAll();
  };

  const handleMarkPaid = async () => {
    if (!payrollRun) return;
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from('hub_payroll_runs').update({ status: 'paid', payment_date: today, updated_at: new Date().toISOString() }).eq('id', payrollRun.id);
    const ids = payouts.filter(p => p.status === 'approved').map(p => p.id);
    if (ids.length) await supabase.from('hub_payouts').update({ status: 'paid', payment_date: today, updated_at: new Date().toISOString() }).in('id', ids);
    showToast('Marked as paid ✓');
    fetchAll();
  };

  const allVerified = payouts.length > 0 && payouts.every(p => p.status !== 'draft');
  const totalPayout = payouts.reduce((s, p) => s + Number(p.final_payout || 0), 0);
  const draftCount = payouts.filter(p => p.status === 'draft').length;
  const reviewedCount = payouts.filter(p => p.status === 'reviewed').length;

  return (
    <AdminLayout title="Payouts">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="space-y-5">

        {/* Period selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Period:</span>
          {periods.map((p) => (
            <button
              key={p.start}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedPeriod.start === p.start ? 'bg-[#111827] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i></div>
        ) : (
          <>
            {/* Payroll run status banner */}
            {payrollRun ? (
              <div className={`rounded-xl p-4 border flex items-center gap-4 ${
                payrollRun.status === 'paid' ? 'bg-emerald-50 border-emerald-100' :
                payrollRun.status === 'approved' ? 'bg-sky-50 border-sky-100' :
                'bg-amber-50 border-amber-100'
              }`}>
                <i className={`text-xl ${
                  payrollRun.status === 'paid' ? 'ri-checkbox-circle-fill text-emerald-500' :
                  payrollRun.status === 'approved' ? 'ri-shield-check-fill text-sky-500' :
                  'ri-time-fill text-amber-500'
                }`}></i>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${
                    payrollRun.status === 'paid' ? 'text-emerald-800' :
                    payrollRun.status === 'approved' ? 'text-sky-800' : 'text-amber-800'
                  }`}>
                    {payrollRun.status === 'paid' ? `Paid — ${payrollRun.payment_date ? new Date(payrollRun.payment_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}` :
                     payrollRun.status === 'approved' ? 'Approved by owner — ready to pay' :
                     'Submitted to owner — awaiting approval'}
                  </p>
                  <p className="text-xs mt-0.5 opacity-70">
                    {payrollRun.payout_count} contractor{payrollRun.payout_count !== 1 ? 's' : ''} · Total: {fmt(payrollRun.total_amount)}
                  </p>
                </div>
                {isOwner && payrollRun.status === 'pending' && (
                  <button onClick={handleApprove} className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 cursor-pointer transition-colors whitespace-nowrap">
                    Approve
                  </button>
                )}
                {isOwner && payrollRun.status === 'approved' && (
                  <button onClick={handleMarkPaid} className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 cursor-pointer transition-colors whitespace-nowrap">
                    Mark as Paid
                  </button>
                )}
              </div>
            ) : (
              /* Summary bar */
              <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 flex items-center gap-6 flex-wrap">
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{payouts.length}</p>
                    <p className="text-xs text-gray-400">Submitted</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-amber-500">{draftCount}</p>
                    <p className="text-xs text-gray-400">Pending review</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-emerald-500">{reviewedCount}</p>
                    <p className="text-xs text-gray-400">Verified</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#FF6B35]">{fmt(totalPayout)}</p>
                    <p className="text-xs text-gray-400">Total</p>
                  </div>
                </div>
                {!isOwner && (
                  <button
                    onClick={handleSubmitToOwner}
                    disabled={!allVerified || submitting || payouts.length === 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#111827] text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap"
                    title={!allVerified ? `${draftCount} payout${draftCount !== 1 ? 's' : ''} still need verification` : ''}
                  >
                    {submitting ? <i className="ri-loader-4-line animate-spin text-sm"></i> : <i className="ri-send-plane-line text-sm"></i>}
                    Submit to Owner
                  </button>
                )}
              </div>
            )}

            {/* Payouts list */}
            {payouts.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
                <i className="ri-file-list-3-line text-3xl text-gray-200 block mb-2"></i>
                <p className="text-sm text-gray-400">No payouts submitted for this period yet.</p>
                <p className="text-xs text-gray-300 mt-1">Contractors submit their payslips from their dashboard.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payouts.map((p) => {
                  const user = p.hub_users as any;
                  const isVerified = p.status !== 'draft';
                  const canEdit = !payrollRun && !isVerified;

                  return (
                    <div key={p.id} className={`bg-white border rounded-xl px-4 py-3.5 flex items-center gap-4 transition-colors ${
                      isVerified ? 'border-gray-100' : 'border-amber-100'
                    }`}>
                      <Avatar name={user?.full_name ?? '?'} avatar_url={user?.avatar_url} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
                          {user?.department && <span className="text-xs text-gray-400">{user.department}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-400">{p.approved_hours}h billed</span>
                          <span className="text-xs text-gray-400">Base: {fmt(Number(p.base_pay))}</span>
                          {Number(p.bonus) + Number(p.incentives) + Number(p.reimbursements) > 0 && (
                            <span className="text-xs text-emerald-600">+{fmt(Number(p.bonus) + Number(p.incentives) + Number(p.reimbursements))} additions</span>
                          )}
                          {Number(p.deductions) + Number(p.advances) + Number(p.penalties) > 0 && (
                            <span className="text-xs text-rose-500">−{fmt(Number(p.deductions) + Number(p.advances) + Number(p.penalties))} deductions</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-bold text-gray-900">{fmt(Number(p.final_payout))}</p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>
                          <i className={`${STATUS_ICONS[p.status]} text-xs`}></i>
                          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </div>

                      {!payrollRun || payrollRun.status === 'pending' ? (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {p.status === 'draft' && (
                            <button
                              onClick={() => handleVerify(p)}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                            >
                              Verify
                            </button>
                          )}
                          {p.status === 'reviewed' && !payrollRun && (
                            <button
                              onClick={() => handleUnverify(p)}
                              className="px-3 py-1.5 bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                            >
                              Undo
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => setEditingPayout(p)}
                              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <i className="ri-edit-line text-sm"></i>
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add payout manually */}
            {!payrollRun && (
              <button
                onClick={() => setEditingPayout(null)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
              >
                <i className="ri-add-line"></i>
                Add payout manually
              </button>
            )}
          </>
        )}
      </div>

      {editingPayout !== undefined && (
        <PayoutEditModal
          payout={editingPayout}
          contractors={contractors}
          onClose={() => setEditingPayout(undefined)}
          onSaved={() => { setEditingPayout(undefined); fetchAll(); showToast('Payout saved!'); }}
        />
      )}
    </AdminLayout>
  );
}

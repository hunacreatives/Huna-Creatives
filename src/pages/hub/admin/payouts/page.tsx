import { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { HubPayout, HubUser } from '@/lib/types';
import PayoutEditModal from './PayoutEditModal';

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  reviewed: 'bg-amber-100 text-amber-700',
  approved: 'bg-orange-100 text-orange-700',
  paid: 'bg-emerald-100 text-emerald-700',
};

const STATUS_FLOW: Record<string, string> = {
  draft: 'reviewed',
  reviewed: 'approved',
  approved: 'paid',
};

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<HubPayout[]>([]);
  const [contractors, setContractors] = useState<HubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCutoff, setFilterCutoff] = useState('all');
  const [editingPayout, setEditingPayout] = useState<HubPayout | null | undefined>(undefined);
  const [toast, setToast] = useState('');
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 3000);
  };

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('hub_payouts').select('*, hub_users(full_name, avatar_url, department, hourly_rate, currency)').order('cutoff_start', { ascending: false }),
      supabase.from('hub_users').select('*').eq('role', 'contractor').eq('status', 'active').order('full_name'),
    ]);
    setPayouts((p as HubPayout[]) ?? []);
    setContractors((c as HubUser[]) ?? []);
    setLoading(false);
  };

  // Build cutoff list for filter
  const cutoffKeys = [...new Set(payouts.map(p => `${p.cutoff_start}|${p.cutoff_end}`))];

  const filtered = payouts.filter(p => {
    const user = p.hub_users as any;
    const name = user?.full_name?.toLowerCase() || '';
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchCutoff = filterCutoff === 'all' || `${p.cutoff_start}|${p.cutoff_end}` === filterCutoff;
    return matchSearch && matchStatus && matchCutoff;
  });

  const totalFiltered = filtered.reduce((s, p) => s + (Number(p.final_payout) || 0), 0);

  const handleAdvanceStatus = async (p: HubPayout) => {
    if (p.locked) return;
    const next = STATUS_FLOW[p.status];
    if (!next) return;
    await supabase.from('hub_payouts').update({
      status: next,
      ...(next === 'paid' ? { payment_date: new Date().toISOString().slice(0, 10) } : {}),
      updated_at: new Date().toISOString(),
    }).eq('id', p.id);
    showToast(`Payout marked as ${next}`);
    fetchAll();
  };

  const handleLock = async (p: HubPayout) => {
    await supabase.from('hub_payouts').update({ locked: !p.locked, updated_at: new Date().toISOString() }).eq('id', p.id);
    showToast(p.locked ? 'Payout unlocked' : 'Payout locked');
    fetchAll();
  };

  return (
    <AdminLayout>
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Payouts</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage contractor payout records by cutoff period</p>
          </div>
          <button
            onClick={() => setEditingPayout(null)}
            className="flex items-center gap-2 bg-[#FF6B35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e55a24] transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line"></i>
            Add Payout
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input
              type="text"
              placeholder="Search contractor..."
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 w-52"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 bg-white cursor-pointer"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 bg-white cursor-pointer"
            value={filterCutoff}
            onChange={e => setFilterCutoff(e.target.value)}
          >
            <option value="all">All Cutoffs</option>
            {cutoffKeys.map(k => {
              const [s, e] = k.split('|');
              const sd = new Date(s); const ed = new Date(e);
              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              return (
                <option key={k} value={k}>
                  {months[sd.getUTCMonth()]} {sd.getUTCDate()} – {months[ed.getUTCMonth()]} {ed.getUTCDate()}, {ed.getUTCFullYear()}
                </option>
              );
            })}
          </select>
          {(search || filterStatus !== 'all' || filterCutoff !== 'all') && (
            <button onClick={() => { setSearch(''); setFilterStatus('all'); setFilterCutoff('all'); }} className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer whitespace-nowrap">
              Clear filters
            </button>
          )}
        </div>

        {/* Total bar */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
          <span className="text-sm text-gray-500">{filtered.length} records</span>
          <span className="text-sm font-semibold text-gray-900">Total: {formatCurrency(totalFiltered)}</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading payouts…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No payout records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Contractor','Cutoff Period','Hours','Rate','Base','Adjustments','Final Payout','Status','Actions'].map(h => (
                      <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const user = p.hub_users as any;
                    const sd = new Date(p.cutoff_start); const ed = new Date(p.cutoff_end);
                    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                    const cutoffLabel = `${months[sd.getUTCMonth()]} ${sd.getUTCDate()} – ${months[ed.getUTCMonth()]} ${ed.getUTCDate()}`;
                    const additions = (Number(p.bonus)||0) + (Number(p.incentives)||0) + (Number(p.reimbursements)||0);
                    const deductions = (Number(p.deductions)||0) + (Number(p.advances)||0) + (Number(p.penalties)||0);
                    const netAdj = additions - deductions;
                    const nextStatus = STATUS_FLOW[p.status];
                    const nextLabels: Record<string, string> = { reviewed: 'Mark Reviewed', approved: 'Approve', paid: 'Mark Paid' };

                    return (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FF6B35]/10 flex-shrink-0">
                              <span className="text-xs font-semibold text-[#FF6B35]">{user?.full_name?.charAt(0)}</span>
                            </div>
                            <span className="font-medium text-gray-800 whitespace-nowrap">{user?.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{cutoffLabel}</td>
                        <td className="px-4 py-3 text-gray-600">{p.approved_hours}h</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">${p.hourly_rate}/hr</td>
                        <td className="px-4 py-3 text-gray-800">{formatCurrency(Number(p.base_pay))}</td>
                        <td className="px-4 py-3">
                          {netAdj === 0 ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            <span className={netAdj > 0 ? 'text-emerald-600' : 'text-red-500'}>
                              {netAdj > 0 ? '+' : ''}{formatCurrency(netAdj)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(Number(p.final_payout))}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[p.status]}`}>
                              {p.status}
                            </span>
                            {p.locked && <i className="ri-lock-line text-gray-400 text-xs"></i>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {nextStatus && !p.locked && (
                              <button
                                onClick={() => handleAdvanceStatus(p)}
                                className="text-xs bg-gray-100 hover:bg-[#FF6B35] hover:text-white text-gray-600 px-2 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                              >
                                {nextLabels[nextStatus]}
                              </button>
                            )}
                            {!p.locked && (
                              <button
                                onClick={() => setEditingPayout(p)}
                                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                              >
                                <i className="ri-edit-line text-sm"></i>
                              </button>
                            )}
                            <button
                              onClick={() => handleLock(p)}
                              className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer ${p.locked ? 'text-amber-500 hover:bg-amber-50' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'}`}
                              title={p.locked ? 'Unlock' : 'Lock'}
                            >
                              <i className={`text-sm ${p.locked ? 'ri-lock-line' : 'ri-lock-unlock-line'}`}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
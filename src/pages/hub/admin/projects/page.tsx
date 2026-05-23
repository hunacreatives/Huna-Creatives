import { useEffect, useState } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const statusCfg: Record<string, { label: string; cls: string }> = {
  ongoing:   { label: 'Ongoing',   cls: 'bg-sky-100 text-sky-700' },
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
  paused:    { label: 'Paused',    cls: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' },
};

interface ContractorPayout { id: number; amount: number; paid_at: string; notes: string | null; }

interface Project {
  id: number; client_name: string; project_name: string; service: string | null;
  contract_price: number; status: string; start_date: string | null; deadline: string | null; notes: string | null;
  hub_project_payments: { id: number; amount: number; paid_at: string; notes: string | null }[];
  hub_project_costs: { id: number; label: string; amount: number; date: string }[];
  hub_project_contractors: {
    id: number; percentage: number; payout_type: string; fixed_amount: number | null;
    payout_status: string; paid_at: string | null; notes: string | null;
    hub_users: { id: string; full_name: string; avatar_url: string | null };
    hub_project_contractor_payouts: ContractorPayout[];
  }[];
}

interface Contractor { id: string; full_name: string; avatar_url: string | null; project_percentage: number | null; department: string | null; }

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) return <img src={url} alt={name} className="w-7 h-7 rounded-full object-cover object-top flex-shrink-0" />;
  return <div className="w-7 h-7 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-bold">{name[0].toUpperCase()}</span></div>;
}

export default function AdminProjectsPage() {
  const { hubUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);

  // Project form
  const SERVICES = ['Website Design', 'Website Maintenance', 'Branding & Identity', 'Graphic Design', 'Social Media Management', 'Content Creation', 'SEO', 'Digital Ads', 'Email Marketing', 'Other'];
  const emptyForm = { client_name: '', project_name: '', service: 'Website Design', contract_price: '', status: 'ongoing', start_date: '', deadline: '', notes: '' };
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Payment log
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState('');
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState('');

  // Cost log
  const [costLabel, setCostLabel] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [costDate, setCostDate] = useState(new Date().toISOString().slice(0, 10));
  const [costSaving, setCostSaving] = useState(false);
  const [costError, setCostError] = useState('');

  // Contractor assignment
  const [addCtxId, setAddCtxId] = useState('');
  const [addCtxPayoutType, setAddCtxPayoutType] = useState<'percentage' | 'fixed'>('percentage');
  const [addCtxPct, setAddCtxPct] = useState('');
  const [addCtxFixed, setAddCtxFixed] = useState('');
  const [ctxSaving, setCtxSaving] = useState(false);

  // Staged contractor payouts: keyed by hub_project_contractors.id
  const [ctxPayForm, setCtxPayForm] = useState<Record<number, { amount: string; date: string; notes: string }>>({});
  const [ctxPaySaving, setCtxPaySaving] = useState<Record<number, boolean>>({});
  const [ctxPayError, setCtxPayError] = useState<Record<number, string>>({});

  const fetchAll = async () => {
    const [pRes, cRes] = await Promise.all([
      supabase.from('hub_projects')
        .select('*, hub_project_payments(id, amount, paid_at, notes), hub_project_costs(id, label, amount, date), hub_project_contractors(id, percentage, payout_type, fixed_amount, payout_status, paid_at, notes, hub_users(id, full_name, avatar_url), hub_project_contractor_payouts(id, amount, paid_at, notes))')
        .order('created_at', { ascending: false }),
      supabase.from('hub_users').select('id, full_name, avatar_url, project_percentage, department')
        .eq('status', 'active').order('full_name'),
    ]);
    setProjects((pRes.data as Project[]) ?? []);
    setContractors((cRes.data as Contractor[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const activeProject = projects.find(p => p.id === activeId) ?? null;

  const derived = (p: Project) => {
    const totalPaid = p.hub_project_payments.reduce((s, x) => s + x.amount, 0);
    const totalCosts = p.hub_project_costs.reduce((s, x) => s + x.amount, 0);
    const netProfit = p.contract_price - totalCosts;
    const balance = p.contract_price - totalPaid;
    const paidPct = p.contract_price > 0 ? (totalPaid / p.contract_price) * 100 : 0;
    return { totalPaid, totalCosts, netProfit, balance, paidPct };
  };

  const saveProject = async () => {
    if (!form.client_name.trim() || !form.project_name.trim() || !form.contract_price) { setFormError('Client, project name and contract price are required.'); return; }
    setFormSaving(true); setFormError('');
    const payload = { client_name: form.client_name.trim(), project_name: form.project_name.trim(), service: form.service || null, contract_price: parseFloat(form.contract_price), status: form.status, start_date: form.start_date || null, deadline: form.deadline || null, notes: form.notes || null };
    if (editingProject) {
      const { error } = await supabase.from('hub_projects').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingProject.id);
      if (error) { setFormError(error.message); setFormSaving(false); return; }
      logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'update', entity_type: 'project', entity_id: String(editingProject.id), description: `Updated project "${form.project_name}"` });
    } else {
      const { data, error } = await supabase.from('hub_projects').insert(payload).select('id').single();
      if (error) { setFormError(error.message); setFormSaving(false); return; }
      logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'create', entity_type: 'project', description: `Created project "${form.project_name}" for ${form.client_name}` });
      if (data) setActiveId(data.id);
    }
    setFormSaving(false); setShowForm(false); setEditingProject(null); setForm(emptyForm);
    fetchAll();
  };

  const logPayment = async () => {
    if (!activeId || !payAmount) return;
    setPaySaving(true); setPayError('');
    const { error } = await supabase.from('hub_project_payments').insert({
      project_id: activeId, amount: parseFloat(payAmount), paid_at: payDate, notes: payNotes || null,
    });
    setPaySaving(false);
    if (error) { setPayError(error.message); return; }
    setPayAmount(''); setPayNotes('');
    fetchAll();
  };

  const logCost = async () => {
    if (!activeId || !costLabel.trim() || !costAmount) return;
    setCostSaving(true); setCostError('');
    const { error } = await supabase.from('hub_project_costs').insert({
      project_id: activeId, label: costLabel.trim(), amount: parseFloat(costAmount), date: costDate,
    });
    setCostSaving(false);
    if (error) { setCostError(error.message); return; }
    setCostLabel(''); setCostAmount('');
    fetchAll();
  };

  const deletePayment = async (pid: number) => {
    await supabase.from('hub_project_payments').delete().eq('id', pid);
    fetchAll();
  };

  const deleteCost = async (cid: number) => {
    await supabase.from('hub_project_costs').delete().eq('id', cid);
    fetchAll();
  };

  const addContractor = async () => {
    if (!activeId || !addCtxId) return;
    if (addCtxPayoutType === 'percentage' && !addCtxPct) return;
    if (addCtxPayoutType === 'fixed' && !addCtxFixed) return;
    setCtxSaving(true);
    await supabase.from('hub_project_contractors').upsert({
      project_id: activeId,
      contractor_id: addCtxId,
      payout_type: addCtxPayoutType,
      percentage: addCtxPayoutType === 'percentage' ? parseFloat(addCtxPct) : 0,
      fixed_amount: addCtxPayoutType === 'fixed' ? parseFloat(addCtxFixed) : null,
    }, { onConflict: 'project_id,contractor_id' });
    setAddCtxId(''); setAddCtxPct(''); setAddCtxFixed(''); setCtxSaving(false);
    fetchAll();
  };

  const removeContractor = async (id: number) => {
    await supabase.from('hub_project_contractors').delete().eq('id', id);
    fetchAll();
  };

  const logContractorPayout = async (pcId: number, cut: number, contractorName: string) => {
    const form = ctxPayForm[pcId];
    if (!form?.amount) return;
    setCtxPaySaving(p => ({ ...p, [pcId]: true }));
    setCtxPayError(p => ({ ...p, [pcId]: '' }));
    const { error } = await supabase.from('hub_project_contractor_payouts').insert({
      project_contractor_id: pcId,
      amount: parseFloat(form.amount),
      paid_at: form.date || new Date().toISOString().slice(0, 10),
      notes: form.notes || null,
    });
    setCtxPaySaving(p => ({ ...p, [pcId]: false }));
    if (error) { setCtxPayError(p => ({ ...p, [pcId]: error.message })); return; }
    setCtxPayForm(p => ({ ...p, [pcId]: { amount: '', date: new Date().toISOString().slice(0, 10), notes: '' } }));
    logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'approve', entity_type: 'project_payout', description: `Logged payout of ₱${form.amount} to ${contractorName}` });
    // auto-mark paid if fully paid
    const pc = projects.flatMap(p => p.hub_project_contractors).find(x => x.id === pcId);
    if (pc) {
      const prev = pc.hub_project_contractor_payouts.reduce((s, x) => s + x.amount, 0);
      if (prev + parseFloat(form.amount) >= cut) {
        await supabase.from('hub_project_contractors').update({ payout_status: 'paid', paid_at: new Date().toISOString() }).eq('id', pcId);
      }
    }
    fetchAll();
  };

  const deleteContractorPayout = async (payoutId: number) => {
    await supabase.from('hub_project_contractor_payouts').delete().eq('id', payoutId);
    fetchAll();
  };

  const filtered = projects.filter(p =>
    !search || p.client_name.toLowerCase().includes(search.toLowerCase()) || p.project_name.toLowerCase().includes(search.toLowerCase())
  );

  // Group by service
  const grouped = filtered.reduce<Record<string, Project[]>>((acc, p) => {
    const key = p.service || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const deadlineStatus = (deadline: string | null, status: string) => {
    if (!deadline || status === 'completed' || status === 'cancelled') return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(deadline); due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, cls: 'bg-red-100 text-red-600' };
    if (diff <= 7) return { label: `${diff}d left`, cls: 'bg-amber-100 text-amber-600' };
    return null;
  };

  const summaryTotals = (() => {
    let contractValue = 0, costs = 0, collected = 0;
    for (const p of projects) {
      contractValue += p.contract_price;
      costs += p.hub_project_costs.reduce((s, x) => s + x.amount, 0);
      collected += p.hub_project_payments.reduce((s, x) => s + x.amount, 0);
    }
    const netProfit = contractValue - costs;
    const collectionPct = contractValue > 0 ? Math.min((collected / contractValue) * 100, 100) : 0;
    return { contractValue, costs, netProfit, collected, collectionPct };
  })();

  return (
    <AdminLayout title="Projects">
      <div className="space-y-4">

      {/* Summary strip */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Contract Value', value: fmt(summaryTotals.contractValue), icon: 'ri-file-list-3-line', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-100' },
            { label: 'Operational Costs', value: fmt(summaryTotals.costs), icon: 'ri-subtract-line', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
            { label: 'Net Profit', value: fmt(summaryTotals.netProfit), icon: 'ri-line-chart-line', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
            { label: 'Collected from Clients', value: `${fmt(summaryTotals.collected)} (${summaryTotals.collectionPct.toFixed(0)}%)`, icon: 'ri-money-dollar-circle-line', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          ].map(card => (
            <div key={card.label} className={`bg-white border ${card.border} rounded-xl p-4`}>
              <div className={`w-7 h-7 ${card.bg} rounded-lg flex items-center justify-center mb-2`}>
                <i className={`${card.icon} ${card.color} text-sm`}></i>
              </div>
              <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-5 h-[calc(100vh-220px)]">

        {/* Left: project list */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
            </div>
            <button onClick={() => { setEditingProject(null); setForm(emptyForm); setShowForm(true); }}
              className="flex items-center gap-1 px-3 py-2 bg-[#111827] text-white text-xs rounded-lg hover:bg-gray-800 cursor-pointer whitespace-nowrap">
              <i className="ri-add-line"></i> New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {loading ? (
              <div className="flex justify-center py-8"><i className="ri-loader-4-line animate-spin text-gray-300 text-xl"></i></div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No projects yet.</p>
            ) : Object.entries(grouped).map(([service, items]) => (
              <div key={service}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1.5">{service}</p>
                <div className="space-y-2">
                  {items.map(p => {
                    const d = derived(p);
                    const cfg = statusCfg[p.status] ?? statusCfg.ongoing;
                    const dl = deadlineStatus(p.deadline, p.status);
                    return (
                      <button key={p.id} onClick={() => setActiveId(p.id)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${activeId === p.id ? 'border-[#FF6B35] bg-orange-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#111827] leading-tight truncate">{p.project_name}</p>
                            <p className="text-[11px] text-gray-400">{p.client_name}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
                            {dl && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${dl.cls}`}>{dl.label}</span>}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                            <span>{fmt(d.totalPaid)} collected</span>
                            <span>{fmtPct(d.paidPct)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${d.paidPct >= 100 ? 'bg-emerald-400' : dl?.cls.includes('red') ? 'bg-red-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(d.paidPct, 100)}%` }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: project detail */}
        {activeProject ? (() => {
          const d = derived(activeProject);
          const cfg = statusCfg[activeProject.status] ?? statusCfg.ongoing;
          const unassigned = contractors.filter(c => !activeProject.hub_project_contractors.some(pc => pc.hub_users?.id === c.id));

          return (
            <div className="flex-1 overflow-y-auto space-y-4 min-w-0">
              {/* Header */}
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-[#111827] text-lg">{activeProject.project_name}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{activeProject.client_name}{activeProject.service ? ` · ${activeProject.service}` : ''}</p>
                    {(activeProject.start_date || activeProject.deadline) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {activeProject.start_date && `Started ${new Date(activeProject.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                        {activeProject.start_date && activeProject.deadline && ' · '}
                        {activeProject.deadline && `Due ${new Date(activeProject.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </p>
                    )}
                  </div>
                  <button onClick={() => { setEditingProject(activeProject); setForm({ client_name: activeProject.client_name, project_name: activeProject.project_name, service: activeProject.service || '', contract_price: String(activeProject.contract_price), status: activeProject.status, start_date: activeProject.start_date || '', deadline: activeProject.deadline || '', notes: activeProject.notes || '' }); setShowForm(true); }}
                    className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer flex items-center gap-1 flex-shrink-0">
                    <i className="ri-edit-line"></i> Edit
                  </button>
                </div>

                {/* Financials */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {[
                    { label: 'Contract Price', value: fmt(activeProject.contract_price), sub: null, color: 'text-gray-900' },
                    { label: 'Operational Costs', value: fmt(d.totalCosts), sub: null, color: 'text-rose-600' },
                    { label: 'Net Profit', value: fmt(d.netProfit), sub: 'after costs', color: 'text-emerald-600' },
                    { label: 'Balance Due', value: fmt(d.balance), sub: `${fmtPct(d.paidPct)} collected`, color: d.balance > 0 ? 'text-amber-600' : 'text-emerald-600' },
                  ].map(card => (
                    <div key={card.label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{card.label}</p>
                      <p className={`text-base font-bold mt-0.5 ${card.color}`}>{card.value}</p>
                      {card.sub && <p className="text-[10px] text-gray-400 mt-0.5">{card.sub}</p>}
                    </div>
                  ))}
                </div>

                {/* Collection progress */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Client payments</span>
                    <span>{fmt(d.totalPaid)} of {fmt(activeProject.contract_price)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${Math.min(d.paidPct, 100)}%` }} />
                  </div>
                </div>
                {activeProject.notes && <p className="text-xs text-gray-400 italic mt-3">{activeProject.notes}</p>}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Client Payments */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client Payments</p>
                  {activeProject.hub_project_payments.length === 0 ? (
                    <p className="text-xs text-gray-400">No payments logged yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeProject.hub_project_payments.map((pp) => (
                        <div key={pp.id} className="flex items-start justify-between gap-2 p-2.5 bg-gray-50 rounded-lg">
                          <div>
                            <span className="text-sm font-semibold text-emerald-600">{fmt(pp.amount)}</span>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[11px] text-gray-400">
                                <i className="ri-calendar-line text-[10px] mr-0.5"></i>
                                {pp.paid_at ? new Date(pp.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                              </span>
                              {pp.notes && (
                                <span className="text-[11px] text-gray-500">
                                  · <i className="ri-file-text-line text-[10px] mr-0.5"></i>{pp.notes}
                                </span>
                              )}
                            </div>
                          </div>
                          <button onClick={() => deletePayment(pp.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer flex-shrink-0 mt-0.5"><i className="ri-delete-bin-line text-xs"></i></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex gap-2">
                      <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Amount"
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                      <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                        className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Notes (optional)"
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                      <button onClick={logPayment} disabled={!payAmount || paySaving}
                        className="px-3 py-1.5 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                        {paySaving ? '...' : '+ Log'}
                      </button>
                    </div>
                    {payError && <p className="text-xs text-red-500">{payError}</p>}
                  </div>
                </div>

                {/* Operational Costs */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Operational Costs</p>
                  {activeProject.hub_project_costs.length === 0 ? (
                    <p className="text-xs text-gray-400">No costs logged yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {activeProject.hub_project_costs.map(cc => (
                        <div key={cc.id} className="flex items-center justify-between gap-2 text-sm">
                          <div>
                            <span className="text-gray-700 text-xs">{cc.label}</span>
                            <span className="font-medium text-rose-500 ml-2">{fmt(cc.amount)}</span>
                            <span className="text-xs text-gray-400 ml-1">· {new Date(cc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          <button onClick={() => deleteCost(cc.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer"><i className="ri-delete-bin-line text-xs"></i></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex gap-2">
                      <input value={costLabel} onChange={e => setCostLabel(e.target.value)} placeholder="e.g. Hosting, Domain"
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                      <input type="number" value={costAmount} onChange={e => setCostAmount(e.target.value)} placeholder="Amount"
                        className="w-24 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <input type="date" value={costDate} onChange={e => setCostDate(e.target.value)}
                        className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                      <button onClick={logCost} disabled={!costLabel.trim() || !costAmount || costSaving}
                        className="flex-1 px-3 py-1.5 bg-rose-500 text-white text-xs rounded-lg hover:bg-rose-600 cursor-pointer disabled:opacity-40">
                        {costSaving ? '...' : '+ Log Cost'}
                      </button>
                    </div>
                    {costError && <p className="text-xs text-red-500">{costError}</p>}
                  </div>
                </div>
              </div>

              {/* Team & Payouts */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Team & Payouts</p>
                <p className="text-[11px] text-gray-400">Based on net profit of <strong className="text-emerald-600">{fmt(d.netProfit)}</strong></p>

                {activeProject.hub_project_contractors.length === 0 ? (
                  <p className="text-xs text-gray-400">No contractors assigned to this project yet.</p>
                ) : (
                  <div className="space-y-3">
                    {activeProject.hub_project_contractors.map(pc => {
                      const u = pc.hub_users;
                      if (!u) return null;
                      const isFixed = pc.payout_type === 'fixed';
                      const cut = isFixed ? (pc.fixed_amount ?? 0) : d.netProfit * (pc.percentage / 100);
                      const totalPaidOut = pc.hub_project_contractor_payouts.reduce((s, x) => s + x.amount, 0);
                      const paidPct = cut > 0 ? Math.min((totalPaidOut / cut) * 100, 100) : 0;
                      const isFullyPaid = totalPaidOut >= cut && cut > 0;
                      const pf = ctxPayForm[pc.id] ?? { amount: '', date: new Date().toISOString().slice(0, 10), notes: '' };
                      const setPf = (patch: Partial<typeof pf>) => setCtxPayForm(prev => ({ ...prev, [pc.id]: { ...pf, ...patch } }));
                      return (
                        <div key={pc.id} className="border border-gray-100 rounded-xl overflow-hidden">
                          {/* Contractor header */}
                          <div className="flex items-center gap-3 p-3 bg-gray-50">
                            <Avatar name={u.full_name} url={u.avatar_url} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-gray-800">{u.full_name}</p>
                                {isFixed
                                  ? <span className="text-xs text-gray-400">Fixed fee → <strong className="text-[#111827]">{fmt(cut)}</strong></span>
                                  : <span className="text-xs text-gray-400">{pc.percentage}% → <strong className="text-[#111827]">{fmt(cut)}</strong></span>
                                }
                                {isFullyPaid
                                  ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Paid in full</span>
                                  : totalPaidOut > 0
                                    ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{fmt(totalPaidOut)} paid</span>
                                    : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Unpaid</span>
                                }
                              </div>
                              <div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden w-full">
                                <div className={`h-full rounded-full transition-all ${isFullyPaid ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${paidPct}%` }} />
                              </div>
                            </div>
                            <button onClick={() => removeContractor(pc.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer flex-shrink-0"><i className="ri-delete-bin-line text-xs"></i></button>
                          </div>

                          {/* Payout history */}
                          {pc.hub_project_contractor_payouts.length > 0 && (
                            <div className="px-3 py-2 space-y-1.5 border-t border-gray-100">
                              {pc.hub_project_contractor_payouts.map(pp => (
                                <div key={pp.id} className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <i className="ri-arrow-right-line text-gray-300 text-[10px]"></i>
                                    <span className="font-semibold text-emerald-600">{fmt(pp.amount)}</span>
                                    <span className="text-gray-400">{new Date(pp.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    {pp.notes && <span className="text-gray-400">· {pp.notes}</span>}
                                  </div>
                                  <button onClick={() => deleteContractorPayout(pp.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer"><i className="ri-delete-bin-line text-[10px]"></i></button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Log payout form */}
                          {!isFullyPaid && (
                            <div className="px-3 py-2.5 border-t border-gray-100 bg-white space-y-2">
                              <div className="flex gap-2">
                                <input type="number" value={pf.amount} onChange={e => setPf({ amount: e.target.value })} placeholder={`Amount (of ${fmt(cut)})`}
                                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                                <input type="date" value={pf.date} onChange={e => setPf({ date: e.target.value })}
                                  className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                              </div>
                              <div className="flex gap-2">
                                <input value={pf.notes} onChange={e => setPf({ notes: e.target.value })} placeholder="Notes (optional)"
                                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                                <button onClick={() => logContractorPayout(pc.id, cut, u.full_name)} disabled={!pf.amount || ctxPaySaving[pc.id]}
                                  className="px-3 py-1.5 bg-[#111827] text-white text-xs rounded-lg hover:bg-gray-800 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                                  {ctxPaySaving[pc.id] ? '...' : '+ Payout'}
                                </button>
                              </div>
                              {ctxPayError[pc.id] && <p className="text-xs text-red-500">{ctxPayError[pc.id]}</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {unassigned.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex gap-2">
                      <select value={addCtxId} onChange={e => {
                        setAddCtxId(e.target.value);
                        const c = contractors.find(x => x.id === e.target.value);
                        if (c?.project_percentage) setAddCtxPct(String(c.project_percentage));
                      }}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white">
                        <option value="">Add contractor...</option>
                        {unassigned.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.department ? ` — ${c.department}` : ''}</option>)}
                      </select>
                      {/* Payout type toggle */}
                      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs flex-shrink-0">
                        <button onClick={() => setAddCtxPayoutType('percentage')}
                          className={`px-2.5 py-1.5 cursor-pointer transition-colors ${addCtxPayoutType === 'percentage' ? 'bg-[#111827] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                          %
                        </button>
                        <button onClick={() => setAddCtxPayoutType('fixed')}
                          className={`px-2.5 py-1.5 cursor-pointer transition-colors border-l border-gray-200 ${addCtxPayoutType === 'fixed' ? 'bg-[#111827] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                          ₱
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {addCtxPayoutType === 'percentage' ? (
                        <div className="relative flex-1">
                          <input type="number" value={addCtxPct} onChange={e => setAddCtxPct(e.target.value)} placeholder="%" min="1" max="100"
                            className="w-full px-2.5 py-1.5 pr-6 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                      ) : (
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₱</span>
                          <input type="number" value={addCtxFixed} onChange={e => setAddCtxFixed(e.target.value)} placeholder="Fixed fee amount"
                            className="w-full pl-6 pr-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                        </div>
                      )}
                      <button onClick={addContractor} disabled={!addCtxId || (addCtxPayoutType === 'percentage' ? !addCtxPct : !addCtxFixed) || ctxSaving}
                        className="px-3 py-1.5 bg-[#111827] text-white text-xs rounded-lg hover:bg-gray-800 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                        {ctxSaving ? '...' : 'Add'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })() : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                <i className="ri-folder-open-line text-2xl text-gray-300"></i>
              </div>
              <p className="text-sm">Select a project to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Project form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-[#111827]">{editingProject ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={() => { setShowForm(false); setEditingProject(null); }} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center"><i className="ri-close-line text-lg"></i></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Client Name *</label>
                  <input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="e.g. FS Architects"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Project Name *</label>
                  <input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} placeholder="e.g. fsarchitects.ph"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Service</label>
                  <select value={SERVICES.includes(form.service) ? form.service : 'Other'}
                    onChange={e => setForm({ ...form, service: e.target.value === 'Other' ? '' : e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {!SERVICES.slice(0, -1).includes(form.service) && (
                    <input value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}
                      placeholder="Describe the service..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] mt-1.5" />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Contract Price (PHP) *</label>
                  <input type="number" value={form.contract_price} onChange={e => setForm({ ...form, contract_price: e.target.value })} placeholder="0.00"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Deadline</label>
                  <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any notes..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none" />
              </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => { setShowForm(false); setEditingProject(null); }} className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button onClick={saveProject} disabled={formSaving}
                className="flex-1 py-2.5 text-sm bg-[#FF6B35] text-white rounded-lg hover:bg-[#e55a27] disabled:opacity-40 cursor-pointer">
                {formSaving ? 'Saving...' : editingProject ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}

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

interface Project {
  id: number; client_name: string; project_name: string; service: string | null;
  contract_price: number; status: string; start_date: string | null; deadline: string | null; notes: string | null;
  hub_project_payments: { amount: number }[];
  hub_project_costs: { id: number; label: string; amount: number; date: string }[];
  hub_project_contractors: {
    id: number; percentage: number; payout_status: string; paid_at: string | null; notes: string | null;
    hub_users: { id: string; full_name: string; avatar_url: string | null };
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

  // Cost log
  const [costLabel, setCostLabel] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [costDate, setCostDate] = useState(new Date().toISOString().slice(0, 10));
  const [costSaving, setCostSaving] = useState(false);

  // Contractor assignment
  const [addCtxId, setAddCtxId] = useState('');
  const [addCtxPct, setAddCtxPct] = useState('');
  const [ctxSaving, setCtxSaving] = useState(false);

  const fetchAll = async () => {
    const [pRes, cRes] = await Promise.all([
      supabase.from('hub_projects')
        .select('*, hub_project_payments(amount), hub_project_costs(id, label, amount, date), hub_project_contractors(id, percentage, payout_status, paid_at, notes, hub_users(id, full_name, avatar_url))')
        .order('created_at', { ascending: false }),
      supabase.from('hub_users').select('id, full_name, avatar_url, project_percentage, department')
        .eq('status', 'active').eq('payment_type', 'project_based').order('full_name'),
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
    setPaySaving(true);
    await supabase.from('hub_project_payments').insert({ project_id: activeId, amount: parseFloat(payAmount), paid_at: payDate, notes: payNotes || null });
    setPayAmount(''); setPayNotes(''); setPaySaving(false);
    fetchAll();
  };

  const logCost = async () => {
    if (!activeId || !costLabel.trim() || !costAmount) return;
    setCostSaving(true);
    await supabase.from('hub_project_costs').insert({ project_id: activeId, label: costLabel.trim(), amount: parseFloat(costAmount), date: costDate });
    setCostLabel(''); setCostAmount(''); setCostSaving(false);
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
    if (!activeId || !addCtxId || !addCtxPct) return;
    setCtxSaving(true);
    await supabase.from('hub_project_contractors').upsert({ project_id: activeId, contractor_id: addCtxId, percentage: parseFloat(addCtxPct) }, { onConflict: 'project_id,contractor_id' });
    setAddCtxId(''); setAddCtxPct(''); setCtxSaving(false);
    fetchAll();
  };

  const removeContractor = async (id: number) => {
    await supabase.from('hub_project_contractors').delete().eq('id', id);
    fetchAll();
  };

  const markPaid = async (pcId: number, contractorName: string) => {
    await supabase.from('hub_project_contractors').update({ payout_status: 'paid', paid_at: new Date().toISOString() }).eq('id', pcId);
    logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'approve', entity_type: 'project_payout', description: `Marked ${contractorName} as paid on project` });
    fetchAll();
  };

  const filtered = projects.filter(p =>
    !search || p.client_name.toLowerCase().includes(search.toLowerCase()) || p.project_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Projects">
      <div className="flex gap-5 max-w-6xl h-[calc(100vh-120px)]">

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

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="flex justify-center py-8"><i className="ri-loader-4-line animate-spin text-gray-300 text-xl"></i></div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No projects yet.</p>
            ) : filtered.map(p => {
              const d = derived(p);
              const cfg = statusCfg[p.status] ?? statusCfg.ongoing;
              return (
                <button key={p.id} onClick={() => setActiveId(p.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${activeId === p.id ? 'border-[#FF6B35] bg-orange-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className="text-xs font-semibold text-[#111827] leading-tight">{p.project_name}</p>
                      <p className="text-[11px] text-gray-400">{p.client_name}</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.cls}`}>{cfg.label}</span>
                  </div>
                  {/* Payment progress bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>{fmt(d.totalPaid)} collected</span>
                      <span>{fmtPct(d.paidPct)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${Math.min(d.paidPct, 100)}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
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
                    <div className="space-y-1.5">
                      {(activeProject.hub_project_payments as any[]).map((pp: any) => (
                        <div key={pp.id} className="flex items-center justify-between gap-2 text-sm">
                          <div>
                            <span className="font-medium text-emerald-600">{fmt(pp.amount)}</span>
                            <span className="text-xs text-gray-400 ml-2">{pp.paid_at ? new Date(pp.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                            {pp.notes && <span className="text-xs text-gray-400 ml-1">· {pp.notes}</span>}
                          </div>
                          <button onClick={() => deletePayment(pp.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer"><i className="ri-delete-bin-line text-xs"></i></button>
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
                        + Log
                      </button>
                    </div>
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
                        + Log Cost
                      </button>
                    </div>
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
                  <div className="space-y-2">
                    {activeProject.hub_project_contractors.map(pc => {
                      const u = pc.hub_users;
                      if (!u) return null;
                      const cut = d.netProfit * (pc.percentage / 100);
                      return (
                        <div key={pc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <Avatar name={u.full_name} url={u.avatar_url} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-800">{u.full_name}</p>
                              <span className="text-xs text-gray-400">{pc.percentage}% → <strong className="text-[#111827]">{fmt(cut)}</strong></span>
                            </div>
                            {pc.notes && <p className="text-xs text-gray-400">{pc.notes}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {pc.payout_status === 'paid' ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Paid</span>
                            ) : (
                              <button onClick={() => markPaid(pc.id, u.full_name)}
                                className="text-xs px-2.5 py-1 bg-[#111827] text-white rounded-lg hover:bg-gray-700 cursor-pointer whitespace-nowrap">
                                Mark Paid
                              </button>
                            )}
                            <button onClick={() => removeContractor(pc.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer"><i className="ri-delete-bin-line text-xs"></i></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {unassigned.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 flex gap-2">
                    <select value={addCtxId} onChange={e => {
                      setAddCtxId(e.target.value);
                      const c = contractors.find(x => x.id === e.target.value);
                      if (c?.project_percentage) setAddCtxPct(String(c.project_percentage));
                    }}
                      className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white">
                      <option value="">Add contractor...</option>
                      {unassigned.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.department ? ` — ${c.department}` : ''}</option>)}
                    </select>
                    <div className="relative w-20">
                      <input type="number" value={addCtxPct} onChange={e => setAddCtxPct(e.target.value)} placeholder="%" min="1" max="100"
                        className="w-full px-2.5 py-1.5 pr-6 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                    </div>
                    <button onClick={addContractor} disabled={!addCtxId || !addCtxPct || ctxSaving}
                      className="px-3 py-1.5 bg-[#111827] text-white text-xs rounded-lg hover:bg-gray-800 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                      Add
                    </button>
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
                  <input value={form.service} onChange={e => setForm({ ...form, service: e.target.value })} placeholder="e.g. Website Design"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
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
    </AdminLayout>
  );
}

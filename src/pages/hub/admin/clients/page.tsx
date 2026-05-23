import { useEffect, useState } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { HubClient, HubClientAssignment, HubUser } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';
import { getSetting, setSetting } from '@/lib/settings';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  ended: 'bg-gray-100 text-gray-500',
};

const fmtPHP = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const emptyForm = { client_name: '', platform: '', status: 'active', notes: '', contract_value: '', contract_currency: 'PHP' };

function Avatar({ name, avatar_url, size = 7 }: { name: string; avatar_url?: string | null; size?: number }) {
  const s = `w-${size} h-${size}`;
  if (avatar_url) return <img src={avatar_url} alt={name} className={`${s} rounded-full object-cover object-top flex-shrink-0`} />;
  return (
    <div className={`${s} rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0`}>
      <span className="text-white text-xs font-bold">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

export default function ClientsPage() {
  const { hubUser } = useAuth();
  const isOwner = hubUser?.role === 'owner';
  const [usdRate, setUsdRate] = useState(56);
  const [clients, setClients] = useState<HubClient[]>([]);
  const [contractors, setContractors] = useState<HubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getSetting('usd_rate', '56').then(v => setUsdRate(parseFloat(v)));
  }, []);

  // Client modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<HubClient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Assignment modal (manage team for a client)
  const [assignClient, setAssignClient] = useState<HubClient | null>(null);
  const [assignments, setAssignments] = useState<HubClientAssignment[]>([]);
  const [addContractorId, setAddContractorId] = useState('');
  const [addRole, setAddRole] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [clientsRes, usersRes] = await Promise.all([
      supabase
        .from('hub_clients')
        .select('*, hub_client_assignments(id, contractor_id, role, hub_users(id, full_name, avatar_url, department))')
        .order('client_name'),
      supabase.from('hub_users').select('id, full_name, avatar_url, department, role').eq('status', 'active').order('full_name'),
    ]);

    // hub_client_assignments may not exist yet if migration hasn't been run — fall back gracefully
    if (clientsRes.error?.message?.includes('hub_client_assignments')) {
      const { data: fallback } = await supabase.from('hub_clients').select('*').order('client_name');
      setClients((fallback as HubClient[]) ?? []);
    } else {
      setClients((clientsRes.data as HubClient[]) ?? []);
    }

    setContractors((usersRes.data as HubUser[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = clients.filter(c =>
    !search || c.client_name.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (c: HubClient) => {
    setEditing(c);
    setForm({ client_name: c.client_name, platform: c.platform || '', status: c.status, notes: c.notes || '', contract_value: c.contract_value != null ? String(c.contract_value) : '', contract_currency: c.contract_currency || 'PHP' });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.client_name.trim()) return;
    setSaving(true);
    setSaveError('');
    const payload = {
      client_name: form.client_name.trim(),
      platform: form.platform.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
      contract_value: form.contract_value ? parseFloat(form.contract_value) : null,
      contract_currency: form.contract_currency,
    };
    if (editing) {
      const { error } = await supabase.from('hub_clients').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
      if (error) { setSaveError(error.message); setSaving(false); return; }
      logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'update', entity_type: 'client', entity_id: String(editing.id), description: `Updated client "${form.client_name}"` });
    } else {
      const { error } = await supabase.from('hub_clients').insert(payload);
      if (error) { setSaveError(error.message); setSaving(false); return; }
      logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'create', entity_type: 'client', description: `Added client "${form.client_name}"` });
    }
    setSaving(false);
    setShowModal(false);
    fetchData();
  };

  const openManageTeam = (c: HubClient) => {
    setAssignClient(c);
    setAssignments((c.hub_client_assignments as HubClientAssignment[]) ?? []);
    setAddContractorId('');
    setAddRole('');
  };

  const addAssignment = async () => {
    if (!assignClient || !addContractorId) return;
    setAssignSaving(true);
    await supabase.from('hub_client_assignments').insert({
      client_id: assignClient.id,
      contractor_id: addContractorId,
      role: addRole.trim() || null,
    });
    logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'create', entity_type: 'client_assignment', entity_id: String(assignClient.id), description: `Assigned ${contractors.find(c => c.id === addContractorId)?.full_name} to "${assignClient.client_name}"` });
    setAddContractorId('');
    setAddRole('');
    setAssignSaving(false);
    // Refresh
    const { data } = await supabase
      .from('hub_client_assignments')
      .select('id, contractor_id, role, hub_users(id, full_name, avatar_url, department)')
      .eq('client_id', assignClient.id);
    setAssignments((data as HubClientAssignment[]) ?? []);
    fetchData();
  };

  const removeAssignment = async (assignmentId: number, contractorName: string) => {
    if (!assignClient) return;
    await supabase.from('hub_client_assignments').delete().eq('id', assignmentId);
    logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'delete', entity_type: 'client_assignment', entity_id: String(assignClient.id), description: `Removed ${contractorName} from "${assignClient.client_name}"` });
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    fetchData();
  };

  const unassignedContractors = contractors.filter(c =>
    !assignments.some(a => a.contractor_id === c.id)
  );

  return (
    <AdminLayout title="Client Assignments">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
          </div>
          <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 bg-[#111827] text-white text-sm rounded-lg hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-add-line"></i> Add Client
          </button>
        </div>

        {/* Monthly total — owner only */}
        {!loading && isOwner && (() => {
          const activeClients = clients.filter(c => c.status === 'active' && c.contract_value);
          const monthlyTotalPHP = activeClients.reduce((s, c) => {
            const val = c.contract_value ?? 0;
            return s + (c.contract_currency === 'USD' ? val * usdRate : val);
          }, 0);
          if (!monthlyTotalPHP) return null;
          return (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="ri-money-dollar-circle-line text-emerald-600 text-sm"></i>
                <span className="text-sm font-medium text-emerald-700">Monthly Retainer Total</span>
                <span className="text-xs text-emerald-500">({activeClients.length} active client{activeClients.length !== 1 ? 's' : ''} · USD @ ₱{usdRate})</span>
              </div>
              <span className="text-lg font-bold text-emerald-700">{fmtPHP(monthlyTotalPHP)}/mo</span>
            </div>
          );
        })()}

        {loading ? (
          <div className="flex justify-center py-12"><i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No clients found</div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(c => {
              const team = (c.hub_client_assignments ?? []) as HubClientAssignment[];
              return (
                <div key={c.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                  {/* Client header */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                    <div className="w-9 h-9 bg-[#FF6B35]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <i className="ri-building-line text-[#FF6B35] text-sm"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#111827] text-sm">{c.client_name}</p>
                      {c.platform && <p className="text-xs text-gray-400">{c.platform}</p>}
                    </div>
                    {isOwner && c.contract_value != null && (
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                          {c.contract_currency === 'USD'
                            ? `$${c.contract_value.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
                            : fmtPHP(c.contract_value)}/mo
                        </span>
                        {c.contract_currency === 'USD' && (
                          <span className="text-[10px] text-gray-400 mt-0.5">≈ {fmtPHP(c.contract_value * usdRate)}</span>
                        )}
                      </div>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${statusColors[c.status]}`}>{c.status}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => openManageTeam(c)} className="text-xs text-gray-400 hover:text-[#FF6B35] cursor-pointer transition-colors flex items-center gap-1">
                        <i className="ri-user-add-line text-sm"></i>
                        <span className="hidden sm:inline">Manage Team</span>
                      </button>
                      <button onClick={() => openEdit(c)} className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer transition-colors flex items-center gap-1">
                        <i className="ri-edit-line text-sm"></i>
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                    </div>
                  </div>

                  {/* Team members */}
                  <div className="px-5 py-3">
                    {team.length === 0 ? (
                      <div className="flex items-center gap-2 py-1">
                        <p className="text-xs text-gray-400">No team members assigned.</p>
                        <button onClick={() => openManageTeam(c)} className="text-xs text-[#FF6B35] hover:underline cursor-pointer">
                          Add someone
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {team.map(a => {
                          const u = a.hub_users as any;
                          if (!u) return null;
                          return (
                            <div key={a.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                              <Avatar name={u.full_name} avatar_url={u.avatar_url} size={6} />
                              <div>
                                <p className="text-xs font-medium text-gray-800">{u.full_name}</p>
                                {a.role && <p className="text-[11px] text-gray-400">{a.role}</p>}
                              </div>
                            </div>
                          );
                        })}
                        <button onClick={() => openManageTeam(c)}
                          className="flex items-center gap-1.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400 hover:text-[#FF6B35] hover:border-[#FF6B35]/40 cursor-pointer transition-colors">
                          <i className="ri-add-line text-sm"></i> Add
                        </button>
                      </div>
                    )}
                  </div>

                  {c.notes && (
                    <div className="px-5 pb-3">
                      <p className="text-xs text-gray-400 italic">{c.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Client details modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-[#111827]">{editing ? 'Edit Client' : 'Add Client'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Client Name *</label>
                <input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })}
                  placeholder="Client company name..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Platform</label>
                  <input value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}
                    placeholder="e.g. Meta Ads"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="ended">Ended</option>
                  </select>
                </div>
              </div>
              {isOwner && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Monthly Contract Value</label>
                  <div className="flex gap-2">
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs flex-shrink-0">
                      <button type="button" onClick={() => setForm({ ...form, contract_currency: 'PHP' })}
                        className={`px-3 py-2 cursor-pointer transition-colors ${form.contract_currency === 'PHP' ? 'bg-[#111827] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        ₱ PHP
                      </button>
                      <button type="button" onClick={() => setForm({ ...form, contract_currency: 'USD' })}
                        className={`px-3 py-2 cursor-pointer transition-colors border-l border-gray-200 ${form.contract_currency === 'USD' ? 'bg-[#111827] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        $ USD
                      </button>
                    </div>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{form.contract_currency === 'USD' ? '$' : '₱'}</span>
                      <input type="number" value={form.contract_value} onChange={e => setForm({ ...form, contract_value: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                    </div>
                  </div>
                  {form.contract_currency === 'USD' && form.contract_value && (
                    <p className="text-[11px] text-emerald-600">≈ {fmtPHP(parseFloat(form.contract_value) * usdRate)} at ₱{usdRate}/USD</p>
                  )}
                  <p className="text-[11px] text-gray-400">Only visible to owner.</p>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  placeholder="Any notes..." maxLength={500}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none" />
              </div>
            </div>
            {saveError && (
              <div className="mx-5 mb-3 flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                <i className="ri-error-warning-line text-red-500 text-sm flex-shrink-0"></i>
                <p className="text-xs text-red-600">{saveError}</p>
              </div>
            )}
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={save} disabled={saving || !form.client_name.trim()}
                className="flex-1 py-2.5 text-sm bg-[#111827] text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 cursor-pointer whitespace-nowrap">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage team modal */}
      {assignClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-semibold text-[#111827]">Manage Team</h2>
                <p className="text-xs text-gray-400 mt-0.5">{assignClient.client_name}</p>
              </div>
              <button onClick={() => setAssignClient(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Current assignments */}
              {assignments.length > 0 && (
                <div className="space-y-2">
                  {assignments.map(a => {
                    const u = a.hub_users as any;
                    if (!u) return null;
                    return (
                      <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <Avatar name={u.full_name} avatar_url={u.avatar_url} size={8} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{u.full_name}</p>
                          <p className="text-xs text-gray-400">{a.role || u.department || '—'}</p>
                        </div>
                        <button onClick={() => removeAssignment(a.id, u.full_name)}
                          className="text-gray-300 hover:text-rose-400 cursor-pointer transition-colors p-1">
                          <i className="ri-delete-bin-line text-sm"></i>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {assignments.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No one assigned yet.</p>
              )}

              {/* Add new */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add Team Member</p>
                <div className="space-y-2">
                  <select value={addContractorId} onChange={e => setAddContractorId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white">
                    <option value="">Select contractor...</option>
                    {unassignedContractors.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}{u.department ? ` — ${u.department}` : ''}</option>
                    ))}
                  </select>
                  <input value={addRole} onChange={e => setAddRole(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addAssignment()}
                    placeholder="Their role on this account (e.g. Media Buyer)"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                  <button onClick={addAssignment} disabled={!addContractorId || assignSaving}
                    className="w-full py-2 text-sm bg-[#111827] text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors">
                    {assignSaving ? 'Adding...' : 'Add to Client'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

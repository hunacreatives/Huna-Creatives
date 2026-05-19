import { useEffect, useState } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { HubClient, HubUser } from '@/lib/types';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  ended: 'bg-gray-100 text-gray-500',
};

const emptyForm = {
  client_name: '', assigned_contractor_id: '', role: '', platform: '', status: 'active', notes: '',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<HubClient[]>([]);
  const [contractors, setContractors] = useState<HubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<HubClient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: c }, { data: u }] = await Promise.all([
      supabase.from('hub_clients').select('*, hub_users(full_name, avatar_url, role)').order('client_name'),
      supabase.from('hub_users').select('id, full_name, avatar_url, role').eq('status', 'active').order('full_name'),
    ]);
    setClients((c as HubClient[]) ?? []);
    setContractors((u as HubUser[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = clients.filter((c) =>
    !search || c.client_name.toLowerCase().includes(search.toLowerCase()) || c.role?.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (c: HubClient) => {
    setEditing(c);
    setForm({ client_name: c.client_name, assigned_contractor_id: String(c.assigned_contractor_id || ''), role: c.role || '', platform: c.platform || '', status: c.status, notes: c.notes || '' });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.client_name.trim()) return;
    setSaving(true);
    const payload = { ...form, assigned_contractor_id: form.assigned_contractor_id ? Number(form.assigned_contractor_id) : null };
    if (editing) {
      await supabase.from('hub_clients').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
    } else {
      await supabase.from('hub_clients').insert({ ...payload });
    }
    setSaving(false);
    setShowModal(false);
    fetchData();
  };

  return (
    <AdminLayout title="Client Assignments">
      <div className="space-y-4 max-w-5xl">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
          </div>
          <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 bg-[#111827] text-white text-sm rounded-lg hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-add-line"></i> Add Client
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i></div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Client</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Assigned To</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Platform</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">No clients found</td></tr>
                ) : filtered.map((c) => {
                  const user = c.hub_users as HubUser;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-[#FF6B35]/10 rounded-lg flex items-center justify-center">
                            <i className="ri-building-line text-[#FF6B35] text-sm"></i>
                          </div>
                          <p className="text-sm font-medium text-[#111827]">{c.client_name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {user ? (
                          <div className="flex items-center gap-2">
                            <img src={user.avatar_url || ''} alt="" className="w-6 h-6 rounded-full object-cover object-top" />
                            <span className="text-sm text-gray-700">{user.full_name}</span>
                          </div>
                        ) : <span className="text-sm text-gray-400">Unassigned</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{c.role || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{c.platform || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[c.status]}`}>{c.status}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => openEdit(c)} className="text-xs text-gray-500 hover:text-[#FF6B35] cursor-pointer font-medium transition-colors">Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                <input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  placeholder="Client company name..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Assigned Contractor</label>
                <select value={form.assigned_contractor_id} onChange={(e) => setForm({ ...form, assigned_contractor_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                  <option value="">Unassigned</option>
                  {contractors.map((u) => <option key={u.id} value={String(u.id)}>{u.full_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Role</label>
                  <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="e.g. Media Buyer" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Platform</label>
                  <input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    placeholder="e.g. Meta Ads" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="ended">Ended</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  placeholder="Any notes..." maxLength={500}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none" />
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors whitespace-nowrap">Cancel</button>
              <button onClick={save} disabled={saving || !form.client_name.trim()}
                className="flex-1 py-2.5 text-sm bg-[#111827] text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
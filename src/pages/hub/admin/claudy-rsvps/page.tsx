import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';

type RSVP = {
  id: string;
  name: string;
  email: string;
  plus_ones: number;
  message: string | null;
  created_at: string;
};

type Event = {
  label: string;
  table: string;
  date: string;
};

const EVENTS: Event[] = [
  { label: "Claudy's 30th Birthday", table: 'claudy_rsvps', date: 'Jul 25, 2026' },
];

export default function EventRsvpsPage() {
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RSVP | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<RSVP>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const activeEvent = EVENTS[activeIdx];

  const fetchRsvps = () => {
    setLoading(true);
    supabase
      .from(activeEvent.table)
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRsvps(data ?? []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRsvps();
  }, [activeIdx, activeEvent.table]);

  const totalGuests = rsvps.reduce((sum, r) => sum + 1 + r.plus_ones, 0);

  const startEdit = () => {
    if (!selected) return;
    setEditForm({
      name: selected.name,
      email: selected.email,
      plus_ones: selected.plus_ones,
      message: selected.message ?? '',
    });
    setEditing(true);
    setConfirmDelete(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    const { data, error } = await supabase
      .from(activeEvent.table)
      .update({
        name: editForm.name,
        email: editForm.email,
        plus_ones: Number(editForm.plus_ones),
        message: editForm.message || null,
      })
      .eq('id', selected.id)
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setRsvps(prev => prev.map(r => r.id === data.id ? data : r));
      setSelected(data);
      setEditing(false);
    }
  };

  const deleteRsvp = async () => {
    if (!selected) return;
    setDeleting(true);
    await supabase.from(activeEvent.table).delete().eq('id', selected.id);
    setRsvps(prev => prev.filter(r => r.id !== selected.id));
    setSelected(null);
    setEditing(false);
    setConfirmDelete(false);
    setDeleting(false);
  };

  return (
    <AdminLayout title="Claudy's 30th — RSVPs">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate('/hub/admin/rsvps')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
            <i className="ri-arrow-left-line text-base"></i> All Events
          </button>
          <a href="https://claudyat30.com/admin" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-[#3B3F8C] hover:text-[#2a2e6a] font-medium transition-colors">
            <i className="ri-external-link-line text-base"></i> Client View
          </a>
        </div>

        {/* Event tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {EVENTS.map((e, i) => (
            <button
              key={e.table}
              onClick={() => { setActiveIdx(i); setSelected(null); setEditing(false); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                i === activeIdx
                  ? 'bg-[#3B3F8C] text-white shadow-sm'
                  : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-100'
              }`}
            >
              {e.label}
              <span className={`ml-2 text-xs ${i === activeIdx ? 'text-white/70' : 'text-gray-400'}`}>
                {e.date}
              </span>
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-white/60">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Responses</p>
            <p className="text-3xl font-bold text-gray-800">{rsvps.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-white/60">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Guests</p>
            <p className="text-3xl font-bold text-gray-800">{totalGuests}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-white/60 overflow-hidden flex-1 w-full overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : rsvps.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No RSVPs yet for this event.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Guests</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rsvps.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => { setSelected(r); setEditing(false); setConfirmDelete(false); }}
                      className={`cursor-pointer transition-colors ${
                        selected?.id === r.id
                          ? 'bg-[#3B3F8C]/5 border-l-2 border-[#3B3F8C]'
                          : 'hover:bg-gray-50/60'
                      }`}
                    >
                      <td className="px-5 py-3 font-medium text-gray-800">{r.name}</td>
                      <td className="px-5 py-3 text-gray-500">{r.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                          {1 + r.plus_ones}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail / edit panel */}
          {selected && (
            <div className="w-full lg:w-72 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-white/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 text-sm">
                  {editing ? 'Edit RSVP' : 'RSVP Detail'}
                </h3>
                <button
                  onClick={() => { setSelected(null); setEditing(false); setConfirmDelete(false); }}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
                >×</button>
              </div>

              {!editing && (
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#3B3F8C]/10 text-[#3B3F8C] font-bold text-lg mb-4 mx-auto">
                  {selected.name.charAt(0).toUpperCase()}
                </div>
              )}

              {editing ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Name</label>
                    <input
                      value={editForm.name ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#3B3F8C]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Email</label>
                    <input
                      type="email"
                      value={editForm.email ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#3B3F8C]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Guests (total incl. them)</label>
                    <select
                      value={editForm.plus_ones ?? 0}
                      onChange={e => setEditForm(f => ({ ...f, plus_ones: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#3B3F8C]"
                    >
                      <option value={0}>Just them</option>
                      <option value={1}>+1 guest</option>
                      <option value={2}>+2 guests</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Message</label>
                    <textarea
                      rows={3}
                      value={editForm.message ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, message: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#3B3F8C] resize-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex-1 bg-[#3B3F8C] text-white rounded-lg py-2 text-xs font-semibold cursor-pointer hover:bg-[#2a2e6a] disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 border border-gray-200 text-gray-500 rounded-lg py-2 text-xs font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Name</p>
                      <p className="font-medium text-gray-800">{selected.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Email</p>
                      <p className="text-gray-600 break-all">{selected.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Guests</p>
                      <p className="text-gray-600">{selected.plus_ones > 0 ? `+${selected.plus_ones} guest${selected.plus_ones > 1 ? 's' : ''}` : 'Just themselves'}</p>
                    </div>
                    {selected.message && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Message</p>
                        <p className="text-gray-600 italic">"{selected.message}"</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Submitted</p>
                      <p className="text-gray-600">
                        {new Date(selected.created_at).toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={startEdit}
                      className="flex-1 border border-[#3B3F8C] text-[#3B3F8C] rounded-lg py-2 text-xs font-semibold cursor-pointer hover:bg-[#3B3F8C]/5 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex-1 border border-red-200 text-red-500 rounded-lg py-2 text-xs font-semibold cursor-pointer hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>

                  {confirmDelete && (
                    <div className="mt-3 p-3 bg-red-50 rounded-xl text-xs text-red-700 text-center">
                      <p className="mb-2 font-medium">Remove {selected.name}?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={deleteRsvp}
                          disabled={deleting}
                          className="flex-1 bg-red-500 text-white rounded-lg py-1.5 font-semibold cursor-pointer hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                          {deleting ? '…' : 'Yes, delete'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1 bg-white border border-red-200 text-red-400 rounded-lg py-1.5 cursor-pointer hover:bg-red-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

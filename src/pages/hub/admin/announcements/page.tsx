import { useEffect, useState } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { HubAnnouncement } from '@/lib/types';

const priorityColors: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-600',
  important: 'bg-amber-100 text-amber-700',
  urgent: 'bg-rose-100 text-rose-700',
};
const categoryColors: Record<string, string> = {
  payroll: 'bg-emerald-100 text-emerald-700',
  meeting: 'bg-sky-100 text-sky-700',
  holiday: 'bg-purple-100 text-purple-700',
  policy: 'bg-orange-100 text-orange-700',
  general: 'bg-gray-100 text-gray-600',
};

const emptyForm = { title: '', body: '', priority: 'normal', category: 'general', published: true };

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<HubAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<HubAnnouncement | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data } = await supabase.from('hub_announcements').select('*').order('created_at', { ascending: false });
    setAnnouncements((data as HubAnnouncement[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (a: HubAnnouncement) => {
    setEditing(a);
    setForm({ title: a.title, body: a.body, priority: a.priority, category: a.category, published: a.published });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      let error;
      if (editing) {
        ({ error } = await supabase.from('hub_announcements').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id));
      } else {
        ({ error } = await supabase.from('hub_announcements').insert({ ...form }));
      }
      if (error) { setSaveError(error.message); return; }
      setShowModal(false);
      fetchAnnouncements();
    } catch (e: any) {
      setSaveError(e?.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const deleteAnnouncement = async (id: number) => {
    await supabase.from('hub_announcements').delete().eq('id', id);
    setDeleteConfirm(null);
    fetchAnnouncements();
  };

  return (
    <AdminLayout title="Announcements">
      <div className="space-y-4 max-w-4xl">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</p>
          <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 bg-[#111827] text-white text-sm rounded-lg hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-add-line"></i> New Announcement
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i></div>
        ) : announcements.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
            <i className="ri-megaphone-line text-3xl text-gray-200 mb-2 block"></i>
            <p className="text-sm text-gray-400">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-5 hover:border-gray-200 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityColors[a.priority]}`}>{a.priority}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${categoryColors[a.category]}`}>{a.category}</span>
                      {!a.published && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Draft</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-[#111827] mb-1">{a.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{a.body}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(a.created_at!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-gray-700 cursor-pointer transition-colors rounded-lg hover:bg-gray-100 w-7 h-7 flex items-center justify-center">
                      <i className="ri-edit-line text-sm"></i>
                    </button>
                    <button onClick={() => setDeleteConfirm(a.id)} className="p-1.5 text-gray-400 hover:text-rose-500 cursor-pointer transition-colors rounded-lg hover:bg-rose-50 w-7 h-7 flex items-center justify-center">
                      <i className="ri-delete-bin-line text-sm"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-[#111827]">{editing ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Announcement title..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Message *</label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4}
                  placeholder="Write your announcement..." maxLength={500}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white">
                    {['general', 'payroll', 'meeting', 'holiday', 'policy'].map((c) => (
                      <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white">
                    {['normal', 'important', 'urgent'].map((p) => (
                      <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="rounded" />
                <span className="text-sm text-gray-600">Publish immediately</span>
              </label>
            </div>
            {saveError && (
              <p className="mx-5 mb-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{saveError}</p>
            )}
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors whitespace-nowrap">Cancel</button>
              <button onClick={save} disabled={saving || !form.title.trim() || !form.body.trim()}
                className="flex-1 py-2.5 text-sm bg-[#111827] text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Post Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
              <i className="ri-delete-bin-line text-rose-500 text-xl"></i>
            </div>
            <div>
              <h3 className="font-semibold text-[#111827]">Delete Announcement?</h3>
              <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={() => deleteAnnouncement(deleteConfirm)} className="flex-1 py-2.5 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600 cursor-pointer transition-colors whitespace-nowrap">Delete</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
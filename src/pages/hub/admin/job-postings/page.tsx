import { useEffect, useState } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';

interface JobPosting {
  id: string;
  title: string;
  type: string;
  shift: string;
  start_date: string;
  location: string;
  summary: string;
  what_youll_do: string[];
  what_you_bring: string[];
  why_join_us: string[];
  portfolio_required: boolean;
  is_active: boolean;
  sort_order: number;
}

const emptyForm = {
  title: '',
  type: 'Full-Time',
  shift: '',
  start_date: 'ASAP',
  location: 'Remote',
  summary: '',
  what_youll_do: '',
  what_you_bring: '',
  why_join_us: '',
  portfolio_required: false,
  is_active: true,
  sort_order: 0,
};

const toLines = (arr: string[]) => (arr || []).join('\n');
const fromLines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

export default function JobPostingsPage() {
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<JobPosting | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchPostings = async () => {
    setLoading(true);
    const { data } = await supabase.from('hub_job_postings').select('*').order('sort_order').order('created_at');
    setPostings((data as JobPosting[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPostings();
  }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (p: JobPosting) => {
    setEditing(p);
    setForm({
      title: p.title,
      type: p.type,
      shift: p.shift,
      start_date: p.start_date,
      location: p.location,
      summary: p.summary,
      what_youll_do: toLines(p.what_youll_do),
      what_you_bring: toLines(p.what_you_bring),
      why_join_us: toLines(p.why_join_us),
      portfolio_required: p.portfolio_required,
      is_active: p.is_active,
      sort_order: p.sort_order,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      type: form.type.trim(),
      shift: form.shift.trim(),
      start_date: form.start_date.trim(),
      location: form.location.trim(),
      summary: form.summary.trim(),
      what_youll_do: fromLines(form.what_youll_do),
      what_you_bring: fromLines(form.what_you_bring),
      why_join_us: fromLines(form.why_join_us),
      portfolio_required: form.portfolio_required,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };
    if (editing) {
      await supabase.from('hub_job_postings').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
    } else {
      await supabase.from('hub_job_postings').insert(payload);
    }
    setSaving(false);
    setShowModal(false);
    fetchPostings();
  };

  const toggleActive = async (p: JobPosting) => {
    await supabase.from('hub_job_postings').update({ is_active: !p.is_active, updated_at: new Date().toISOString() }).eq('id', p.id);
    fetchPostings();
  };

  const deletePosting = async (id: string) => {
    if (!window.confirm('Delete this job posting? This cannot be undone.')) return;
    await supabase.from('hub_job_postings').delete().eq('id', id);
    fetchPostings();
  };

  return (
    <AdminLayout title="Job Postings">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">Controls what shows on hunacreatives.com/careers. Turn a posting off to pull it from the site instantly.</p>
          <button onClick={openNew} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#111827] text-white text-sm rounded-lg hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0">
            <i className="ri-add-line"></i> New Posting
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i></div>
        ) : postings.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
            <i className="ri-briefcase-4-line text-3xl text-gray-200 mb-2 block"></i>
            <p className="text-sm text-gray-400">No job postings yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {postings.map((p) => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                  <i className="ri-briefcase-4-line text-base"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#111827] truncate">{p.title}</h3>
                    {!p.is_active && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 flex-shrink-0">Hidden from site</span>}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{p.type} · {p.location} · {p.shift || 'No shift set'}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(p)}
                    title={p.is_active ? 'Remove from careers page' : 'Publish to careers page'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${p.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {p.is_active ? 'Live' : 'Hidden'}
                  </button>
                  <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-gray-700 cursor-pointer rounded-lg hover:bg-gray-100 w-8 h-8 flex items-center justify-center">
                    <i className="ri-edit-line text-sm"></i>
                  </button>
                  <button onClick={() => deletePosting(p.id)} className="p-1.5 text-gray-400 hover:text-rose-500 cursor-pointer rounded-lg hover:bg-rose-50 w-8 h-8 flex items-center justify-center">
                    <i className="ri-delete-bin-line text-sm"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-4">
          <div className="bg-white rounded-2xl w-full sm:max-w-lg max-h-[82vh] lg:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-[#111827]">{editing ? 'Edit Job Posting' : 'New Job Posting'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Graphic Designer" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Type</label>
                  <input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    placeholder="Full-Time" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Location</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Remote" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Shift</label>
                  <input value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}
                    placeholder="11:00 PM - 7:00 AM (PH Time)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Start Date</label>
                  <input value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    placeholder="ASAP" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Summary</label>
                <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={3}
                  placeholder="Short role summary shown on the careers page..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">What You'll Do <span className="text-gray-400 font-normal">(one per line)</span></label>
                <textarea value={form.what_youll_do} onChange={(e) => setForm({ ...form, what_youll_do: e.target.value })} rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">What You Bring <span className="text-gray-400 font-normal">(one per line)</span></label>
                <textarea value={form.what_you_bring} onChange={(e) => setForm({ ...form, what_you_bring: e.target.value })} rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Why Join Us <span className="text-gray-400 font-normal">(one per line)</span></label>
                <textarea value={form.why_join_us} onChange={(e) => setForm({ ...form, why_join_us: e.target.value })} rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.portfolio_required} onChange={(e) => setForm({ ...form, portfolio_required: e.target.checked })} className="rounded" />
                  <span className="text-sm text-gray-600">Portfolio required to apply</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                  <span className="text-sm text-gray-600">Live on careers page</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors whitespace-nowrap">Cancel</button>
              <button onClick={save} disabled={saving || !form.title.trim()}
                className="flex-1 py-2.5 text-sm bg-[#111827] text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Posting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import SopEditor, { SopContent } from '@/pages/hub/components/SopEditor';
import { supabase } from '@/lib/supabase';
import { HubSop } from '@/lib/types';
import { useDemo } from '@/contexts/DemoContext';
import { DEMO_SOPS } from '@/lib/demoData';
import { SOP_CATEGORIES, getSopCategory, sopLink, sopPlainText } from '@/lib/sopContent';

const emptyForm = { title: '', content: '', category: 'General', video_url: '', published: true, visibility: 'all' as 'all' | 'admin_only' };

export default function SopPage() {
  const { isDemo } = useDemo();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sops, setSops] = useState<HubSop[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<HubSop | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);

  // The open SOP lives in the URL (?open=ID) so the address bar is always shareable.
  const openId = Number(searchParams.get('open')) || null;
  const viewSop = openId ? sops.find(s => s.id === openId) ?? null : null;
  const setViewSop = (s: HubSop | null) => {
    setCopied(false);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (s) next.set('open', String(s.id)); else next.delete('open');
      return next;
    }, { replace: true });
  };

  const fetchSops = async () => {
    const { data } = await supabase.from('hub_sops').select('*').order('category').order('title');
    setSops((data as HubSop[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isDemo) {
      setSops(DEMO_SOPS);
      setLoading(false);
      return;
    }
    fetchSops();
  }, [isDemo]);

  const plain = useMemo(() => new Map(sops.map(s => [s.id, sopPlainText(s.content)])), [sops]);
  const categories = ['all', ...Array.from(new Set(sops.map((s) => s.category))).sort()];
  const categoryOptions = Array.from(new Set([...SOP_CATEGORIES, ...sops.map(s => s.category)]));

  const filtered = sops.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.title.toLowerCase().includes(q) || plain.get(s.id)?.toLowerCase().includes(q);
    const matchCategory = categoryFilter === 'all' || s.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setSaveError(''); setShowModal(true); };
  const openEdit = (s: HubSop) => {
    setEditing(s);
    setForm({ title: s.title, content: s.content || '', category: s.category, video_url: s.video_url || '', published: s.published, visibility: s.visibility || 'all' });
    setSaveError('');
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setSaveError('');
    const content = form.content.replace(/(<p><\/p>)+$/, '');
    const row = { ...form, title: form.title.trim(), content, video_url: form.video_url.trim() || null };
    const { data, error } = editing
      ? await supabase.from('hub_sops').update({ ...row, updated_at: new Date().toISOString() }).eq('id', editing.id).select().single()
      : await supabase.from('hub_sops').insert(row).select().single();
    setSaving(false);
    if (error) { setSaveError(error.message || 'Could not save this SOP.'); return; }
    setShowModal(false);
    await fetchSops();
    if (data) setViewSop(data as HubSop);
  };

  const deleteSop = async (s: HubSop) => {
    if (!window.confirm(`Delete "${s.title}"? Employees will lose access to it too.`)) return;
    await supabase.from('hub_sops').delete().eq('id', s.id);
    setViewSop(null);
    fetchSops();
  };

  const copyLink = async (s: HubSop) => {
    try { await navigator.clipboard.writeText(sopLink(s.id)); } catch { window.prompt('Copy this link', sopLink(s.id)); }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <AdminLayout title="SOP Library">
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SOPs..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto scrollbar-hide w-full sm:w-auto sm:max-w-[calc(100%-9rem)]">
              {categories.map((c) => (
                <button key={c} onClick={() => setCategoryFilter(c)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${categoryFilter === c ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {c === 'all' ? 'All' : c}
                </button>
              ))}
            </div>
            <button onClick={openNew} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#111827] text-white text-sm rounded-lg hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap w-full sm:w-auto sm:ml-auto">
              <i className="ri-add-line"></i> Add SOP
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
            <i className="ri-book-2-line text-3xl text-gray-200 mb-2 block"></i>
            <p className="text-sm text-gray-400">No SOPs found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((s) => {
              const cfg = getSopCategory(s.category);
              return (
                <div key={s.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors cursor-pointer group"
                  onClick={() => setViewSop(s)}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${cfg.light}`}>
                      <i className={`${cfg.icon} text-base`}></i>
                    </div>
                    <div className="flex gap-1">
                      {!s.published && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">Draft</span>}
                      {s.visibility === 'admin_only' && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-600">Admin only</span>}
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-[#111827] mb-1 line-clamp-2">{s.title}</h3>
                  {plain.get(s.id) && <p className="text-xs text-gray-400 line-clamp-2">{plain.get(s.id)}</p>}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${cfg.light}`}>{s.category}</span>
                    {s.video_url && <i className="ri-video-line text-xs text-gray-400"></i>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && openId && !viewSop && (
          <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-100 text-amber-800 text-sm rounded-xl px-4 py-3">
            <span>That SOP no longer exists.</span>
            <button onClick={() => setViewSop(null)} className="text-xs font-medium underline cursor-pointer">Dismiss</button>
          </div>
        )}
      </div>

      {viewSop && (() => {
        const cfg = getSopCategory(viewSop.category);
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-4"
            onClick={(e) => { if (e.target === e.currentTarget) setViewSop(null); }}>
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
              <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${cfg.light}`}>
                    <i className={`${cfg.icon} text-base`}></i>
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-[#111827] leading-snug">{viewSop.title}</h2>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${cfg.light}`}>{viewSop.category}</span>
                      {!viewSop.published && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">Draft</span>}
                      {viewSop.visibility === 'admin_only' && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-600">Admin only</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => copyLink(viewSop)} title="Copy link to this SOP"
                    className="flex items-center gap-1 px-2 h-7 text-xs text-gray-500 hover:text-gray-800 cursor-pointer rounded-lg hover:bg-gray-100 whitespace-nowrap">
                    <i className={copied ? 'ri-check-line text-emerald-600' : 'ri-link'}></i>{copied ? 'Copied' : 'Copy link'}
                  </button>
                  <button onClick={() => openEdit(viewSop)} title="Edit" className="text-gray-400 hover:text-gray-700 cursor-pointer rounded-lg hover:bg-gray-100 w-7 h-7 flex items-center justify-center">
                    <i className="ri-edit-line text-sm"></i>
                  </button>
                  <button onClick={() => deleteSop(viewSop)} title="Delete" className="text-gray-400 hover:text-rose-500 cursor-pointer rounded-lg hover:bg-rose-50 w-7 h-7 flex items-center justify-center">
                    <i className="ri-delete-bin-line text-sm"></i>
                  </button>
                  <button onClick={() => setViewSop(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center">
                    <i className="ri-close-line text-lg"></i>
                  </button>
                </div>
              </div>
              <div className="p-5 sm:px-7 overflow-y-auto flex-1 space-y-5">
                {viewSop.video_url && (
                  <div className="bg-gray-50 rounded-xl overflow-hidden">
                    <iframe src={viewSop.video_url} className="w-full aspect-video rounded-xl" allowFullScreen title={viewSop.title}></iframe>
                  </div>
                )}
                <SopContent content={viewSop.content} />
              </div>
            </div>
          </div>
        );
      })()}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-4">
          <div className="bg-white rounded-2xl w-full sm:max-w-3xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-[#111827]">{editing ? 'Edit SOP' : 'New SOP'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Title *</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="SOP title..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                    {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Content</label>
                <SopEditor key={editing?.id ?? 'new'} initialContent={form.content} onChange={(html) => setForm(f => ({ ...f, content: html }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Video URL (optional)</label>
                <input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  placeholder="https://www.youtube.com/embed/..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="rounded" />
                  <span className="text-sm text-gray-600">Published</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.visibility === 'admin_only'} onChange={(e) => setForm({ ...form, visibility: e.target.checked ? 'admin_only' : 'all' })} className="rounded" />
                  <span className="text-sm text-gray-600">Admin only <span className="text-xs text-gray-400">(hidden from employees)</span></span>
                </label>
              </div>
              {saveError && <p className="text-sm text-rose-600">{saveError}</p>}
            </div>
            <div className="flex gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors whitespace-nowrap">Cancel</button>
              <button onClick={save} disabled={saving || !form.title.trim()}
                className="flex-1 py-2.5 text-sm bg-[#111827] text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create SOP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

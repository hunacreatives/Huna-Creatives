import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ContractorLayout from '@/pages/hub/components/ContractorLayout';
import { SopContent } from '@/pages/hub/components/SopEditor';
import { supabase } from '@/lib/supabase';
import { useDemo } from '@/contexts/DemoContext';
import { DEMO_SOPS } from '@/lib/demoData';
import { HubSop } from '@/lib/types';
import { getSopCategory as getCfg, sopLink, sopPlainText } from '@/lib/sopContent';

export default function ContractorSopPage() {
  const { isDemo } = useDemo();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sops, setSops] = useState<HubSop[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // The open SOP lives in the URL (?open=ID) so shared links land on it directly.
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

  const copyLink = async (s: HubSop) => {
    try { await navigator.clipboard.writeText(sopLink(s.id)); } catch { window.prompt('Copy this link', sopLink(s.id)); }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  useEffect(() => {
    if (isDemo) {
      setSops(DEMO_SOPS.filter(s => s.published));
      setLoading(false);
      return;
    }
    // RLS limits employees to published, non-admin-only SOPs; the filters keep
    // admin-side previews of this page showing the same list.
    supabase.from('hub_sops').select('*').eq('published', true).eq('visibility', 'all').order('category').order('title')
      .then(({ data }) => { setSops((data as HubSop[]) ?? []); setLoading(false); });
  }, [isDemo]);

  const plain = useMemo(() => new Map(sops.map(s => [s.id, sopPlainText(s.content)])), [sops]);
  const categories = ['All', ...Array.from(new Set(sops.map(s => s.category))).sort()];

  const filtered = sops.filter(s => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || plain.get(s.id)?.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || s.category === activeCategory;
    return matchSearch && matchCat;
  });

  const grouped = categories.filter(c => c !== 'All').reduce((acc, cat) => {
    const items = filtered.filter(s => s.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {} as Record<string, HubSop[]>);

  const scrollToCategory = (cat: string) => {
    setActiveCategory(cat);
    if (cat === 'All') { contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const el = document.getElementById(`sop-cat-${cat}`);
    if (el && contentRef.current) {
      const offset = el.offsetTop - contentRef.current.offsetTop - 16;
      contentRef.current.scrollTo({ top: offset, behavior: 'smooth' });
    }
  };

  return (
    <ContractorLayout title="SOP Library">
      <div className="flex gap-6 -mx-4 md:-mx-6 px-4 md:px-6" style={{ minHeight: 'calc(100vh - 100px)' }}>

        {/* ── Left sidebar ── */}
        <div className="hidden lg:flex flex-col gap-1 w-52 flex-shrink-0 sticky top-0 self-start pt-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">Categories</p>
          {categories.map(cat => {
            const cfg = getCfg(cat);
            const count = cat === 'All' ? sops.length : sops.filter(s => s.category === cat).length;
            const isActive = activeCategory === cat;
            return (
              <button key={cat} onClick={() => scrollToCategory(cat)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${isActive ? 'bg-white shadow-sm border border-gray-100' : 'hover:bg-gray-50'}`}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? cfg.bg + ' text-white' : 'bg-gray-100'}`}>
                  <i className={`${cat === 'All' ? 'ri-apps-2-line' : cfg.icon} text-[11px] ${isActive ? 'text-white' : 'text-gray-500'}`}></i>
                </div>
                <span className={`text-xs font-medium flex-1 ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>{cat}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-gray-100 text-gray-600' : 'text-gray-300'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-8" ref={contentRef}>

          {/* Search */}
          <div className="relative">
            <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
            <input value={search} onChange={e => { setSearch(e.target.value); setActiveCategory('All'); }}
              placeholder="Search SOPs by title or content…"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/70 backdrop-blur-sm border border-white/80 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 placeholder-gray-400" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="ri-close-line text-sm"></i>
              </button>
            )}
          </div>

          {/* Mobile category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {categories.map(cat => {
              const cfg = getCfg(cat);
              return (
                <button key={cat} onClick={() => scrollToCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 cursor-pointer transition-all ${activeCategory === cat ? cfg.light + ' border' : 'bg-white border border-gray-200 text-gray-500'}`}>
                  <i className={`${cat === 'All' ? 'ri-apps-2-line' : cfg.icon} text-[10px]`}></i>
                  {cat}
                </button>
              );
            })}
          </div>

          {!loading && openId && !viewSop && (
            <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-100 text-amber-800 text-sm rounded-2xl px-4 py-3">
              <span>That SOP isn't available. It may have been removed or is for admins only.</span>
              <button onClick={() => setViewSop(null)} className="text-xs font-medium underline cursor-pointer flex-shrink-0">Dismiss</button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20"><i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i></div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 rounded-3xl p-16 text-center">
              <i className="ri-search-line text-3xl text-gray-200 block mb-3"></i>
              <p className="text-sm font-medium text-gray-400">No SOPs match "{search}"</p>
            </div>
          ) : (
            Object.entries(grouped).map(([cat, items]) => {
              const cfg = getCfg(cat);
              return (
                <div key={cat} id={`sop-cat-${cat}`}>
                  {/* Category header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                      <i className={`${cfg.icon} text-white text-sm`}></i>
                    </div>
                    <h2 className="text-base font-bold text-gray-900">{cat}</h2>
                    <span className="text-xs text-gray-400">{items.length} guide{items.length !== 1 ? 's' : ''}</span>
                    <div className="flex-1 h-px bg-gray-100 ml-1"></div>
                  </div>

                  {/* Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map(s => (
                      <button key={s.id} onClick={() => setViewSop(s)} className="text-left bg-white/70 backdrop-blur-sm border border-white/80 rounded-2xl p-4 hover:shadow-md hover:bg-white hover:-translate-y-0.5 transition-all cursor-pointer group">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.light} border`}>
                            <i className={`${cfg.icon} text-sm`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-indigo-700 transition-colors">{s.title}</h3>
                            {plain.get(s.id) && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                                {plain.get(s.id)}
                              </p>
                            )}
                          </div>
                          <i className="ri-arrow-right-s-line text-gray-300 group-hover:text-indigo-400 transition-colors text-base flex-shrink-0 mt-0.5"></i>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── SOP Reader modal ── */}
      {viewSop && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={() => setViewSop(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col" style={{ borderLeft: '1px solid #f3f4f6' }}>
            {/* Header */}
            {(() => {
              const cfg = getCfg(viewSop.category);
              return (
                <div className="flex-shrink-0">
                  <div className={`px-6 pt-6 pb-5 ${cfg.bg}`}>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">{viewSop.category}</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => copyLink(viewSop)} title="Copy link to this SOP"
                          className="flex items-center gap-1 h-6 px-2 rounded-full bg-white/20 text-white/80 hover:bg-white/30 text-[11px] font-medium cursor-pointer transition-colors">
                          <i className={copied ? 'ri-check-line' : 'ri-link'}></i>{copied ? 'Copied' : 'Copy link'}
                        </button>
                        <button onClick={() => setViewSop(null)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20 text-white/70 hover:bg-white/30 cursor-pointer transition-colors">
                          <i className="ri-close-line text-sm"></i>
                        </button>
                      </div>
                    </div>
                    <h1 className="text-lg font-bold text-white leading-snug">{viewSop.title}</h1>
                  </div>
                </div>
              );
            })()}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {viewSop.video_url && (
                <div className="bg-gray-50 rounded-xl overflow-hidden">
                  <iframe src={viewSop.video_url} className="w-full aspect-video rounded-xl" allowFullScreen title={viewSop.title}></iframe>
                </div>
              )}
              <SopContent content={viewSop.content} />
            </div>

            {/* Footer nav */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button onClick={() => {
                const all = sops.filter(s => s.category === viewSop.category);
                const idx = all.findIndex(s => s.id === viewSop.id);
                if (idx > 0) setViewSop(all[idx - 1]);
              }} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 cursor-pointer transition-colors disabled:opacity-30"
                disabled={sops.filter(s => s.category === viewSop.category).findIndex(s => s.id === viewSop.id) === 0}>
                <i className="ri-arrow-left-s-line"></i> Previous
              </button>
              <span className="text-[10px] text-gray-300">
                {sops.filter(s => s.category === viewSop.category).findIndex(s => s.id === viewSop.id) + 1} of {sops.filter(s => s.category === viewSop.category).length} in {viewSop.category}
              </span>
              <button onClick={() => {
                const all = sops.filter(s => s.category === viewSop.category);
                const idx = all.findIndex(s => s.id === viewSop.id);
                if (idx < all.length - 1) setViewSop(all[idx + 1]);
              }} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
                disabled={(() => { const all = sops.filter(s => s.category === viewSop.category); return all.findIndex(s => s.id === viewSop.id) === all.length - 1; })()}>
                Next <i className="ri-arrow-right-s-line"></i>
              </button>
            </div>
          </div>
        </>
      )}
    </ContractorLayout>
  );
}

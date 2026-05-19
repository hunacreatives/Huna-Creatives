import { useEffect, useState } from 'react';
import ContractorLayout from '@/pages/hub/components/ContractorLayout';
import { supabase } from '@/lib/supabase';
import { HubSop } from '@/lib/types';

const categoryIcons: Record<string, string> = {
  onboarding: 'ri-user-add-line', reporting: 'ri-file-chart-line', ad_launch: 'ri-rocket-line',
  slack: 'ri-slack-line', training: 'ri-video-line', branding: 'ri-palette-line', general: 'ri-book-2-line',
};
const categoryColors: Record<string, string> = {
  onboarding: 'bg-emerald-100 text-emerald-700', reporting: 'bg-sky-100 text-sky-700',
  ad_launch: 'bg-orange-100 text-orange-700', slack: 'bg-purple-100 text-purple-700',
  training: 'bg-rose-100 text-rose-700', branding: 'bg-amber-100 text-amber-700',
  general: 'bg-gray-100 text-gray-600',
};

export default function ContractorSopPage() {
  const [sops, setSops] = useState<HubSop[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [viewSop, setViewSop] = useState<HubSop | null>(null);

  useEffect(() => {
    const fetchSops = async () => {
      setLoading(true);
      const { data } = await supabase.from('hub_sop').select('*').eq('published', true).order('category').order('title');
      setSops((data as HubSop[]) ?? []);
      setLoading(false);
    };
    fetchSops();
  }, []);

  const categories = ['all', ...Array.from(new Set(sops.map((s) => s.category)))];
  const filtered = sops.filter((s) => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || s.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <ContractorLayout title="SOP Library">
      <div className="space-y-4 max-w-4xl">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SOPs..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg flex-wrap">
            {categories.slice(0, 5).map((c) => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap capitalize ${categoryFilter === c ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {c === 'all' ? 'All' : c.replace('_', ' ')}
              </button>
            ))}
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
            {filtered.map((s) => (
              <div key={s.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors cursor-pointer"
                onClick={() => setViewSop(s)}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${categoryColors[s.category] || 'bg-gray-100 text-gray-500'}`}>
                    <i className={`${categoryIcons[s.category] || 'ri-book-2-line'} text-base`}></i>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${categoryColors[s.category]}`}>{s.category.replace('_', ' ')}</span>
                </div>
                <h3 className="text-sm font-semibold text-[#111827] mb-1 line-clamp-2">{s.title}</h3>
                {s.content && <p className="text-xs text-gray-400 line-clamp-2">{s.content}</p>}
                {s.video_url && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <i className="ri-video-line"></i> Video available
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {viewSop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${categoryColors[viewSop.category]}`}>
                  <i className={`${categoryIcons[viewSop.category] || 'ri-book-2-line'} text-base`}></i>
                </div>
                <div>
                  <h2 className="font-semibold text-[#111827]">{viewSop.title}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${categoryColors[viewSop.category]}`}>{viewSop.category.replace('_', ' ')}</span>
                </div>
              </div>
              <button onClick={() => setViewSop(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {viewSop.video_url && (
                <div className="rounded-xl overflow-hidden bg-gray-50">
                  <iframe src={viewSop.video_url} className="w-full aspect-video" allowFullScreen title={viewSop.title}></iframe>
                </div>
              )}
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{viewSop.content || 'No content yet.'}</div>
            </div>
          </div>
        </div>
      )}
    </ContractorLayout>
  );
}
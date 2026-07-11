import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';

// RSVPs live in the wedding site's Vercel Blob store, read through the
// carlo-trixia-rsvps edge function (which holds the site's admin password).
type RsvpEntry = {
  id: string;
  submittedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  attending: 'yes' | 'no' | '';
  plusOne: 'yes' | 'no' | '';
  guestName: string;
  allergies: string;
  songRequest: string;
  message: string;
};

export default function CarloTrixiaRsvpsPage() {
  const navigate = useNavigate();
  const [rsvps, setRsvps] = useState<RsvpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RsvpEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'yes' | 'no'>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase.functions.invoke('carlo-trixia-rsvps', { body: { action: 'list' } });
      if (error || data?.error) setLoadError(error?.message ?? data.error);
      else setRsvps((data?.entries ?? []) as RsvpEntry[]);
      setLoading(false);
    })();
  }, []);

  const attending = rsvps.filter(r => r.attending === 'yes');
  const declined = rsvps.filter(r => r.attending === 'no');
  const plusOnes = attending.filter(r => r.plusOne === 'yes').length;
  const headcount = attending.length + plusOnes;
  const visible = filter === 'all' ? rsvps : rsvps.filter(r => r.attending === filter);

  const deleteEntry = async () => {
    if (!selected) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke('carlo-trixia-rsvps', { body: { action: 'delete', id: selected.id } });
    setDeleting(false);
    if (error || data?.error) { alert(`Delete failed: ${error?.message ?? data.error}`); return; }
    setRsvps(prev => prev.filter(r => r.id !== selected.id));
    setSelected(null);
    setConfirmDelete(false);
  };

  return (
    <AdminLayout title="Carlo & Trixia — RSVPs">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate('/hub/admin/rsvps')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
            <i className="ri-arrow-left-line text-base"></i> All Events
          </button>
          <a href="https://carloandtrixia.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-[#3B3F8C] hover:text-[#2a2e6a] font-medium transition-colors">
            <i className="ri-external-link-line text-base"></i> Wedding Site
          </a>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800">💍 Carlo &amp; Trixia Wedding</h2>
          <p className="text-xs text-gray-400 mt-0.5">Saturday, November 28, 2026 · RSVP deadline Sep 30, 2026</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-white/60">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Responses</p>
            <p className="text-3xl font-bold text-gray-800">{rsvps.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-white/60">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Attending</p>
            <p className="text-3xl font-bold text-emerald-600">{attending.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-white/60">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Declined</p>
            <p className="text-3xl font-bold text-rose-500">{declined.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-white/60">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Headcount</p>
            <p className="text-3xl font-bold text-gray-800">{headcount}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">incl. {plusOnes} plus one{plusOnes !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {([['all', 'All'], ['yes', 'Attending'], ['no', 'Declined']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                filter === key ? 'bg-[#3B3F8C] text-white shadow-sm' : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-100'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-white/60 overflow-hidden flex-1 w-full overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : loadError ? (
              <div className="p-8 text-center text-rose-500 text-sm">Could not load RSVPs: {loadError}</div>
            ) : visible.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No RSVPs {filter !== 'all' ? 'in this filter' : 'yet'}.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Email</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Attending</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">+1</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visible.map((r) => (
                    <tr key={r.id}
                      onClick={() => { setSelected(r); setConfirmDelete(false); }}
                      className={`cursor-pointer transition-colors ${
                        selected?.id === r.id ? 'bg-[#3B3F8C]/5 border-l-2 border-[#3B3F8C]' : 'hover:bg-gray-50/60'
                      }`}>
                      <td className="px-5 py-3 font-medium text-gray-800">{r.firstName} {r.lastName}</td>
                      <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{r.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          r.attending === 'yes' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {r.attending === 'yes' ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">
                        {r.plusOne === 'yes' ? <i className="ri-user-add-line text-emerald-500"></i> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-400 whitespace-nowrap hidden md:table-cell">
                        {new Date(r.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-full lg:w-80 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-white/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 text-sm">RSVP Detail</h3>
                <button onClick={() => { setSelected(null); setConfirmDelete(false); }}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer">×</button>
              </div>

              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#3B3F8C]/10 text-[#3B3F8C] font-bold text-lg mb-4 mx-auto">
                {selected.firstName.charAt(0).toUpperCase()}
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Name</p>
                  <p className="text-gray-800 font-medium">{selected.firstName} {selected.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Email</p>
                  <p className="text-gray-600 break-all">{selected.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Attending</p>
                  <p className={selected.attending === 'yes' ? 'text-emerald-600 font-medium' : 'text-rose-500 font-medium'}>
                    {selected.attending === 'yes' ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Plus One</p>
                  <p className="text-gray-600">{selected.plusOne === 'yes' ? (selected.guestName ? `Yes — ${selected.guestName}` : 'Yes') : 'No'}</p>
                </div>
                {selected.allergies && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Dietary / Allergies</p>
                    <p className="text-gray-600">{selected.allergies}</p>
                  </div>
                )}
                {selected.songRequest && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Song Request</p>
                    <p className="text-gray-600">{selected.songRequest}</p>
                  </div>
                )}
                {selected.message && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Message</p>
                    <p className="text-gray-600 whitespace-pre-wrap">{selected.message}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Submitted</p>
                  <p className="text-gray-400 text-xs">{new Date(selected.submittedAt).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100">
                {confirmDelete ? (
                  <div className="space-y-2">
                    <p className="text-xs text-rose-600">Delete this RSVP permanently from the wedding site?</p>
                    <div className="flex gap-2">
                      <button onClick={deleteEntry} disabled={deleting}
                        className="flex-1 py-2 text-xs bg-rose-500 text-white rounded-lg hover:bg-rose-600 cursor-pointer disabled:opacity-40">
                        {deleting ? 'Deleting…' : 'Yes, delete'}
                      </button>
                      <button onClick={() => setConfirmDelete(false)}
                        className="flex-1 py-2 text-xs border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)}
                    className="w-full py-2 text-xs border border-rose-200 text-rose-500 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors">
                    <i className="ri-delete-bin-line mr-1"></i> Delete RSVP
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

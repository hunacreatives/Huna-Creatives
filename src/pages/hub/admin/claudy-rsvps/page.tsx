import { useEffect, useState } from 'react';
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
  const [activeIdx, setActiveIdx] = useState(0);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RSVP | null>(null);

  const activeEvent = EVENTS[activeIdx];

  useEffect(() => {
    setLoading(true);
    supabase
      .from(activeEvent.table)
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRsvps(data ?? []);
        setLoading(false);
      });
  }, [activeIdx, activeEvent.table]);

  const totalGuests = rsvps.reduce((sum, r) => sum + 1 + r.plus_ones, 0);

  return (
    <AdminLayout title="Claudy's 30th — RSVPs">
      <div className="p-6 max-w-5xl mx-auto">

        {/* Event tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {EVENTS.map((e, i) => (
            <button
              key={e.table}
              onClick={() => { setActiveIdx(i); setSelected(null); }}
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

        <div className="flex gap-5 items-start">
          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-white/60 overflow-hidden flex-1">
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
                      onClick={() => setSelected(r)}
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

          {/* Detail panel */}
          {selected && (
            <div className="w-72 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-white/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 text-sm">RSVP Detail</h3>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer">×</button>
              </div>

              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#3B3F8C]/10 text-[#3B3F8C] font-bold text-lg mb-4 mx-auto">
                {selected.name.charAt(0).toUpperCase()}
              </div>

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
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

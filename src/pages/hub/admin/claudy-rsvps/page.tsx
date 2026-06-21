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
  // Add future events here
];

export default function EventRsvpsPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);

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
    <AdminLayout title="Event RSVPs">
      <div className="p-6 max-w-5xl mx-auto">

        {/* Event tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {EVENTS.map((e, i) => (
            <button
              key={e.table}
              onClick={() => setActiveIdx(i)}
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

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-white/60 overflow-hidden">
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
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">+Guests</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Message</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rsvps.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{r.name}</td>
                    <td className="px-5 py-3 text-gray-500">{r.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                        {r.plus_ones}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 italic max-w-xs truncate">
                      {r.message || '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';

type EventConfig = {
  label: string;
  client: string;
  date: string;
  /** RSVPs come from a Supabase table, or an edge function returning { entries } */
  source: { table: string } | { fn: string };
  key: string;
  route: string;
  emoji: string;
};

const EVENTS: EventConfig[] = [
  {
    label: "Claudy's 30th Birthday",
    client: 'Claudy',
    date: 'Jul 25, 2026',
    source: { table: 'claudy_rsvps' },
    key: 'claudy_rsvps',
    route: '/hub/admin/claudy-rsvps',
    emoji: '🎂',
  },
  {
    label: 'Carlo & Trixia Wedding',
    client: 'Carlo & Trixia',
    date: 'Nov 28, 2026',
    source: { fn: 'carlo-trixia-rsvps' },
    key: 'carlo_trixia_rsvps',
    route: '/hub/admin/carlo-trixia-rsvps',
    emoji: '💍',
  },
  // Add future events here
];

export default function RsvpsIndexPage() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    EVENTS.forEach(async (event) => {
      if ('table' in event.source) {
        const { count } = await supabase
          .from(event.source.table)
          .select('*', { count: 'exact', head: true });
        setCounts((prev) => ({ ...prev, [event.key]: count ?? 0 }));
      } else {
        const { data } = await supabase.functions.invoke(event.source.fn, { body: { action: 'list' } });
        setCounts((prev) => ({ ...prev, [event.key]: data?.entries?.length ?? 0 }));
      }
    });
  }, []);

  return (
    <AdminLayout title="Event RSVPs">
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-sm text-gray-400 mb-6">Click an event to view its RSVPs.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EVENTS.map((event) => (
            <button
              key={event.key}
              onClick={() => navigate(event.route)}
              className="text-left bg-white rounded-2xl p-5 shadow-sm border border-white/60 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{event.emoji}</span>
                <span className="text-xs text-gray-400 bg-gray-50 rounded-full px-3 py-1">{event.date}</span>
              </div>
              <p className="font-semibold text-gray-800 text-base mb-0.5 group-hover:text-[#3B3F8C] transition-colors">
                {event.label}
              </p>
              <p className="text-xs text-gray-400">{event.client}</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                  {counts[event.key] ?? '—'} RSVPs
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

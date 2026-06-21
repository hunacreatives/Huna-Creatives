import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';

type EventConfig = {
  label: string;
  client: string;
  date: string;
  table: string;
  route: string;
  emoji: string;
};

const EVENTS: EventConfig[] = [
  {
    label: "Claudy's 30th Birthday",
    client: 'Claudy',
    date: 'Jul 25, 2026',
    table: 'claudy_rsvps',
    route: '/hub/admin/claudy-rsvps',
    emoji: '🎂',
  },
  // Add future events here
];

export default function RsvpsIndexPage() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    EVENTS.forEach(async (event) => {
      const { count } = await supabase
        .from(event.table)
        .select('*', { count: 'exact', head: true });
      setCounts((prev) => ({ ...prev, [event.table]: count ?? 0 }));
    });
  }, []);

  return (
    <AdminLayout title="Event RSVPs">
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-sm text-gray-400 mb-6">Click an event to view its RSVPs.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EVENTS.map((event) => (
            <button
              key={event.table}
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
                  {counts[event.table] ?? '—'} RSVPs
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

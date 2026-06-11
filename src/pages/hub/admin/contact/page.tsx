import { useEffect, useState } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';

type SubmissionStatus = 'new' | 'read' | 'replied' | 'archived';

interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: SubmissionStatus;
  created_at: string;
}

const statusColors: Record<SubmissionStatus, string> = {
  new: 'bg-amber-100 text-amber-700',
  read: 'bg-sky-100 text-sky-700',
  replied: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-gray-100 text-gray-500',
};

const statusOptions: SubmissionStatus[] = ['new', 'read', 'replied', 'archived'];

export default function ContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | SubmissionStatus>('all');
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetch = async () => {
    setLoading(true);
    let q = supabase.from('contact_submissions').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setSubmissions((data as ContactSubmission[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [filter]);

  const updateStatus = async (id: number, status: SubmissionStatus) => {
    setUpdating(true);
    await supabase.from('contact_submissions').update({ status }).eq('id', id);
    setUpdating(false);
    setSelected((prev) => prev ? { ...prev, status } : prev);
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
  };

  const counts = {
    all: submissions.length,
    new: submissions.filter((s) => s.status === 'new').length,
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <AdminLayout title="Contact Inbox">
      <div className="space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: submissions.length, color: 'text-gray-900' },
            { label: 'New', value: submissions.filter(s => s.status === 'new').length, color: 'text-amber-600' },
            { label: 'Replied', value: submissions.filter(s => s.status === 'replied').length, color: 'text-emerald-600' },
            { label: 'Archived', value: submissions.filter(s => s.status === 'archived').length, color: 'text-gray-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['all', ...statusOptions] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize cursor-pointer transition-colors ${
                filter === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-5 items-start">
          {/* List */}
          <div className="flex-1 min-w-0 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <i className="ri-loader-4-line animate-spin text-2xl text-gray-300" />
              </div>
            ) : submissions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <i className="ri-mail-line text-3xl text-gray-200 block mb-3" />
                <p className="text-sm text-gray-400">No submissions yet</p>
              </div>
            ) : (
              submissions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`w-full text-left bg-white rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-sm ${
                    selected?.id === s.id ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm text-gray-900 truncate">{s.name}</span>
                      <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[s.status]}`}>
                        {s.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">{fmt(s.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mb-1">{s.email}</p>
                  {s.subject && <p className="text-xs font-medium text-gray-600 truncate">{s.subject}</p>}
                  <p className="text-xs text-gray-400 truncate mt-1">{s.message}</p>
                </button>
              ))
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-[340px] flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-0">
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <p className="font-semibold text-gray-900">{selected.name}</p>
                  <a href={`mailto:${selected.email}`} className="text-xs text-indigo-500 hover:underline">{selected.email}</a>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500 cursor-pointer">
                  <i className="ri-close-line text-lg" />
                </button>
              </div>

              {selected.subject && (
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{selected.subject}</p>
              )}

              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
                {selected.message}
              </div>

              <p className="text-[11px] text-gray-400 mb-4">{fmt(selected.created_at)}</p>

              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-medium">Status</p>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((s) => (
                    <button
                      key={s}
                      disabled={updating || selected.status === s}
                      onClick={() => updateStatus(selected.id, s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        selected.status === s ? statusColors[s] : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <a
                  href={`mailto:${selected.email}?subject=Re: ${selected.subject ?? 'Your inquiry'}`}
                  className="flex items-center justify-center gap-2 w-full mt-3 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  <i className="ri-mail-send-line" />
                  Reply via Email
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

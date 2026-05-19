import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';

interface AttendanceRecord {
  hub_user_id: string | null;
  email: string | null;
  full_name: string;
  avatar_url: string | null;
  department: string | null;
  status: 'on' | 'off' | 'absent';
  last_punch: string | null;
  punches: { status: 'on' | 'off'; time: string }[];
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function Avatar({ name, avatar_url }: { name: string; avatar_url: string | null }) {
  if (avatar_url) {
    return <img src={avatar_url} alt={name} className="w-9 h-9 rounded-full object-cover object-top flex-shrink-0" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
      <span className="text-white text-sm font-bold">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

export default function AdminAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'on' | 'off' | 'absent'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchAttendance = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    const { data, error } = await supabase.functions.invoke('slack-attendance');

    if (!error && data?.attendance) {
      setRecords(data.attendance);
      setLastRefresh(new Date());
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(() => fetchAttendance(true), 60000);
    return () => clearInterval(interval);
  }, [fetchAttendance]);

  const filtered = filter === 'all' ? records : records.filter(r => r.status === filter);

  const counts = {
    on: records.filter(r => r.status === 'on').length,
    off: records.filter(r => r.status === 'off').length,
    absent: records.filter(r => r.status === 'absent').length,
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <AdminLayout title="Attendance">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{today}</p>
            {lastRefresh && (
              <p className="text-xs text-gray-400">
                Last updated {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
              </p>
            )}
          </div>
          <button
            onClick={() => fetchAttendance(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <i className={`ri-refresh-line text-sm ${refreshing ? 'animate-spin' : ''}`}></i>
            Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
              <i className="ri-user-follow-line text-emerald-600 text-sm"></i>
            </div>
            <p className="text-2xl font-bold text-gray-900">{counts.on}</p>
            <p className="text-xs text-gray-500 mt-0.5">Online</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
              <i className="ri-user-unfollow-line text-gray-500 text-sm"></i>
            </div>
            <p className="text-2xl font-bold text-gray-900">{counts.off}</p>
            <p className="text-xs text-gray-500 mt-0.5">Logged Off</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
              <i className="ri-time-line text-amber-600 text-sm"></i>
            </div>
            <p className="text-2xl font-bold text-gray-900">{counts.absent}</p>
            <p className="text-xs text-gray-500 mt-0.5">Not In Yet</p>
          </div>
        </div>

        {/* Slack source note */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg">
          <i className="ri-slack-line text-gray-400 text-sm"></i>
          <p className="text-xs text-gray-500">Live from Slack — contractors type <span className="font-mono bg-white border border-gray-200 px-1 rounded">On</span> or <span className="font-mono bg-white border border-gray-200 px-1 rounded">Off</span> in the attendance channel. Auto-refreshes every minute.</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'on', 'off', 'absent'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filter === f
                  ? 'bg-[#111827] text-white'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {f === 'all' ? 'All' : f === 'on' ? 'Online' : f === 'off' ? 'Logged Off' : 'Not In'}
              <span className="ml-1.5 opacity-60">
                {f === 'all' ? records.length : counts[f]}
              </span>
            </button>
          ))}
        </div>

        {/* Records */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <i className="ri-calendar-check-line text-3xl mb-2 block"></i>
            <p className="text-sm">No records for this filter</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const key = r.hub_user_id || r.email || r.full_name;
              const isExpanded = expanded === key;
              return (
                <div key={key} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : key)}
                  >
                    <div className="relative">
                      <Avatar name={r.full_name} avatar_url={r.avatar_url} />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        r.status === 'on' ? 'bg-emerald-500' : r.status === 'off' ? 'bg-gray-400' : 'bg-amber-400'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.full_name}</p>
                      {r.department && <p className="text-xs text-gray-400">{r.department}</p>}
                    </div>

                    <div className="text-right flex-shrink-0 space-y-0.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === 'on'
                            ? 'bg-emerald-100 text-emerald-700'
                            : r.status === 'off'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {r.status === 'on' ? 'Online' : r.status === 'off' ? 'Logged Off' : 'Not In'}
                        </span>
                        {r.overtime_today > 0 && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            +{r.overtime_today}h OT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {r.status === 'absent' ? 'No punch today' : `Last: ${formatTime(r.last_punch)}`}
                      </p>
                    </div>

                    {r.punches.length > 0 && (
                      <i className={`ri-arrow-down-s-line text-gray-400 text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                    )}
                  </div>

                  {isExpanded && (r.punches.length > 0 || r.overtime_today > 0) && (
                    <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-3">
                      {r.punches.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2">Today's punches</p>
                          <div className="space-y-1.5">
                            {r.punches.map((p, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.status === 'on' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                <span className={`text-xs font-medium ${p.status === 'on' ? 'text-emerald-700' : 'text-gray-600'}`}>
                                  {p.status === 'on' ? 'Logged On' : 'Logged Off'}
                                </span>
                                <span className="text-xs text-gray-400">{formatTime(p.time)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {r.overtime_today > 0 && (
                        <div className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2">
                          <i className="ri-time-fill text-purple-500 text-sm"></i>
                          <span className="text-xs font-medium text-purple-700">Overtime logged: {r.overtime_today}h</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

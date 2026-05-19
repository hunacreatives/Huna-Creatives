import { useEffect, useState, useCallback } from 'react';
import ContractorLayout from '@/pages/hub/components/ContractorLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface PunchRecord {
  status: 'on' | 'off';
  time: string;
}

interface MyAttendance {
  status: 'on' | 'off' | 'absent';
  last_punch: string | null;
  punches: PunchRecord[];
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function ContractorAttendancePage() {
  const { hubUser } = useAuth();
  const [myRecord, setMyRecord] = useState<MyAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAttendance = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    const { data, error } = await supabase.functions.invoke('slack-attendance');

    if (!error && data?.attendance && hubUser?.email) {
      const mine = data.attendance.find(
        (r: any) => r.email === hubUser.email || r.hub_user_id === hubUser.id
      );
      setMyRecord(mine || { status: 'absent', last_punch: null, punches: [] });
      setLastRefresh(new Date());
    }

    setLoading(false);
    setRefreshing(false);
  }, [hubUser]);

  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(() => fetchAttendance(true), 60000);
    return () => clearInterval(interval);
  }, [fetchAttendance]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ContractorLayout title="My Attendance">
      <div className="max-w-3xl space-y-5">

        {/* Date + refresh */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">{today}</p>
            {lastRefresh && (
              <p className="text-xs text-gray-400">
                Updated {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
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

        {/* Status card */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 flex items-center justify-center">
            <i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i>
          </div>
        ) : (
          <div className={`rounded-2xl border p-6 text-center ${
            myRecord?.status === 'on'
              ? 'bg-emerald-50 border-emerald-200'
              : myRecord?.status === 'off'
              ? 'bg-gray-50 border-gray-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              myRecord?.status === 'on'
                ? 'bg-emerald-100'
                : myRecord?.status === 'off'
                ? 'bg-gray-100'
                : 'bg-amber-100'
            }`}>
              <i className={`text-2xl ${
                myRecord?.status === 'on'
                  ? 'ri-user-follow-line text-emerald-600'
                  : myRecord?.status === 'off'
                  ? 'ri-user-unfollow-line text-gray-500'
                  : 'ri-time-line text-amber-600'
              }`}></i>
            </div>
            <p className={`text-xl font-bold mb-1 ${
              myRecord?.status === 'on'
                ? 'text-emerald-700'
                : myRecord?.status === 'off'
                ? 'text-gray-700'
                : 'text-amber-700'
            }`}>
              {myRecord?.status === 'on' ? "You're Online" : myRecord?.status === 'off' ? 'Logged Off' : 'Not Clocked In'}
            </p>
            <p className="text-sm text-gray-500">
              {myRecord?.status === 'absent'
                ? "You haven't typed On in Slack yet today"
                : `Last punch: ${formatTime(myRecord?.last_punch ?? null)}`}
            </p>
          </div>
        )}

        {/* How it works */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500 mb-3">How to log attendance</p>
          <div className="space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className="ri-login-box-line text-emerald-600 text-xs"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Starting work</p>
                <p className="text-xs text-gray-500">Type <span className="font-mono bg-gray-50 border border-gray-200 px-1 rounded">On</span> in the Slack attendance channel</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className="ri-logout-box-line text-gray-500 text-xs"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Ending work</p>
                <p className="text-xs text-gray-500">Type <span className="font-mono bg-gray-50 border border-gray-200 px-1 rounded">Off</span> in the Slack attendance channel</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className="ri-time-fill text-purple-600 text-xs"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Logging overtime</p>
                <p className="text-xs text-gray-500">
                  Type <span className="font-mono bg-gray-50 border border-gray-200 px-1 rounded">Overtime</span> in the channel,
                  then reply to that message with the number of hours (e.g. <span className="font-mono bg-gray-50 border border-gray-200 px-1 rounded">4</span>)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Today's punches */}
        {myRecord && (myRecord.punches.length > 0 || (myRecord as any).overtime_today > 0) && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            {myRecord.punches.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-3">Today's log</p>
                <div className="space-y-2">
                  {myRecord.punches.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.status === 'on' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      <span className={`text-sm font-medium ${p.status === 'on' ? 'text-emerald-700' : 'text-gray-600'}`}>
                        {p.status === 'on' ? 'Logged On' : 'Logged Off'}
                      </span>
                      <span className="text-sm text-gray-400 ml-auto">{formatTime(p.time)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(myRecord as any).overtime_today > 0 && (
              <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2.5">
                <i className="ri-time-fill text-purple-500 text-sm"></i>
                <span className="text-sm font-medium text-purple-700">
                  Overtime logged: {(myRecord as any).overtime_today}h
                </span>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-center text-gray-400">
          <i className="ri-slack-line mr-1"></i>
          Attendance is synced from Slack every minute
        </p>
      </div>
    </ContractorLayout>
  );
}

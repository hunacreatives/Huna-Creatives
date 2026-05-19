import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ContractorLayout from '@/pages/hub/components/ContractorLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { HubAnnouncement, HubRequest, HubTimeOff } from '@/lib/types';

const CLOCKS = [
  { label: 'Philippines', city: 'Cebu', tz: 'Asia/Manila', flag: '🇵🇭' },
  { label: 'US Pacific', city: 'Los Angeles', tz: 'America/Los_Angeles', flag: '🇺🇸' },
  { label: 'US Eastern', city: 'New York', tz: 'America/New_York', flag: '🇺🇸' },
  { label: 'London', city: 'London', tz: 'Europe/London', flag: '🇬🇧' },
  { label: 'Sydney', city: 'Sydney', tz: 'Australia/Sydney', flag: '🇦🇺' },
];

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function ClockFace({ tz, flag, label, city, isHome }: { tz: string; flag: string; label: string; city: string; isHome: boolean }) {
  const now = useClock();
  const time = now.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const date = now.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' });
  const [h, ms] = time.split(':');
  const ampm = ms.slice(-2);
  const minSec = ms.slice(0, 5);

  // Work hours indicator (9am–6pm local)
  const localHour = parseInt(now.toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }));
  const isWorkHours = localHour >= 9 && localHour < 18;

  return (
    <div className={`flex items-center justify-between py-3 border-b border-gray-50 last:border-0 ${isHome ? 'opacity-100' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="text-xl leading-none">{flag}</span>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-gray-700">{label}</p>
            {isWorkHours && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="Business hours" />
            )}
          </div>
          <p className="text-xs text-gray-400">{city} · {date}</p>
        </div>
      </div>
      <div className="text-right tabular-nums">
        <p className="text-sm font-bold text-gray-800">
          {h}:{minSec} <span className="text-xs font-normal text-gray-400">{ampm}</span>
        </p>
      </div>
    </div>
  );
}

interface SlackTeamRecord {
  full_name: string;
  avatar_url: string | null;
  status: 'on' | 'off' | 'absent';
  hours_today: number;
}

export default function ContractorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [slackStatus, setSlackStatus] = useState<'on' | 'off' | 'absent' | null>(null);
  const [hoursThisCutoff, setHoursThisCutoff] = useState(0);
  const [estimatedPayout, setEstimatedPayout] = useState(0);
  const [announcements, setAnnouncements] = useState<HubAnnouncement[]>([]);
  const [requests, setRequests] = useState<HubRequest[]>([]);
  const [timeOffs, setTimeOffs] = useState<HubTimeOff[]>([]);
  const [teamStatus, setTeamStatus] = useState<SlackTeamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const isFirstHalf = today.getDate() <= 15;
  const cutoffStart = isFirstHalf
    ? new Date(today.getFullYear(), today.getMonth(), 1)
    : new Date(today.getFullYear(), today.getMonth(), 16);
  const cutoffEnd = isFirstHalf
    ? new Date(today.getFullYear(), today.getMonth(), 15)
    : new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const periodTotal = Math.round((cutoffEnd.getTime() - cutoffStart.getTime()) / 86400000) + 1;
  const daysElapsed = Math.min(Math.round((today.getTime() - cutoffStart.getTime()) / 86400000) + 1, periodTotal);
  const daysLeft = Math.max(periodTotal - daysElapsed, 0);
  const paydayLabel = isFirstHalf
    ? `${today.toLocaleDateString('en-US', { month: 'long' })} 15`
    : new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const isFixed = (user as any)?.payment_type === 'fixed';
  const maxHours = daysElapsed * 8;
  const hoursProgress = maxHours > 0 ? Math.min((hoursThisCutoff / maxHours) * 100, 100) : 0;

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [attResult, annResult, reqResult, toResult, slackResult] = await Promise.all([
      supabase
        .from('hub_daily_hours')
        .select('hours_capped')
        .eq('user_id', user.id)
        .gte('date', cutoffStart.toISOString().split('T')[0])
        .lte('date', cutoffEnd.toISOString().split('T')[0]),
      supabase.from('hub_announcements').select('*').eq('published', true).order('created_at', { ascending: false }).limit(4),
      supabase.from('hub_requests').select('*').eq('contractor_id', user.id).order('created_at', { ascending: false }).limit(3),
      supabase.from('hub_time_off').select('*').eq('contractor_id', user.id).order('created_at', { ascending: false }).limit(3),
      supabase.functions.invoke('slack-attendance'),
    ]);

    const totalHours = (attResult.data ?? []).reduce((s: number, r: any) => s + (r.hours_capped || 0), 0);
    setHoursThisCutoff(parseFloat(totalHours.toFixed(2)));

    if (isFixed) {
      setEstimatedPayout(((user as any).monthly_rate || 0) / 2);
    } else {
      setEstimatedPayout(totalHours * ((user as any).hourly_rate || 0));
    }

    if (!slackResult.error && slackResult.data?.attendance) {
      const all: any[] = slackResult.data.attendance;
      const mine = all.find((r: any) => r.email === user.email || r.hub_user_id === user.id);
      setSlackStatus(mine?.status ?? 'absent');
      // Team = everyone else
      setTeamStatus(
        all
          .filter((r: any) => r.hub_user_id !== user.id && r.email !== user.email)
          .map((r: any) => ({
            full_name: r.full_name,
            avatar_url: r.avatar_url,
            status: r.status,
            hours_today: r.hours_today || 0,
          }))
      );
    }

    setAnnouncements((annResult.data as HubAnnouncement[]) ?? []);
    setRequests((reqResult.data as HubRequest[]) ?? []);
    setTimeOffs((toResult.data as HubTimeOff[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const currency = (user as any)?.currency || 'PHP';
  const isUSD = currency === 'USD';

  const statusColors: Record<string, string> = {
    open: 'bg-amber-100 text-amber-700', in_review: 'bg-sky-100 text-sky-700',
    resolved: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-rose-100 text-rose-700',
    forwarded: 'bg-purple-100 text-purple-700',
  };

  const onlineCount = teamStatus.filter(t => t.status === 'on').length;

  return (
    <ContractorLayout title="Dashboard">
      {loading ? (
        <div className="flex justify-center py-20"><i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl">

          {/* ── LEFT COLUMN (2/3) ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Hero greeting */}
            <div className="bg-[#111827] rounded-2xl p-5 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #FF6B35 0%, transparent 60%)' }} />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-white/50 text-xs">
                      {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <h2 className="text-xl font-bold mt-0.5">{greeting}, {user?.full_name?.split(' ')[0]}.</h2>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 ${
                    slackStatus === 'on' ? 'bg-emerald-500/20 text-emerald-300' :
                    slackStatus === 'off' ? 'bg-white/10 text-white/60' :
                    'bg-amber-500/20 text-amber-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      slackStatus === 'on' ? 'bg-emerald-400 animate-pulse' :
                      slackStatus === 'off' ? 'bg-white/40' : 'bg-amber-400'
                    }`} />
                    {slackStatus === 'on' ? 'Online' : slackStatus === 'off' ? 'Logged Off' : 'Not clocked in'}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-white/50 text-xs">
                      Pay period · {isFirstHalf
                        ? `${today.toLocaleDateString('en-US', { month: 'short' })} 1–15`
                        : `${today.toLocaleDateString('en-US', { month: 'short' })} 16–${cutoffEnd.getDate()}`}
                    </p>
                    <p className="text-white/50 text-xs">
                      {daysLeft === 0 ? `Payday: ${paydayLabel}` : `${daysLeft}d until ${paydayLabel}`}
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#FF6B35] rounded-full" style={{ width: `${(daysElapsed / periodTotal) * 100}%` }} />
                  </div>
                </div>
                <p className="text-white/30 text-xs mt-3 flex items-center gap-1">
                  <i className="ri-slack-line"></i>
                  Type <span className="font-mono bg-white/10 px-1 rounded mx-0.5">On</span> or <span className="font-mono bg-white/10 px-1 rounded mx-0.5">Off</span> in the Slack attendance channel
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Hours This Cutoff</span>
                  <div className="w-7 h-7 bg-sky-50 rounded-lg flex items-center justify-center">
                    <i className="ri-time-line text-sky-600 text-sm"></i>
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#111827]">{hoursThisCutoff.toFixed(1)}<span className="text-base text-gray-400 font-normal">h</span></p>
                {!isFixed && (
                  <div className="mt-2">
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${hoursProgress}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{maxHours}h possible so far</p>
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Est. Payout</span>
                  <div className="w-7 h-7 bg-[#FF6B35]/10 rounded-lg flex items-center justify-center">
                    <i className="ri-money-dollar-circle-line text-[#FF6B35] text-sm"></i>
                  </div>
                </div>
                <p className="text-xl font-bold text-[#111827]">
                  {isUSD ? '$' : '₱'}{estimatedPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-400 mt-1">{isFixed ? 'Fixed cutoff rate' : 'Based on hours logged'}</p>
              </div>
            </div>

            {/* Announcements */}
            {announcements.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[#111827] mb-3">Announcements</h3>
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <div key={a.id} className="flex items-start gap-2.5 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                      <div className="w-7 h-7 bg-[#FF6B35]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="ri-megaphone-line text-[#FF6B35] text-xs"></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#111827]">{a.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{a.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requests + Time-off */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#111827]">My Requests</h3>
                  <button onClick={() => navigate('/hub/contractor/requests')} className="text-xs text-[#FF6B35] hover:underline cursor-pointer">View all</button>
                </div>
                {requests.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No requests yet</p>
                ) : (
                  <div className="space-y-2">
                    {requests.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2">
                        <p className="text-sm text-gray-700 truncate flex-1">{r.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium capitalize ${statusColors[r.status] || 'bg-gray-100 text-gray-600'}`}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#111827]">Time-Off</h3>
                  <button onClick={() => navigate('/hub/contractor/timeoff')} className="text-xs text-[#FF6B35] hover:underline cursor-pointer">Request</button>
                </div>
                {timeOffs.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No time-off requests</p>
                ) : (
                  <div className="space-y-2">
                    {timeOffs.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-2">
                        <p className="text-sm text-gray-700 capitalize">{t.type} leave</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium capitalize ${statusColors[t.status] || 'bg-gray-100 text-gray-600'}`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Attendance', icon: 'ri-time-line', path: '/hub/contractor/attendance' },
                { label: 'Payslips', icon: 'ri-file-list-3-line', path: '/hub/contractor/payouts' },
                { label: 'SOPs', icon: 'ri-book-open-line', path: '/hub/contractor/sop' },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-100 hover:border-[#FF6B35]/30 hover:bg-[#FF6B35]/5 rounded-xl transition-all cursor-pointer"
                >
                  <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center">
                    <i className={`${a.icon} text-[#FF6B35] text-base`}></i>
                  </div>
                  <span className="text-xs text-gray-600 font-medium">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN (1/3) ── */}
          <div className="space-y-4">

            {/* World Clock */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-[#111827] rounded-md flex items-center justify-center flex-shrink-0">
                  <i className="ri-earth-line text-white text-xs"></i>
                </div>
                <h3 className="text-sm font-semibold text-[#111827]">World Clock</h3>
              </div>
              <div>
                {CLOCKS.map((c, i) => (
                  <ClockFace key={c.tz} {...c} isHome={i === 0} />
                ))}
              </div>
              <p className="text-xs text-gray-300 mt-3 text-center">
                <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span> Business hours (9am–6pm local)</span>
              </p>
            </div>

            {/* Team Status */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-emerald-50 rounded-md flex items-center justify-center flex-shrink-0">
                    <i className="ri-team-line text-emerald-600 text-xs"></i>
                  </div>
                  <h3 className="text-sm font-semibold text-[#111827]">Team</h3>
                </div>
                {onlineCount > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    {onlineCount} online
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {teamStatus.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2 text-center">No team data</p>
                ) : teamStatus.map((t) => (
                  <div key={t.full_name} className="flex items-center gap-2.5">
                    <div className="relative flex-shrink-0">
                      {t.avatar_url
                        ? <img src={t.avatar_url} alt={t.full_name} className="w-7 h-7 rounded-full object-cover object-top" />
                        : <div className="w-7 h-7 rounded-full bg-[#FF6B35] flex items-center justify-center"><span className="text-white text-xs font-bold">{t.full_name.charAt(0)}</span></div>
                      }
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        t.status === 'on' ? 'bg-emerald-500' : t.status === 'off' ? 'bg-gray-400' : 'bg-amber-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{t.full_name.split(' ')[0]}</p>
                    </div>
                    <span className={`text-xs flex-shrink-0 ${
                      t.status === 'on' ? 'text-emerald-600 font-medium' :
                      t.status === 'off' ? 'text-gray-400' : 'text-amber-500'
                    }`}>
                      {t.status === 'on' ? `${t.hours_today > 0 ? t.hours_today.toFixed(1) + 'h' : 'Online'}` : t.status === 'off' ? 'Off' : 'Away'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </ContractorLayout>
  );
}

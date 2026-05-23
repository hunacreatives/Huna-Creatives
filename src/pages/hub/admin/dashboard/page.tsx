import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { HubUser, HubAnnouncement, HubRequest, HubTimeOff } from '@/lib/types';
import { getSetting } from '@/lib/settings';

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

interface SlackRecord {
  hub_user_id: string | null;
  full_name: string;
  avatar_url: string | null;
  department: string | null;
  status: 'on' | 'off' | 'absent';
  last_punch: string | null;
  hours_today: number;
  overtime_today: number;
}

interface HoursRow { user_id: string; hours_capped: number; overtime_hours: number; }

interface BirthdayPerson {
  full_name: string;
  avatar_url: string | null;
  birthday: string;
  daysUntil: number;
  isToday: boolean;
}

function getBirthdayAlerts(contractors: { full_name: string; avatar_url?: string; birthday?: string }[]): BirthdayPerson[] {
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const results: BirthdayPerson[] = [];

  for (const c of contractors) {
    if (!c.birthday) continue;
    const parsed = new Date(c.birthday);
    if (isNaN(parsed.getTime())) continue;
    const bMonth = parsed.getMonth() + 1;
    const bDay = parsed.getDate();

    // Days until birthday this year (or next if passed)
    let diff = new Date(today.getFullYear(), bMonth - 1, bDay).getTime() - new Date(today.getFullYear(), todayMonth - 1, todayDay).getTime();
    if (diff < 0) diff += 365 * 24 * 60 * 60 * 1000;
    const daysUntil = Math.round(diff / (24 * 60 * 60 * 1000));

    if (daysUntil <= 14) {
      results.push({
        full_name: c.full_name,
        avatar_url: c.avatar_url || null,
        birthday: c.birthday,
        daysUntil,
        isToday: daysUntil === 0,
      });
    }
  }
  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

function Avatar({ name, url, size = 9 }: { name: string; url: string | null; size?: number }) {
  const sz = `w-${size} h-${size}`;
  if (url) return <img src={url} alt={name} className={`${sz} rounded-full object-cover object-top flex-shrink-0`} />;
  return (
    <div className={`${sz} rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0`}>
      <span className="text-white text-xs font-bold">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { hubUser } = useAuth();
  const [attendance, setAttendance] = useState<SlackRecord[]>([]);
  const [announcements, setAnnouncements] = useState<HubAnnouncement[]>([]);
  const [pendingRequests, setPendingRequests] = useState<HubRequest[]>([]);
  const [pendingTimeOff, setPendingTimeOff] = useState<HubTimeOff[]>([]);
  const [totalPayroll, setTotalPayroll] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [totalNetProfit, setTotalNetProfit] = useState(0);
  const [activeProjectCount, setActiveProjectCount] = useState(0);
  const [monthlyRetainerTotal, setMonthlyRetainerTotal] = useState(0);
  const [birthdays, setBirthdays] = useState<BirthdayPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const isOwner = hubUser?.role === 'owner';
  const isOwnerOrAdmin = isOwner || hubUser?.role === 'admin' || hubUser?.role === 'hr';

  const today = new Date();
  const isFirstHalf = today.getDate() <= 15;
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = today.getFullYear();
  const m = today.getMonth();
  const cutoffStart = isFirstHalf
    ? `${y}-${pad(m + 1)}-01`
    : `${y}-${pad(m + 1)}-16`;
  const lastDayOfMonth = new Date(y, m + 1, 0).getDate();
  const cutoffEnd = isFirstHalf
    ? `${y}-${pad(m + 1)}-15`
    : `${y}-${pad(m + 1)}-${pad(lastDayOfMonth)}`;

  // Payroll period progress
  const periodStart = new Date(cutoffStart);
  const periodEnd = new Date(cutoffEnd);
  const totalDays = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000) + 1;
  const daysElapsed = Math.min(Math.round((today.getTime() - periodStart.getTime()) / 86400000) + 1, totalDays);
  const daysLeft = Math.max(totalDays - daysElapsed, 0);
  const periodProgress = Math.round((daysElapsed / totalDays) * 100);
  const paydayLabel = isFirstHalf
    ? `${today.toLocaleDateString('en-US', { month: 'long' })} 15`
    : new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  useEffect(() => {
    const fetchAll = async () => {
      const [slackResult, annResult, reqResult, toResult, contractorsResult, hoursResult, projectsResult, clientsResult, usdRateStr] = await Promise.all([
        supabase.functions.invoke('slack-attendance'),
        supabase.from('hub_announcements').select('*, hub_users(full_name)').order('created_at', { ascending: false }).limit(4),
        supabase.from('hub_requests').select('*, hub_users(full_name, avatar_url)').in('status', ['open', 'in_review']).order('created_at', { ascending: false }),
        supabase.from('hub_time_off').select('*, hub_users(full_name, avatar_url)').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('hub_users').select('id, full_name, avatar_url, payment_type, hourly_rate, monthly_rate, currency, birthday').eq('status', 'active').in('role', ['contractor', 'admin']),
        supabase.from('hub_daily_hours').select('user_id, hours_capped, overtime_hours, date').gte('date', cutoffStart).lte('date', cutoffEnd),
        supabase.from('hub_projects').select('contract_price, status, hub_project_costs(amount)'),
        supabase.from('hub_clients').select('contract_value, contract_currency, status'),
        getSetting('usd_rate', '56'),
      ]);

      if (!slackResult.error && slackResult.data?.attendance) {
        setAttendance(slackResult.data.attendance);
      }

      let hrs = 0;
      for (const h of (hoursResult.data as any[]) || []) hrs += h.hours_capped;

      // --- payroll total: same computation as payroll page ---
      const eligibleContractors = ((contractorsResult.data as any[]) || []).filter((c: any) =>
        !c.start_date || c.start_date <= cutoffEnd
      );
      const hoursMap: Record<string, { capped: number; overtime: number }> = {};
      const hoursByDate: Record<string, Record<string, number>> = {};
      const overtimeByDate: Record<string, Record<string, number>> = {};
      for (const h of (hoursResult.data as any[]) || []) {
        if (!hoursMap[h.user_id]) hoursMap[h.user_id] = { capped: 0, overtime: 0 };
        hoursMap[h.user_id].capped += h.hours_capped;
        hoursMap[h.user_id].overtime += h.overtime_hours || 0;
        if (!hoursByDate[h.user_id]) hoursByDate[h.user_id] = {};
        hoursByDate[h.user_id][h.date] = (hoursByDate[h.user_id][h.date] || 0) + h.hours_capped;
        if (h.overtime_hours) {
          if (!overtimeByDate[h.user_id]) overtimeByDate[h.user_id] = {};
          overtimeByDate[h.user_id][h.date] = (overtimeByDate[h.user_id][h.date] || 0) + h.overtime_hours;
        }
      }
      const ids = eligibleContractors.map((c: any) => c.id);
      const [{ data: rateHistoryAll }, { data: payoutsData }] = await Promise.all([
        ids.length > 0
          ? supabase.from('hub_rate_history').select('contractor_id, effective_date, hourly_rate, monthly_rate').in('contractor_id', ids).lte('effective_date', cutoffEnd).order('effective_date', { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
        ids.length > 0
          ? supabase.from('hub_payouts').select('contractor_id, adjustments').in('contractor_id', ids).eq('cutoff_start', cutoffStart)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const rateHistoryMap: Record<string, any[]> = {};
      for (const r of rateHistoryAll || []) {
        if (!rateHistoryMap[r.contractor_id]) rateHistoryMap[r.contractor_id] = [];
        rateHistoryMap[r.contractor_id].push(r);
      }
      const adjMap: Record<string, number> = {};
      for (const p of payoutsData || []) {
        const adjs: any[] = p.adjustments || [];
        adjMap[p.contractor_id] = adjs.reduce((s: number, a: any) => s + (a.amount || 0), 0);
      }
      const usdRate = 56;
      let payrollTotal = 0;
      for (const c of eligibleContractors) {
        const h = hoursMap[c.id] || { capped: 0, overtime: 0 };
        const payType = c.payment_type || 'hourly';
        const history = rateHistoryMap[c.id] || [];
        const changeInPeriod = history.find((r: any) => r.effective_date >= cutoffStart && r.effective_date <= cutoffEnd);
        const rateAtStart = [...history].filter((r: any) => r.effective_date < cutoffStart).pop() || null;
        let pay = 0;
        if (changeInPeriod) {
          const beforeChange = [...history].filter((r: any) => r.effective_date < changeInPeriod.effective_date).pop();
          const oldMonthly = beforeChange ? (beforeChange.monthly_rate || 0) : (c.monthly_rate || 0);
          const oldHourly  = beforeChange ? (beforeChange.hourly_rate  || 0) : (c.hourly_rate  || 0);
          const newMonthly = changeInPeriod.monthly_rate || 0;
          const newHourly  = changeInPeriod.hourly_rate  || 0;
          const pStart = new Date(cutoffStart + 'T00:00:00');
          const pEnd   = new Date(cutoffEnd   + 'T00:00:00');
          const chDate = new Date(changeInPeriod.effective_date + 'T00:00:00');
          const totalD   = Math.round((pEnd.getTime() - pStart.getTime()) / 86400000) + 1;
          const daysAtOld = Math.max(0, Math.round((chDate.getTime() - pStart.getTime()) / 86400000));
          const daysAtNew = totalD - daysAtOld;
          if (payType === 'fixed') {
            const basePay = (oldMonthly / 2 / totalD * daysAtOld) + (newMonthly / 2 / totalD * daysAtNew);
            const oldOT = (beforeChange?.hourly_rate) || oldMonthly / 176;
            const newOT = changeInPeriod.hourly_rate || newMonthly / 176;
            const otDates = overtimeByDate[c.id] || {};
            let otAtOld = 0, otAtNew = 0;
            for (const [date, ot] of Object.entries(otDates)) {
              if (date < changeInPeriod.effective_date) otAtOld += ot as number;
              else otAtNew += ot as number;
            }
            pay = basePay + otAtOld * oldOT + otAtNew * newOT;
          } else {
            const datesMap = hoursByDate[c.id] || {};
            let hrsAtOld = 0, hrsAtNew = 0;
            for (const [date, hv] of Object.entries(datesMap)) {
              if (date < changeInPeriod.effective_date) hrsAtOld += hv as number;
              else hrsAtNew += hv as number;
            }
            pay = hrsAtOld * oldHourly + hrsAtNew * newHourly + h.overtime * newHourly;
          }
        } else {
          const monthly = rateAtStart?.monthly_rate ?? c.monthly_rate ?? 0;
          const hourly  = rateAtStart?.hourly_rate  ?? c.hourly_rate  ?? 0;
          const otRate  = payType === 'fixed' ? (hourly || monthly / 176) : hourly;
          if (payType === 'fixed') {
            pay = monthly / 2 + h.overtime * otRate;
          } else {
            pay = h.capped * hourly + h.overtime * hourly;
          }
        }
        const inPHP = c.currency === 'USD' ? pay * usdRate : pay;
        payrollTotal += inPHP + (adjMap[c.id] || 0);
      }
      setTotalPayroll(payrollTotal);
      setTotalHours(parseFloat(hrs.toFixed(1)));
      setBirthdays(getBirthdayAlerts(contractorsResult.data || []));

      // Net profit across all projects
      let netProfitTotal = 0;
      let activeCount = 0;
      for (const p of (projectsResult.data as any[]) || []) {
        const costs = ((p.hub_project_costs as any[]) || []).reduce((s: number, c: any) => s + c.amount, 0);
        netProfitTotal += p.contract_price - costs;
        if (p.status === 'ongoing') activeCount++;
      }
      setTotalNetProfit(netProfitTotal);
      setActiveProjectCount(activeCount);

      // Monthly retainer total (owner-only display, but we fetch regardless)
      const usdRate = parseFloat(usdRateStr);
      const retainerTotal = ((clientsResult.data as any[]) || [])
        .filter((c: any) => c.status === 'active' && c.contract_value)
        .reduce((s: number, c: any) => s + (c.contract_currency === 'USD' ? c.contract_value * usdRate : c.contract_value), 0);
      setMonthlyRetainerTotal(retainerTotal);

      setAnnouncements((annResult.data as HubAnnouncement[]) ?? []);
      setPendingRequests((reqResult.data as HubRequest[]) ?? []);
      setPendingTimeOff((toResult.data as HubTimeOff[]) ?? []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const counts = {
    on: attendance.filter(r => r.status === 'on').length,
    off: attendance.filter(r => r.status === 'off').length,
    absent: attendance.filter(r => r.status === 'absent').length,
  };

  const annColors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700', payroll: 'bg-amber-100 text-amber-700',
    meeting: 'bg-sky-100 text-sky-700', holiday: 'bg-green-100 text-green-700',
    policy: 'bg-violet-100 text-violet-700', general: 'bg-gray-100 text-gray-600',
  };

  const toColors: Record<string, string> = {
    vacation: 'bg-sky-100 text-sky-700', sick: 'bg-red-100 text-red-700',
    emergency: 'bg-orange-100 text-orange-700', unpaid: 'bg-gray-100 text-gray-700',
    other: 'bg-purple-100 text-purple-700',
  };

  const now = useClock();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const phTime = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
  const isNight = hour >= 20 || hour < 5;
  const isMorning = hour >= 5 && hour < 12;
  const isEvening = hour >= 17 && hour < 20;

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i>
        </div>
      </AdminLayout>
    );
  }

  const onlineList = attendance.filter(r => r.status === 'on');
  const offList = attendance.filter(r => r.status === 'off');
  const absentList = attendance.filter(r => r.status === 'absent');

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-4 max-w-5xl">

        {/* Header banner */}
        <div className="bg-[#111827] rounded-2xl p-5 text-white relative overflow-hidden">
          <style>{`
            @keyframes sun-pulse{0%,100%{box-shadow:0 0 24px 10px rgba(255,185,50,0.35)}50%{box-shadow:0 0 42px 20px rgba(255,185,50,0.6)}}
            @keyframes eve-pulse{0%,100%{box-shadow:0 0 24px 10px rgba(255,100,30,0.4)}50%{box-shadow:0 0 42px 20px rgba(255,100,30,0.65)}}
            @keyframes moon-pulse{0%,100%{box-shadow:0 0 18px 7px rgba(180,215,255,0.2)}50%{box-shadow:0 0 32px 14px rgba(180,215,255,0.42)}}
            @keyframes twinkle-a{0%,100%{opacity:.15}50%{opacity:.9}}
            @keyframes twinkle-b{0%,100%{opacity:.6}50%{opacity:.1}}
            @keyframes twinkle-c{0%,100%{opacity:.35}50%{opacity:.85}}
          `}</style>

          {/* Sky + celestial */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0" style={{
              background: isNight
                ? 'radial-gradient(ellipse at 78% 18%, rgba(25,35,75,0.9) 0%, transparent 65%)'
                : isEvening
                ? 'radial-gradient(ellipse at 82% 28%, rgba(200,70,20,0.28) 0%, transparent 60%)'
                : isMorning
                ? 'radial-gradient(ellipse at 85% 20%, rgba(255,165,30,0.22) 0%, transparent 58%)'
                : 'radial-gradient(ellipse at 85% 12%, rgba(255,210,50,0.18) 0%, transparent 56%)'
            }} />
            {isNight ? (
              <>
                <div style={{
                  position:'absolute', right:'5%', top:'12%',
                  width:30, height:30, borderRadius:'50%',
                  background:'radial-gradient(circle at 38% 38%, #EEF4FF 0%, #C0D4F0 55%, #90B0D8 100%)',
                  animation:'moon-pulse 4s ease-in-out infinite', overflow:'hidden'
                }}>
                  <div style={{ position:'absolute', right:-5, top:-5, width:28, height:28, borderRadius:'50%', background:'#111827' }} />
                </div>
                {([
                  [8,30,2,'twinkle-a',1.6,0],[14,48,1.5,'twinkle-b',2.3,0.3],[6,62,1,'twinkle-c',1.9,0.6],
                  [18,40,1.5,'twinkle-a',2.6,0.9],[11,22,1,'twinkle-b',1.3,1.2],[22,55,2,'twinkle-c',2.1,0.4],
                  [4,45,1,'twinkle-a',1.7,0.8],[16,28,1.5,'twinkle-b',2.4,1.5],[20,68,1,'twinkle-c',1.5,0.2],
                ] as [number,number,number,string,number,number][]).map(([t,r,s,anim,dur,delay],i) => (
                  <div key={i} style={{
                    position:'absolute', top:`${t}%`, right:`${r}%`,
                    width:s, height:s, borderRadius:'50%', background:'white',
                    animation:`${anim} ${dur}s ease-in-out infinite`,
                    animationDelay:`${delay}s`
                  }} />
                ))}
              </>
            ) : (
              <div style={{
                position:'absolute', right:'5%',
                top: isMorning ? '20%' : isEvening ? '35%' : '10%',
                width:38, height:38, borderRadius:'50%',
                background: isEvening
                  ? 'radial-gradient(circle, #FFBC70 0%, #FF6B35 55%, #C0392B 100%)'
                  : isMorning
                  ? 'radial-gradient(circle, #FFE566 0%, #FFBB30 55%, #FF9500 100%)'
                  : 'radial-gradient(circle, #FFF176 0%, #FFD740 55%, #FFA000 100%)',
                animation: isEvening ? 'eve-pulse 3s ease-in-out infinite' : 'sun-pulse 3s ease-in-out infinite',
                transition:'top 2s ease'
              }} />
            )}
          </div>

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-white/50 text-xs mb-1 flex items-center gap-1.5">
                {dateStr}
                <span className="text-white/30">·</span>
                <i className="ri-time-line text-white/40 text-xs"></i>
                <span className="font-mono text-white/60">{phTime}</span>
                <span className="text-white/30 text-[10px]">PH</span>
              </p>
              <h2 className="text-xl font-bold">{greeting}, team.</h2>
              <p className="text-white/60 text-sm mt-1">
                {counts.on > 0 ? `${counts.on} contractor${counts.on > 1 ? 's' : ''} online right now.` : 'No one online yet today.'}
              </p>
            </div>
            {/* Payroll period card */}
            <div className="bg-white/10 rounded-xl px-4 py-3 min-w-[200px]">
              <p className="text-white/50 text-xs mb-1">Current Pay Period</p>
              <p className="text-white font-semibold text-sm">
                {isFirstHalf ? `${today.toLocaleDateString('en-US', { month: 'short' })} 1–15` : `${today.toLocaleDateString('en-US', { month: 'short' })} 16–${new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()}`}
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-[#FF6B35] rounded-full transition-all" style={{ width: `${periodProgress}%` }} />
              </div>
              <p className="text-white/40 text-xs mt-1.5">
                {daysLeft === 0 ? `Payday: ${paydayLabel}` : `${daysLeft} day${daysLeft > 1 ? 's' : ''} until ${paydayLabel}`}
              </p>
            </div>
          </div>
        </div>

        {/* Birthday alerts */}
        {birthdays.length > 0 && (
          <div className={`rounded-xl border p-4 ${birthdays[0].isToday ? 'bg-pink-50 border-pink-200' : 'bg-amber-50 border-amber-100'}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{birthdays[0].isToday ? '🎂' : '🎁'}</span>
              <p className={`text-sm font-semibold ${birthdays[0].isToday ? 'text-pink-700' : 'text-amber-700'}`}>
                {birthdays[0].isToday ? "It's someone's birthday today!" : 'Upcoming birthdays'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {birthdays.map((b) => (
                <div key={b.full_name} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-white shadow-sm">
                  <Avatar name={b.full_name} url={b.avatar_url} size={7} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{b.full_name.split(' ')[0]}</p>
                    <p className={`text-xs font-medium ${b.isToday ? 'text-pink-600' : 'text-amber-600'}`}>
                      {b.isToday ? '🎉 Today!' : b.daysUntil === 1 ? 'Tomorrow' : `In ${b.daysUntil} days`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Online Now', value: counts.on, icon: 'ri-user-follow-line', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Logged Off', value: counts.off, icon: 'ri-user-unfollow-line', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-100' },
            { label: 'Not In Yet', value: counts.absent, icon: 'ri-time-line', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { label: 'Cutoff Hours', value: `${totalHours}h`, icon: 'ri-bar-chart-2-line', color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
          ].map((k) => (
            <div key={k.label} className={`bg-white rounded-xl border ${k.border} p-4`}>
              <div className={`w-8 h-8 ${k.bg} rounded-lg flex items-center justify-center mb-3`}>
                <i className={`${k.icon} ${k.color} text-sm`}></i>
              </div>
              <p className="text-2xl font-bold text-[#111827]">{k.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Team status — 3 cols */}
          <div className="md:col-span-3 bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#111827] text-sm">Team Status</h3>
              <button onClick={() => navigate('/hub/admin/attendance')} className="text-xs text-[#FF6B35] hover:underline cursor-pointer">Full view</button>
            </div>

            {/* Status groups */}
            {onlineList.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Online
                </p>
                <div className="space-y-2">
                  {onlineList.map(r => (
                    <div key={r.hub_user_id || r.full_name} className="flex items-center gap-2.5 p-2 rounded-lg bg-emerald-50/50">
                      <Avatar name={r.full_name} url={r.avatar_url} size={8} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.full_name}</p>
                        {r.department && <p className="text-xs text-gray-400">{r.department}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {r.hours_today > 0 && <p className="text-xs font-medium text-emerald-600">{r.hours_today.toFixed(1)}h today</p>}
                        <p className="text-xs text-gray-400">since {formatTime(r.last_punch)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {offList.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
                  Logged Off
                </p>
                <div className="space-y-2">
                  {offList.map(r => (
                    <div key={r.hub_user_id || r.full_name} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50">
                      <Avatar name={r.full_name} url={r.avatar_url} size={8} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{r.full_name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {r.hours_today > 0 && <p className="text-xs text-gray-500">{r.hours_today.toFixed(1)}h logged</p>}
                        <p className="text-xs text-gray-400">off at {formatTime(r.last_punch)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {absentList.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                  Not In Yet
                </p>
                <div className="flex flex-wrap gap-2">
                  {absentList.map(r => (
                    <div key={r.hub_user_id || r.full_name} className="flex items-center gap-1.5 bg-amber-50 rounded-lg px-2.5 py-1.5">
                      <Avatar name={r.full_name} url={r.avatar_url} size={5} />
                      <span className="text-xs text-amber-700">{r.full_name.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {attendance.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No attendance data yet</p>
            )}
          </div>

          {/* Right col — 2 cols */}
          <div className="md:col-span-2 space-y-4">
            {/* Payroll estimate */}
            <div className="bg-[#FF6B35] rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-3">
                <i className="ri-money-dollar-circle-line text-white/70 text-sm"></i>
                <p className="text-white/70 text-xs">Estimated Payroll</p>
              </div>
              <p className="text-2xl font-bold">₱{totalPayroll.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              <p className="text-white/60 text-xs mt-1">
                {isFirstHalf ? `${today.toLocaleDateString('en-US', { month: 'short' })} 1–15` : `${today.toLocaleDateString('en-US', { month: 'short' })} 16–${new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()}`} cutoff
              </p>
              <button
                onClick={() => navigate('/hub/admin/payroll')}
                className="mt-3 w-full bg-white/20 hover:bg-white/30 rounded-lg py-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                View Payroll
              </button>
            </div>

            {/* Project Net Profit — owner/admin only */}
            {isOwnerOrAdmin && (
              <div className="bg-emerald-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <i className="ri-folder-chart-line text-white/70 text-sm"></i>
                  <p className="text-white/70 text-xs">Projects Net Profit</p>
                </div>
                <p className="text-2xl font-bold">₱{totalNetProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                <p className="text-white/60 text-xs mt-1">across all projects · {activeProjectCount} active</p>
                <button
                  onClick={() => navigate('/hub/admin/projects')}
                  className="mt-3 w-full bg-white/20 hover:bg-white/30 rounded-lg py-1.5 text-xs font-medium transition-colors cursor-pointer"
                >
                  View Projects
                </button>
              </div>
            )}

            {/* Monthly Retainer Total — owner only */}
            {isOwner && (
              <div className="bg-indigo-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <i className="ri-calendar-check-line text-white/70 text-sm"></i>
                  <p className="text-white/70 text-xs">Monthly Retainers</p>
                </div>
                <p className="text-2xl font-bold">₱{monthlyRetainerTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                <p className="text-white/60 text-xs mt-1">active client contracts · converted to PHP</p>
                <button
                  onClick={() => navigate('/hub/admin/clients')}
                  className="mt-3 w-full bg-white/20 hover:bg-white/30 rounded-lg py-1.5 text-xs font-medium transition-colors cursor-pointer"
                >
                  View Clients
                </button>
              </div>
            )}

            {/* Pending requests */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[#111827] text-sm">
                  Requests
                  {pendingRequests.length > 0 && (
                    <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{pendingRequests.length}</span>
                  )}
                </h3>
                <button onClick={() => navigate('/hub/admin/requests')} className="text-xs text-[#FF6B35] hover:underline cursor-pointer">View all</button>
              </div>
              {pendingRequests.length === 0 ? (
                <div className="flex items-center gap-2 py-2">
                  <i className="ri-checkbox-circle-line text-emerald-400"></i>
                  <p className="text-sm text-gray-400">All clear</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingRequests.slice(0, 3).map((req) => (
                    <div key={req.id} className="flex items-center gap-2">
                      <Avatar name={(req.hub_users as HubUser)?.full_name || '?'} url={(req.hub_users as HubUser)?.avatar_url || null} size={7} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{req.title}</p>
                        <p className="text-xs text-gray-400 capitalize">{req.type.replace('_', ' ')}</p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${req.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                        {req.status === 'open' ? 'Open' : 'Review'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending time-off */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[#111827] text-sm">
                  Time-Off
                  {pendingTimeOff.length > 0 && (
                    <span className="ml-2 text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">{pendingTimeOff.length}</span>
                  )}
                </h3>
                <button onClick={() => navigate('/hub/admin/time-off')} className="text-xs text-[#FF6B35] hover:underline cursor-pointer">View all</button>
              </div>
              {pendingTimeOff.length === 0 ? (
                <div className="flex items-center gap-2 py-2">
                  <i className="ri-checkbox-circle-line text-emerald-400"></i>
                  <p className="text-sm text-gray-400">No pending</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingTimeOff.slice(0, 3).map((to) => (
                    <div key={to.id} className="flex items-center gap-2">
                      <Avatar name={(to.hub_users as HubUser)?.full_name || '?'} url={(to.hub_users as HubUser)?.avatar_url || null} size={7} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{(to.hub_users as HubUser)?.full_name}</p>
                        <p className="text-xs text-gray-400">{to.start_date}{to.start_date !== to.end_date ? ` → ${to.end_date}` : ''}</p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 capitalize font-medium ${toColors[to.type]}`}>{to.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Announcements + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#111827] text-sm">Announcements</h3>
              <button onClick={() => navigate('/hub/admin/announcements')} className="text-xs text-[#FF6B35] hover:underline cursor-pointer">Manage</button>
            </div>
            {announcements.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No announcements yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {announcements.map((ann) => (
                  <div key={ann.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium flex-shrink-0 mt-0.5 capitalize ${annColors[ann.type]}`}>{ann.type}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{ann.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{ann.body}</p>
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {new Date(ann.created_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h3 className="font-semibold text-[#111827] text-sm mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Add Contractor', icon: 'ri-user-add-line', path: '/hub/admin/contractors', color: 'text-[#FF6B35]', bg: 'bg-[#FF6B35]/5 hover:bg-[#FF6B35]/10' },
                { label: 'View Attendance', icon: 'ri-time-line', path: '/hub/admin/attendance', color: 'text-sky-600', bg: 'bg-sky-50 hover:bg-sky-100' },
                { label: 'Post Announcement', icon: 'ri-megaphone-line', path: '/hub/admin/announcements', color: 'text-violet-600', bg: 'bg-violet-50 hover:bg-violet-100' },
                { label: 'Run Payroll', icon: 'ri-money-dollar-circle-line', path: '/hub/admin/payroll', color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100' },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className={`flex items-center gap-3 p-3 ${a.bg} rounded-xl transition-colors cursor-pointer text-left`}
                >
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-100 flex-shrink-0">
                    <i className={`${a.icon} ${a.color} text-sm`}></i>
                  </div>
                  <span className="text-sm text-gray-700 font-medium leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

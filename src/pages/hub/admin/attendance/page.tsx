import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';

// ----- Types -----

interface AttendanceRecord {
  hub_user_id: string | null;
  email: string | null;
  full_name: string;
  avatar_url: string | null;
  department: string | null;
  status: 'on' | 'off' | 'absent';
  last_punch: string | null;
  overtime_today: number;
  punches: { status: 'on' | 'off'; time: string }[];
}

interface HistoricalRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  department: string | null;
  hours_raw: number | null;
  hours_capped: number | null;
  overtime_hours: number | null;
  first_on: string | null;
  last_off: string | null;
  worked: boolean;
  isDayOff?: boolean;
}

interface HubUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  department: string | null;
  start_date: string | null;
}

// ----- Helpers -----

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

// ----- PDF helpers -----

function getWeekRange(dateStr: string): [string, string] {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [toDateStr(monday), toDateStr(sunday)];
}

function getMonthRange(dateStr: string): [string, string] {
  const d = new Date(dateStr + 'T00:00:00');
  const y = d.getFullYear();
  const m = d.getMonth();
  const last = new Date(y, m + 1, 0);
  return [`${y}-${String(m + 1).padStart(2, '0')}-01`, toDateStr(last)];
}

function getYearRange(dateStr: string): [string, string] {
  const y = new Date(dateStr + 'T00:00:00').getFullYear();
  return [`${y}-01-01`, `${y}-12-31`];
}

function rangeLabelFmt(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const s = new Date(start + 'T00:00:00').toLocaleDateString('en-US', opts);
  const e = new Date(end + 'T00:00:00').toLocaleDateString('en-US', opts);
  return `${s} – ${e}`;
}

async function generateAttendancePDF(start: string, end: string, label: string) {
  const logoUrl = `${window.location.origin}/images/547b59870e776a20eb28e4f20931787c.png`;

  // Fetch hours data for range
  const { data: hoursData } = await supabase
    .from('hub_daily_hours')
    .select('user_id, date, hours_raw, hours_capped, overtime_hours, first_on, last_off')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true });

  // Fetch contractors
  const { data: contractors } = await supabase
    .from('hub_users')
    .select('id, full_name, department, start_date')
    .eq('status', 'active')
    .in('role', ['contractor', 'admin']);

  const userMap: Record<string, { full_name: string; department: string | null; start_date: string | null }> = {};
  for (const u of contractors || []) {
    userMap[u.id] = { full_name: u.full_name, department: u.department, start_date: u.start_date };
  }

  // Build rows: one per (date, contractor) — only show contractor if start_date <= date
  // Group hours by date+user
  type HoursEntry = { hours_raw: number; hours_capped: number; overtime_hours: number; first_on: string | null; last_off: string | null };
  const hoursIndex: Record<string, Record<string, HoursEntry>> = {}; // date -> userId -> entry
  for (const h of hoursData || []) {
    if (!hoursIndex[h.date]) hoursIndex[h.date] = {};
    hoursIndex[h.date][h.user_id] = {
      hours_raw: h.hours_raw,
      hours_capped: h.hours_capped,
      overtime_hours: h.overtime_hours || 0,
      first_on: h.first_on,
      last_off: h.last_off,
    };
  }

  // Enumerate dates in range
  const dates: string[] = [];
  const cur = new Date(start + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  while (cur <= endD) {
    dates.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }

  const sortedContractors = (contractors || []).slice().sort((a: HubUser, b: HubUser) =>
    a.full_name.localeCompare(b.full_name)
  );

  let tableRows = '';
  let totalWorked = 0;
  let totalAbsent = 0;
  let totalHours = 0;

  for (const date of dates) {
    const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const dayEntries = hoursIndex[date] || {};

    const eligibleOnDate = sortedContractors.filter((c: HubUser) =>
      !c.start_date || c.start_date <= date
    );

    if (eligibleOnDate.length === 0) continue;

    for (const c of eligibleOnDate) {
      const entry = dayEntries[c.id];
      const worked = !!entry;
      const status = worked ? 'Worked' : 'Absent';
      if (worked) { totalWorked++; totalHours += entry.hours_capped || 0; }
      else totalAbsent++;

      tableRows += `
        <tr class="${worked ? '' : 'absent-row'}">
          <td>${dateLabel}</td>
          <td>${c.full_name}</td>
          <td>${c.department || '—'}</td>
          <td>${worked ? formatTime(entry.first_on) : '—'}</td>
          <td>${worked ? formatTime(entry.last_off) : '—'}</td>
          <td>${worked ? (entry.hours_capped || 0).toFixed(2) + 'h' : '—'}</td>
          <td>${worked && entry.overtime_hours > 0 ? '+' + entry.overtime_hours.toFixed(2) + 'h' : '—'}</td>
          <td><span class="status-badge ${worked ? 'status-worked' : 'status-absent'}">${status}</span></td>
        </tr>`;
    }
  }

  const win = window.open('', '_blank', 'width=1000,height=800');
  if (!win) return;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Attendance Report — ${label}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background: #fff; padding: 40px; font-size: 12px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #FF6B35; padding-bottom: 20px; margin-bottom: 28px; }
    .header img { height: 48px; object-fit: contain; }
    .header-right { text-align: right; }
    .header-right h1 { font-size: 20px; font-weight: 700; color: #111827; }
    .header-right p { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .summary { display: flex; gap: 20px; margin-bottom: 24px; }
    .summary-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 16px; }
    .summary-item .slabel { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-item .svalue { font-size: 16px; font-weight: 700; color: #111827; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #111827; color: #fff; padding: 9px 10px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
    tr:nth-child(even) td { background: #fafafa; }
    .absent-row td { color: #9ca3af; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
    .status-worked { background: #d1fae5; color: #065f46; }
    .status-absent { background: #fef3c7; color: #92400e; }
    .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <img src="${logoUrl}" alt="Huna Creatives" onerror="this.style.display='none'" />
    <div class="header-right">
      <h1>Attendance Report</h1>
      <p>${label}: <strong>${rangeLabelFmt(start, end)}</strong></p>
      <p>Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
  </div>
  <div class="summary">
    <div class="summary-item">
      <div class="slabel">Days Worked (records)</div>
      <div class="svalue">${totalWorked}</div>
    </div>
    <div class="summary-item">
      <div class="slabel">Absent Records</div>
      <div class="svalue">${totalAbsent}</div>
    </div>
    <div class="summary-item">
      <div class="slabel">Total Hours</div>
      <div class="svalue" style="color:#FF6B35">${totalHours.toFixed(1)}h</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Contractor</th>
        <th>Dept</th>
        <th>Time In</th>
        <th>Time Out</th>
        <th>Hours</th>
        <th>OT</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${tableRows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#9ca3af;">No data for this range</td></tr>'}</tbody>
  </table>
  <div class="footer">Huna Creatives · Attendance Report · ${label}</div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };<\/script>
</body>
</html>`);
  win.document.close();
}

// ----- Main Component -----

export default function AdminAttendancePage() {
  const todayStr = toDateStr(new Date());

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const isToday = selectedDate === todayStr;

  // Live (today) state
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Historical state
  const [histRows, setHistRows] = useState<HistoricalRow[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  // Shared
  const [filter, setFilter] = useState<'all' | 'worked' | 'absent'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // ----- Live fetch -----
  const fetchLive = useCallback(async (showRefreshing = false) => {
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

  // ----- Historical fetch -----
  const fetchHistorical = useCallback(async (date: string) => {
    setHistLoading(true);

    const dayOfWeek = ['sun','mon','tue','wed','thu','fri','sat'][new Date(date + 'T00:00:00').getDay()];

    const { data: hoursData } = await supabase
      .from('hub_daily_hours')
      .select('user_id, hours_raw, hours_capped, overtime_hours, first_on, last_off')
      .eq('date', date);

    const { data: contractors } = await supabase
      .from('hub_users')
      .select('id, full_name, avatar_url, department, start_date, shift_start, shift_end, work_days')
      .eq('status', 'active')
      .in('role', ['contractor', 'admin']);

    const hoursMap: Record<string, typeof hoursData extends (infer T)[] | null ? T : never> = {};
    for (const h of hoursData || []) {
      hoursMap[(h as any).user_id] = h;
    }

    const eligible = (contractors || []).filter((c: any) =>
      !c.start_date || c.start_date <= date
    );

    const rows: HistoricalRow[] = eligible.map((c: any) => {
      const h = hoursMap[c.id] as any;
      const hasSchedule = c.work_days && c.work_days.length > 0;
      const isDayOff = hasSchedule && !c.work_days.includes(dayOfWeek);
      return {
        id: c.id,
        full_name: c.full_name,
        avatar_url: c.avatar_url,
        department: c.department,
        hours_raw: h?.hours_raw ?? null,
        hours_capped: h?.hours_capped ?? null,
        overtime_hours: h?.overtime_hours ?? null,
        first_on: h?.first_on ?? null,
        last_off: h?.last_off ?? null,
        worked: !!h,
        isDayOff: !h && isDayOff,
      };
    });

    rows.sort((a, b) => {
      if (a.worked && !b.worked) return -1;
      if (!a.worked && b.worked) return 1;
      return a.full_name.localeCompare(b.full_name);
    });

    setHistRows(rows);
    setHistLoading(false);
  }, []);

  // ----- Effects -----
  useEffect(() => {
    if (isToday) {
      fetchLive();
      const interval = setInterval(() => fetchLive(true), 60000);
      return () => clearInterval(interval);
    } else {
      fetchHistorical(selectedDate);
    }
  }, [selectedDate, isToday, fetchLive, fetchHistorical]);

  // Reset filter when switching modes
  useEffect(() => {
    setFilter('all');
    setExpanded(null);
  }, [selectedDate]);

  // ----- Derived data -----
  const liveCounts = {
    on: records.filter(r => r.status === 'on').length,
    off: records.filter(r => r.status === 'off').length,
    absent: records.filter(r => r.status === 'absent').length,
  };

  const histCounts = {
    worked: histRows.filter(r => r.worked).length,
    absent: histRows.filter(r => !r.worked && !r.isDayOff && !(r.first_on && !r.last_off)).length,
    totalHours: histRows.reduce((s, r) => s + (r.hours_capped || 0), 0),
  };

  const filteredLive = filter === 'all'
    ? records
    : filter === 'worked'
    ? records.filter(r => r.status === 'on' || r.status === 'off')
    : records.filter(r => r.status === 'absent');

  const filteredHist = filter === 'all'
    ? histRows
    : filter === 'worked'
    ? histRows.filter(r => r.worked)
    : histRows.filter(r => !r.worked && !r.isDayOff);

  const displayDateLabel = isToday
    ? new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <AdminLayout title="Attendance">
      <div className="space-y-5">

        {/* Header row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date picker */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={e => setSelectedDate(e.target.value || todayStr)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:border-[#FF6B35] cursor-pointer"
              />
              {!isToday && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="text-xs text-[#FF6B35] hover:underline cursor-pointer"
                >
                  Back to today
                </button>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">{displayDateLabel}</p>
              {isToday && lastRefresh && (
                <p className="text-xs text-gray-400">
                  Last updated {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                </p>
              )}
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* PDF download buttons */}
            {[
              { label: 'Week PDF', range: () => getWeekRange(selectedDate), rangeLabel: 'Week' },
              { label: 'Month PDF', range: () => getMonthRange(selectedDate), rangeLabel: 'Month' },
              { label: 'Year PDF', range: () => getYearRange(selectedDate), rangeLabel: 'Year' },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={() => { const [s, e] = btn.range(); generateAttendancePDF(s, e, btn.rangeLabel); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors cursor-pointer"
              >
                <i className="ri-file-pdf-line text-sm"></i>
                {btn.label}
              </button>
            ))}

            {/* Refresh (today only) */}
            {isToday && (
              <button
                onClick={() => fetchLive(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <i className={`ri-refresh-line text-sm ${refreshing ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Stat cards */}
        {isToday ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                <i className="ri-user-follow-line text-emerald-600 text-sm"></i>
              </div>
              <p className="text-2xl font-bold text-gray-900">{liveCounts.on}</p>
              <p className="text-xs text-gray-500 mt-0.5">Online</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                <i className="ri-user-unfollow-line text-gray-500 text-sm"></i>
              </div>
              <p className="text-2xl font-bold text-gray-900">{liveCounts.off}</p>
              <p className="text-xs text-gray-500 mt-0.5">Logged Off</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
                <i className="ri-time-line text-amber-600 text-sm"></i>
              </div>
              <p className="text-2xl font-bold text-gray-900">{liveCounts.absent}</p>
              <p className="text-xs text-gray-500 mt-0.5">Not In Yet</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                <i className="ri-user-follow-line text-emerald-600 text-sm"></i>
              </div>
              <p className="text-2xl font-bold text-gray-900">{histCounts.worked}</p>
              <p className="text-xs text-gray-500 mt-0.5">Worked</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
                <i className="ri-user-unfollow-line text-amber-600 text-sm"></i>
              </div>
              <p className="text-2xl font-bold text-gray-900">{histCounts.absent}</p>
              <p className="text-xs text-gray-500 mt-0.5">Absent</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-2">
                <i className="ri-time-line text-sky-600 text-sm"></i>
              </div>
              <p className="text-2xl font-bold text-gray-900">{histCounts.totalHours.toFixed(1)}h</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Hours</p>
            </div>
          </div>
        )}

        {/* Source note */}
        {isToday ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg">
            <i className="ri-slack-line text-gray-400 text-sm"></i>
            <p className="text-xs text-gray-500">Live from Slack — contractors type <span className="font-mono bg-white border border-gray-200 px-1 rounded">On</span> or <span className="font-mono bg-white border border-gray-200 px-1 rounded">Off</span> in the attendance channel. Auto-refreshes every minute.</p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg">
            <div className="flex items-center gap-2">
              <i className="ri-database-2-line text-gray-400 text-sm"></i>
              <p className="text-xs text-gray-500">Showing logged hours from <strong>hub_daily_hours</strong> for {displayDateLabel}. Contractors with no record are marked Absent.</p>
            </div>
            <button
              onClick={async () => {
                setSyncing(true);
                await supabase.functions.invoke('slack-attendance', { body: { date: selectedDate } });
                await fetchHistorical(selectedDate);
                setSyncing(false);
              }}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50"
            >
              <i className={`ri-slack-line text-sm ${syncing ? 'animate-pulse' : ''}`}></i>
              {syncing ? 'Syncing…' : 'Sync from Slack'}
            </button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2">
          {isToday ? (
            (['all', 'worked', 'absent'] as const).map(f => {
              const count = f === 'all' ? records.length : f === 'worked' ? liveCounts.on + liveCounts.off : liveCounts.absent;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    filter === f ? 'bg-[#111827] text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'worked' ? 'Online / Off' : 'Not In'}
                  <span className="ml-1.5 opacity-60">{count}</span>
                </button>
              );
            })
          ) : (
            (['all', 'worked', 'absent'] as const).map(f => {
              const count = f === 'all' ? histRows.length : f === 'worked' ? histCounts.worked : histCounts.absent;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    filter === f ? 'bg-[#111827] text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'worked' ? 'Worked' : 'Absent'}
                  <span className="ml-1.5 opacity-60">{count}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Records */}
        {(isToday ? loading : histLoading) ? (
          <div className="flex items-center justify-center py-16">
            <i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i>
          </div>
        ) : isToday ? (
          /* ---- LIVE VIEW ---- */
          filteredLive.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <i className="ri-calendar-check-line text-3xl mb-2 block"></i>
              <p className="text-sm">No records for this filter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLive.map((r) => {
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
                            r.status === 'on' ? 'bg-emerald-100 text-emerald-700' : r.status === 'off' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'
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
          )
        ) : (
          /* ---- HISTORICAL VIEW ---- */
          filteredHist.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <i className="ri-calendar-check-line text-3xl mb-2 block"></i>
              <p className="text-sm">No records for this filter</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Contractor', 'Time In', 'Time Out', 'Hours', 'OT', 'Status'].map(h => (
                        <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHist.map(r => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={r.full_name} avatar_url={r.avatar_url} />
                            <div>
                              <p className="font-medium text-gray-900">{r.full_name}</p>
                              {r.department && <p className="text-xs text-gray-400">{r.department}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{formatTime(r.first_on)}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{formatTime(r.last_off)}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {r.hours_capped != null ? `${r.hours_capped.toFixed(2)}h` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {r.overtime_hours && r.overtime_hours > 0 ? (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                              +{r.overtime_hours.toFixed(2)}h
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            r.worked ? 'bg-emerald-100 text-emerald-700' :
                            r.first_on && !r.last_off ? 'bg-sky-100 text-sky-700' :
                            r.isDayOff ? 'bg-gray-100 text-gray-400' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {r.worked ? 'Worked' : r.first_on && !r.last_off ? 'In Progress' : r.isDayOff ? 'Day Off' : 'Absent'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </AdminLayout>
  );
}

import { useState, useEffect } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';

interface Contractor {
  id: string;
  full_name: string;
  avatar_url: string | null;
  department: string | null;
  currency: string;
  payment_type: 'hourly' | 'fixed';
  hourly_rate: number | null;
  monthly_rate: number | null;
  start_date: string | null;
}

interface PayRow {
  contractor: Contractor;
  hours: number;
  cappedHours: number;
  overtimeHours: number;
  overtimePay: number;
  derivedHourlyRate: number;
  pay: number;
  days: number;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getPeriods() {
  const periods: { label: string; start: string; end: string }[] = [];
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

  let year = 2026;
  let month = 0;
  let firstHalf = true;

  while (true) {
    const start = firstHalf
      ? `${year}-${pad(month + 1)}-01`
      : `${year}-${pad(month + 1)}-16`;
    if (new Date(start) > now) break;

    const endDay = firstHalf ? 15 : lastDay(year, month);
    const end = `${year}-${pad(month + 1)}-${pad(endDay)}`;
    const label = firstHalf
      ? `${MONTHS[month]} 1–15, ${year}`
      : `${MONTHS[month]} 16–${endDay}, ${year}`;

    periods.push({ label, start, end });

    if (firstHalf) {
      firstHalf = false;
    } else {
      firstHalf = true;
      month += 1;
      if (month > 11) { month = 0; year += 1; }
    }
  }
  return periods;
}

function fmt(val: number, currency = 'PHP') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(val);
}

function Avatar({ name, avatar_url }: { name: string; avatar_url: string | null }) {
  if (avatar_url) return <img src={avatar_url} alt={name} className="w-8 h-8 rounded-full object-cover object-top flex-shrink-0" />;
  return (
    <div className="w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
      <span className="text-white text-xs font-bold">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AdminPayrollPage() {
  const periods = getPeriods();
  const lastPeriod = periods[periods.length - 1];

  // Derive unique years and months from available periods
  const years = [...new Set(periods.map(p => p.start.slice(0, 4)))];
  const [selectedYear, setSelectedYear] = useState(lastPeriod.start.slice(0, 4));

  const monthsInYear = [...new Set(
    periods.filter(p => p.start.startsWith(selectedYear))
      .map(p => p.start.slice(0, 7))
  )];
  const [selectedMonth, setSelectedMonth] = useState(lastPeriod.start.slice(0, 7));

  const periodsInMonth = periods.filter(p => p.start.startsWith(selectedMonth));
  const [selectedPeriod, setSelectedPeriod] = useState(lastPeriod);

  const [rows, setRows] = useState<PayRow[]>([]);
  const [loading, setLoading] = useState(true);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    const firstMonth = periods.find(p => p.start.startsWith(year))?.start.slice(0, 7) || '';
    setSelectedMonth(firstMonth);
    const firstPeriod = periods.find(p => p.start.startsWith(firstMonth));
    if (firstPeriod) setSelectedPeriod(firstPeriod);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    const firstPeriod = periods.find(p => p.start.startsWith(month));
    if (firstPeriod) setSelectedPeriod(firstPeriod);
  };

  useEffect(() => {
    fetchPayroll();
  }, [selectedPeriod]);

  const fetchPayroll = async () => {
    setLoading(true);

    // Get all active contractors with pay info + start_date
    const { data: contractors } = await supabase
      .from('hub_users')
      .select('id, full_name, avatar_url, department, currency, payment_type, hourly_rate, monthly_rate, start_date')
      .eq('status', 'active')
      .in('role', ['contractor', 'admin']);

    // Filter out contractors who hadn't started yet during this period
    const eligibleContractors = (contractors || []).filter((c: any) =>
      !c.start_date || c.start_date <= selectedPeriod.end
    );

    // Get hours for this period
    const { data: hoursData } = await supabase
      .from('hub_daily_hours')
      .select('user_id, hours_capped, hours_raw, overtime_hours, date')
      .gte('date', selectedPeriod.start)
      .lte('date', selectedPeriod.end);

    // Aggregate hours per user
    const hoursMap: Record<string, { capped: number; raw: number; overtime: number; days: number }> = {};
    for (const h of hoursData || []) {
      if (!hoursMap[h.user_id]) hoursMap[h.user_id] = { capped: 0, raw: 0, overtime: 0, days: 0 };
      hoursMap[h.user_id].capped += h.hours_capped;
      hoursMap[h.user_id].raw += h.hours_raw;
      hoursMap[h.user_id].overtime += h.overtime_hours || 0;
      hoursMap[h.user_id].days += 1;
    }

    const result: PayRow[] = eligibleContractors.map((c: any) => {
      const hrs = hoursMap[c.id] || { capped: 0, raw: 0, overtime: 0, days: 0 };
      const payType = c.payment_type || 'hourly';
      let pay = 0;

      let overtimePay = 0;
      // For fixed: derive hourly from monthly / 176 (22 working days × 8hrs)
      const derivedHourlyRate = payType === 'fixed'
        ? (c.monthly_rate || 0) / 176
        : (c.hourly_rate || 0);

      if (payType === 'hourly') {
        overtimePay = hrs.overtime * derivedHourlyRate;
        pay = hrs.capped * derivedHourlyRate + overtimePay;
      } else {
        overtimePay = hrs.overtime * derivedHourlyRate;
        pay = (c.monthly_rate || 0) / 2 + overtimePay;
      }

      return {
        contractor: c as Contractor,
        hours: parseFloat(hrs.raw.toFixed(2)),
        cappedHours: parseFloat(hrs.capped.toFixed(2)),
        overtimeHours: parseFloat(hrs.overtime.toFixed(2)),
        overtimePay: parseFloat(overtimePay.toFixed(2)),
        derivedHourlyRate: parseFloat(derivedHourlyRate.toFixed(2)),
        pay,
        days: hrs.days,
      };
    });

    // Sort: highest pay first
    result.sort((a, b) => b.pay - a.pay);
    setRows(result);
    setLoading(false);
  };

  const totalPay = rows.reduce((s, r) => s + r.pay, 0);
  const totalHours = rows.reduce((s, r) => s + r.cappedHours, 0);
  const hourlyCount = rows.filter(r => r.contractor.payment_type === 'hourly').length;
  const fixedCount = rows.filter(r => r.contractor.payment_type === 'fixed').length;

  const downloadPDF = () => {
    const logoUrl = `${window.location.origin}/images/547b59870e776a20eb28e4f20931787c.png`;
    const win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) return;

    const tableRows = rows.map(r => {
      const c = r.contractor;
      const isFixed = c.payment_type === 'fixed';
      const rate = isFixed
        ? `${fmt(c.monthly_rate || 0, 'PHP')}/mo`
        : `${fmt(c.hourly_rate || 0, 'PHP')}/hr`;
      const otCell = r.overtimeHours > 0
        ? `+${r.overtimeHours}h (${fmt(r.overtimePay, 'PHP')})`
        : '—';
      return `
        <tr>
          <td>${c.full_name}</td>
          <td>${c.department || '—'}</td>
          <td>${isFixed ? 'Fixed' : 'Hourly'}</td>
          <td>${rate}</td>
          <td>${r.days}</td>
          <td>${r.hours.toFixed(2)}h</td>
          <td>${r.cappedHours.toFixed(2)}h</td>
          <td>${otCell}</td>
          <td><strong>${fmt(r.pay, 'PHP')}</strong></td>
        </tr>`;
    }).join('');

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payroll — ${selectedPeriod.label}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background: #fff; padding: 40px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #FF6B35; padding-bottom: 20px; margin-bottom: 28px; }
    .header img { height: 48px; object-fit: contain; }
    .header-right { text-align: right; }
    .header-right h1 { font-size: 22px; font-weight: 700; color: #111827; }
    .header-right p { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .summary { display: flex; gap: 24px; margin-bottom: 24px; }
    .summary-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 18px; }
    .summary-item .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-item .value { font-size: 18px; font-weight: 700; color: #111827; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #111827; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
    tr:nth-child(even) td { background: #fafafa; }
    tfoot td { background: #f3f4f6 !important; font-weight: 700; border-top: 2px solid #e5e7eb; }
    .accent { color: #FF6B35; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <img src="${logoUrl}" alt="Huna Creatives" onerror="this.style.display='none'" />
    <div class="header-right">
      <h1>Payroll Report</h1>
      <p>Period: <strong>${selectedPeriod.label}</strong></p>
      <p>Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
  </div>
  <div class="summary">
    <div class="summary-item">
      <div class="label">Total Payroll</div>
      <div class="value accent">${fmt(totalPay, 'PHP')}</div>
    </div>
    <div class="summary-item">
      <div class="label">Total Hours</div>
      <div class="value">${totalHours.toFixed(1)}h</div>
    </div>
    <div class="summary-item">
      <div class="label">Contractors</div>
      <div class="value">${rows.length}</div>
    </div>
    <div class="summary-item">
      <div class="label">Hourly / Fixed</div>
      <div class="value">${hourlyCount} / ${fixedCount}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Contractor</th>
        <th>Department</th>
        <th>Type</th>
        <th>Rate</th>
        <th>Days</th>
        <th>Raw Hours</th>
        <th>Billed Hours</th>
        <th>Overtime</th>
        <th>Pay</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="6">Total</td>
        <td>${totalHours.toFixed(2)}h</td>
        <td></td>
        <td>${fmt(totalPay, 'PHP')}</td>
      </tr>
    </tfoot>
  </table>
  <div class="footer">Huna Creatives · Payroll · ${selectedPeriod.label}</div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };<\/script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <AdminLayout title="Payroll">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Period selector + Download PDF */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Year */}
          <select
            value={selectedYear}
            onChange={e => handleYearChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] cursor-pointer"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* Month */}
          <select
            value={selectedMonth}
            onChange={e => handleMonthChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] cursor-pointer"
          >
            {monthsInYear.map(m => (
              <option key={m} value={m}>{FULL_MONTHS[parseInt(m.slice(5, 7)) - 1]}</option>
            ))}
          </select>
          {/* Period half */}
          <div className="flex gap-1.5">
            {periodsInMonth.map((p) => (
              <button
                key={p.start}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap border ${
                  selectedPeriod.start === p.start
                    ? 'bg-[#111827] text-white border-[#111827]'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <button
              onClick={downloadPDF}
              disabled={loading || rows.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FF6B35] text-white hover:bg-orange-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="ri-file-pdf-line text-sm"></i>
              Download PDF
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Payroll', value: fmt(totalPay, 'PHP'), icon: 'ri-money-dollar-circle-line', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Hours', value: `${totalHours.toFixed(1)}h`, icon: 'ri-time-line', color: 'text-sky-600', bg: 'bg-sky-50' },
            { label: 'Hourly Contractors', value: String(hourlyCount), icon: 'ri-user-line', color: 'text-[#FF6B35]', bg: 'bg-orange-50' },
            { label: 'Fixed Rate', value: String(fixedCount), icon: 'ri-calendar-check-line', color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.bg}`}>
                  <i className={`${c.icon} text-sm ${c.color}`}></i>
                </div>
                <span className="text-xs text-gray-500">{c.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-lg">
          <i className="ri-information-line text-amber-500 text-sm flex-shrink-0 mt-0.5"></i>
          <p className="text-xs text-amber-700">
            Hours are pulled from Slack attendance. Daily cap is 8 hours — raw hours beyond 8 are not counted.
            Fixed-rate contractors are paid <strong>monthly rate ÷ 2</strong> regardless of hours worked.
          </p>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Contractor', 'Type', 'Rate', 'Days Worked', 'Raw Hours', 'Billed Hours', 'Overtime', 'Pay'].map(h => (
                      <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                        No contractor data found
                      </td>
                    </tr>
                  ) : rows.map((r) => {
                    const c = r.contractor;
                    const isFixed = c.payment_type === 'fixed';
                    const rate = isFixed
                      ? `${fmt(c.monthly_rate || 0, 'PHP')}/mo · ${fmt(r.derivedHourlyRate, 'PHP')}/hr OT`
                      : `${fmt(c.hourly_rate || 0, 'PHP')}/hr`;
                    const hoursExceeded = r.hours > r.cappedHours;

                    return (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={c.full_name} avatar_url={c.avatar_url} />
                            <div>
                              <p className="font-medium text-gray-900">{c.full_name}</p>
                              {c.department && <p className="text-xs text-gray-400">{c.department}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isFixed ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'
                          }`}>
                            {isFixed ? 'Fixed' : 'Hourly'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{rate}</td>
                        <td className="px-4 py-3 text-gray-600">{r.days}</td>
                        <td className="px-4 py-3">
                          <span className={hoursExceeded ? 'text-amber-600 font-medium' : 'text-gray-600'}>
                            {r.hours.toFixed(2)}h
                            {hoursExceeded && (
                              <span className="ml-1 text-xs text-amber-500" title="Hours capped at 8/day">⚠</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">{r.cappedHours.toFixed(2)}h</td>
                        <td className="px-4 py-3">
                          {r.overtimeHours > 0 ? (
                            <div className="space-y-0.5">
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">+{r.overtimeHours}h OT</span>
                              <p className="text-xs text-purple-500 pl-1">{fmt(r.overtimePay, 'PHP')}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {fmt(r.pay, 'PHP')}
                          {isFixed && r.days === 0 && (
                            <p className="text-xs text-gray-400 font-normal">No attendance logged</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-700">Total</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{totalHours.toFixed(2)}h</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 font-bold text-gray-900">{fmt(totalPay, 'PHP')}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

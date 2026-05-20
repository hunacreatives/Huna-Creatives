import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { HubUser, HubAttendance, HubTimeOff, HubRequest, HubClient, HubAsset } from '@/lib/types';
import EditContractorModal from './EditContractorModal';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getPeriods() {
  const periods: { label: string; start: string; end: string }[] = [];
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  let year = 2026; let month = 0; let firstHalf = true;
  while (true) {
    const start = firstHalf ? `${year}-${pad(month+1)}-01` : `${year}-${pad(month+1)}-16`;
    if (new Date(start) > now) break;
    const endDay = firstHalf ? 15 : lastDay(year, month);
    const end = `${year}-${pad(month+1)}-${pad(endDay)}`;
    const label = firstHalf ? `${MONTHS[month]} 1–15, ${year}` : `${MONTHS[month]} 16–${endDay}, ${year}`;
    periods.push({ label, start, end });
    if (firstHalf) { firstHalf = false; } else { firstHalf = true; month += 1; if (month > 11) { month = 0; year += 1; } }
  }
  return periods;
}

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

interface DayRow {
  date: string;
  hours_raw: number;
  hours_capped: number;
  overtime_hours: number;
  first_on: string | null;
  last_off: string | null;
}

export default function ContractorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contractor, setContractor] = useState<HubUser | null>(null);
  const [attendance, setAttendance] = useState<HubAttendance[]>([]);
  const [timeOff, setTimeOff] = useState<HubTimeOff[]>([]);
  const [requests, setRequests] = useState<HubRequest[]>([]);
  const [clients, setClients] = useState<HubClient[]>([]);
  const [assets, setAssets] = useState<HubAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'requests' | 'assets' | 'payslip'>('overview');

  // Payslip tab state
  const allPeriods = getPeriods();
  const [selectedPeriod, setSelectedPeriod] = useState(allPeriods[allPeriods.length - 1]);
  const [payslipDays, setPayslipDays] = useState<DayRow[]>([]);
  const [payslipPayout, setPayslipPayout] = useState<any>(null);
  const [payslipLoading, setPayslipLoading] = useState(false);

  const fetch = async () => {
    if (!id) return;
    const [u, att, to, req, cl, ast] = await Promise.all([
      supabase.from('hub_users').select('*').eq('id', id).maybeSingle(),
      supabase.from('hub_attendance').select('*').eq('contractor_id', id).order('date', { ascending: false }).limit(10),
      supabase.from('hub_time_off').select('*').eq('contractor_id', id).order('created_at', { ascending: false }),
      supabase.from('hub_requests').select('*').eq('contractor_id', id).order('created_at', { ascending: false }),
      supabase.from('hub_clients').select('*').eq('contractor_id', id),
      supabase.from('hub_assets').select('*').eq('contractor_id', id),
    ]);
    setContractor(u.data as HubUser ?? null);
    setAttendance((att.data as HubAttendance[]) ?? []);
    setTimeOff((to.data as HubTimeOff[]) ?? []);
    setRequests((req.data as HubRequest[]) ?? []);
    setClients((cl.data as HubClient[]) ?? []);
    setAssets((ast.data as HubAsset[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [id]);

  useEffect(() => {
    if (activeTab === 'payslip' && id) fetchPayslip();
  }, [activeTab, selectedPeriod, id]);

  const fetchPayslip = async () => {
    setPayslipLoading(true);
    const [daysRes, payoutRes] = await Promise.all([
      supabase.from('hub_daily_hours')
        .select('date, hours_raw, hours_capped, overtime_hours, first_on, last_off')
        .eq('user_id', id!)
        .gte('date', selectedPeriod.start)
        .lte('date', selectedPeriod.end)
        .order('date', { ascending: true }),
      supabase.from('hub_payouts')
        .select('id, status, final_payout, payment_date')
        .eq('contractor_id', id!)
        .eq('cutoff_start', selectedPeriod.start)
        .maybeSingle(),
    ]);
    setPayslipDays((daysRes.data as DayRow[]) ?? []);
    setPayslipPayout(payoutRes.data ?? null);
    setPayslipLoading(false);
  };

  const statusColors = {
    complete: 'bg-emerald-100 text-emerald-700',
    missing_on: 'bg-red-100 text-red-700',
    missing_off: 'bg-amber-100 text-amber-700',
    manual: 'bg-violet-100 text-violet-700',
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: 'ri-user-line' },
    { key: 'attendance', label: 'Attendance', icon: 'ri-time-line' },
    { key: 'requests', label: 'Requests', icon: 'ri-inbox-line' },
    { key: 'assets', label: 'Assets', icon: 'ri-key-2-line' },
    { key: 'payslip', label: 'Payslip', icon: 'ri-file-text-line' },
  ];

  if (loading) {
    return (
      <AdminLayout title="Contractor Detail">
        <div className="flex items-center justify-center h-48">
          <i className="ri-loader-4-line animate-spin text-2xl text-gray-400"></i>
        </div>
      </AdminLayout>
    );
  }

  if (!contractor) {
    return (
      <AdminLayout title="Not Found">
        <p className="text-gray-500">Contractor not found.</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={contractor.full_name}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/hub/admin/contractors')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-arrow-left-line text-sm"></i>
            Back
          </button>
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 bg-[#FF6B35] text-white text-sm px-3 py-2 rounded-lg hover:bg-[#e55a27] transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-edit-line text-sm"></i>
            Edit
          </button>
        </div>
      }
    >
      <div className="max-w-4xl space-y-5">
        {/* Profile header */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col sm:flex-row gap-5 items-start">
          <img
            src={contractor.avatar_url || ''}
            alt={contractor.full_name}
            className="w-20 h-20 rounded-xl object-cover object-top flex-shrink-0"
          />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-start gap-2">
              <h2 className="text-lg font-bold text-[#111827]">{contractor.full_name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                contractor.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>{contractor.status === 'active' ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><i className="ri-mail-line text-xs"></i>{contractor.email}</span>
              {contractor.phone && <span className="flex items-center gap-1"><i className="ri-phone-line text-xs"></i>{contractor.phone}</span>}
              {contractor.slack_username && <span className="flex items-center gap-1"><i className="ri-slack-line text-xs"></i>{contractor.slack_username}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {contractor.department && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{contractor.department}</span>
              )}
              {contractor.hourly_rate && (
                <span className="text-xs bg-[#FF6B35]/10 text-[#FF6B35] px-2 py-0.5 rounded-full font-medium">
                  ₱{contractor.hourly_rate}/hr {contractor.currency}
                </span>
              )}
              {contractor.payment_method && (
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{contractor.payment_method}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as typeof activeTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === t.key ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className={`${t.icon} text-xs`}></i>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#111827]">Personal Info</h3>
              {[
                { label: 'Phone', value: contractor.phone, icon: 'ri-phone-line' },
                { label: 'Birthday', value: contractor.birthday, icon: 'ri-cake-line' },
                { label: 'Start Date', value: contractor.start_date ? new Date(contractor.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined, icon: 'ri-calendar-line' },
                { label: 'Address', value: contractor.address, icon: 'ri-map-pin-line' },
              ].map((f) => f.value ? (
                <div key={f.label} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className={`${f.icon} text-gray-400 text-xs`}></i>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{f.label}</p>
                    <p className="text-sm text-gray-700 mt-0.5">{f.value}</p>
                  </div>
                </div>
              ) : null)}
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#111827]">Emergency Contact</h3>
              {contractor.emergency_contact_name ? (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-rose-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="ri-user-heart-line text-rose-400 text-xs"></i>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Name</p>
                      <p className="text-sm text-gray-700 mt-0.5">{contractor.emergency_contact_name}</p>
                    </div>
                  </div>
                  {contractor.emergency_contact_relationship && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="ri-group-line text-gray-400 text-xs"></i>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Relationship</p>
                        <p className="text-sm text-gray-700 mt-0.5">{contractor.emergency_contact_relationship}</p>
                      </div>
                    </div>
                  )}
                  {contractor.emergency_contact_phone && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="ri-phone-line text-gray-400 text-xs"></i>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Phone</p>
                        <p className="text-sm text-gray-700 mt-0.5">{contractor.emergency_contact_phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No emergency contact on file</p>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#111827]">Pay Info</h3>
              {[
                { label: 'Payment Type', value: contractor.payment_type ? (contractor.payment_type === 'fixed' ? 'Fixed Monthly' : 'Hourly') : undefined, icon: 'ri-bank-card-line' },
                { label: 'Rate', value: contractor.payment_type === 'fixed' ? (contractor.monthly_rate ? `₱${contractor.monthly_rate.toLocaleString()}/mo` : undefined) : (contractor.hourly_rate ? `₱${contractor.hourly_rate}/hr ${contractor.currency || ''}` : undefined), icon: 'ri-money-dollar-circle-line' },
                { label: 'Bank', value: contractor.bank_name, icon: 'ri-building-line' },
                { label: 'Account Name', value: contractor.bank_account_name, icon: 'ri-user-line' },
                { label: 'Account Number', value: contractor.bank_account_number, icon: 'ri-hashtag' },
              ].map((f) => f.value ? (
                <div key={f.label} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className={`${f.icon} text-gray-400 text-xs`}></i>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{f.label}</p>
                    <p className="text-sm text-gray-700 mt-0.5 font-mono">{f.value}</p>
                  </div>
                </div>
              ) : null)}
            </div>

            {contractor.notes && (
              <div className="sm:col-span-2 bg-amber-50 border border-amber-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-amber-800 mb-1.5">Admin Notes</h3>
                <p className="text-sm text-amber-700">{contractor.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">On</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Off</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Hours</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attendance.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-sm text-gray-400 py-8">No attendance records</td></tr>
                  ) : attendance.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 text-sm text-gray-700">{new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.on_time || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.off_time || '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{a.total_hours ? `${a.total_hours}h` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap capitalize ${statusColors[a.status]}`}>
                          {a.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
                <p className="text-sm text-gray-400">No requests from this contractor</p>
              </div>
            ) : requests.map((r) => (
              <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#111827]">{r.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.type} · {new Date(r.created_at!).toLocaleDateString()}</p>
                    {r.description && <p className="text-sm text-gray-500 mt-2">{r.description}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${
                    r.status === 'open' ? 'bg-amber-100 text-amber-700' :
                    r.status === 'in_review' ? 'bg-sky-100 text-sky-700' :
                    r.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{r.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'payslip' && (() => {
          const paymentType = (contractor as any)?.payment_type || 'hourly';
          const hourlyRate = Number((contractor as any)?.hourly_rate || 0);
          const monthlyRate = Number((contractor as any)?.monthly_rate || 0);
          const currency = (contractor as any)?.currency || 'PHP';
          const isUSD = currency === 'USD';
          const fmt = (val: number) => isUSD
            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
            : new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

          const startDate = (contractor as any)?.start_date ?? null;
          const periods = startDate ? allPeriods.filter(p => p.end >= startDate) : allPeriods;

          const totalDaysWorked = payslipDays.length;
          const totalHoursRaw = payslipDays.reduce((s, d) => s + d.hours_raw, 0);
          const totalHoursBillable = payslipDays.reduce((s, d) => s + d.hours_capped, 0);
          const totalOvertime = payslipDays.reduce((s, d) => s + (d.overtime_hours || 0), 0);
          const basePay = paymentType === 'fixed' ? monthlyRate / 2 : totalHoursBillable * hourlyRate;
          const otRate = paymentType === 'fixed' ? monthlyRate / 176 : hourlyRate;
          const overtimePay = totalOvertime * otRate;
          const totalPay = basePay + overtimePay;

          return (
            <div className="max-w-2xl space-y-5">
              {/* Period selector */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Pay Period</p>
                  <p className="text-xs text-gray-400 mt-0.5">{selectedPeriod.start} — {selectedPeriod.end}</p>
                </div>
                <select
                  value={selectedPeriod.start}
                  onChange={(e) => setSelectedPeriod(periods.find(p => p.start === e.target.value)!)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white cursor-pointer"
                >
                  {periods.map((p) => (
                    <option key={p.start} value={p.start}>{p.label}</option>
                  ))}
                </select>
              </div>

              {payslipLoading ? (
                <div className="flex items-center justify-center py-20">
                  <i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="bg-[#111827] px-6 py-5 flex items-start justify-between">
                      <div>
                        <p className="text-white font-bold text-base">Huna Creatives</p>
                        <p className="text-white/40 text-xs mt-0.5">Contractor Payment Summary</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#FF6B35] font-bold text-sm tracking-widest">PAYSLIP</p>
                        <p className="text-white/40 text-xs mt-1">{selectedPeriod.label}</p>
                      </div>
                    </div>

                    <div className="px-6 py-4 border-b border-gray-50 grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Contractor</p>
                        <p className="text-sm font-semibold text-gray-900">{contractor?.full_name}</p>
                        {(contractor as any)?.department && <p className="text-xs text-gray-400">{(contractor as any).department}</p>}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Pay Period</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedPeriod.label}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Rate</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {paymentType === 'fixed' ? `₱${monthlyRate.toLocaleString()}/mo` : `${isUSD ? '$' : '₱'}${hourlyRate}/hr`}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{paymentType}</p>
                      </div>
                    </div>

                    <div className="px-6 py-4 border-b border-gray-50 grid grid-cols-4 gap-3 text-center">
                      {[
                        { label: 'Days Worked', value: totalDaysWorked, color: 'text-gray-900' },
                        { label: 'Hours Logged', value: `${totalHoursRaw.toFixed(1)}h`, color: 'text-gray-900' },
                        { label: 'Billable Hours', value: `${totalHoursBillable.toFixed(1)}h`, color: 'text-sky-700' },
                        { label: 'Overtime', value: totalOvertime > 0 ? `+${totalOvertime}h` : '—', color: totalOvertime > 0 ? 'text-purple-700' : 'text-gray-400' },
                      ].map(s => (
                        <div key={s.label} className="bg-gray-50 rounded-xl py-3">
                          <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {payslipDays.length > 0 ? (
                      <div className="px-6 py-4 border-b border-gray-50">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Attendance Log</p>
                        <div className="space-y-1.5">
                          {payslipDays.map((d) => (
                            <div key={d.date} className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-50 last:border-0">
                              <span className="text-gray-500 w-32 flex-shrink-0">{fmtDate(d.date)}</span>
                              <span className="text-gray-400 text-xs w-20 flex-shrink-0 text-center">{fmtTime(d.first_on)}</span>
                              <i className="ri-arrow-right-line text-gray-300 text-xs flex-shrink-0"></i>
                              <span className="text-gray-400 text-xs w-20 flex-shrink-0 text-center">{fmtTime(d.last_off)}</span>
                              <span className="flex-1 text-right">
                                <span className="font-medium text-gray-800">{d.hours_capped.toFixed(2)}h</span>
                                {d.hours_raw > d.hours_capped && (
                                  <span className="text-xs text-amber-500 ml-1.5">(raw {d.hours_raw.toFixed(2)}h)</span>
                                )}
                              </span>
                              {d.overtime_hours > 0 && (
                                <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium flex-shrink-0">+{d.overtime_hours}h OT</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="px-6 py-8 text-center border-b border-gray-50">
                        <i className="ri-calendar-line text-2xl text-gray-200 block mb-2"></i>
                        <p className="text-sm text-gray-400">No attendance logged for this period</p>
                      </div>
                    )}

                    <div className="px-6 py-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Earnings</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {paymentType === 'fixed'
                              ? `Fixed rate (${fmt(monthlyRate)}/mo ÷ 2)`
                              : `Base pay (${totalHoursBillable.toFixed(2)}h × ${isUSD ? '$' : '₱'}${hourlyRate})`}
                          </span>
                          <span className="text-sm font-medium text-gray-800">{fmt(basePay)}</span>
                        </div>
                        {overtimePay > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-purple-600">Overtime ({totalOvertime}h × {isUSD ? '$' : '₱'}{otRate.toFixed(2)}/hr)</span>
                            <span className="text-sm font-medium text-purple-700">+{fmt(overtimePay)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
                          <span className="font-semibold text-gray-900">Total Payout</span>
                          <span className="text-xl font-bold text-[#FF6B35]">{fmt(totalPay)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {payslipPayout && (
                    <div className={`rounded-xl px-4 py-3.5 flex items-center gap-3 ${
                      payslipPayout.status === 'paid' ? 'bg-emerald-50 border border-emerald-100' :
                      payslipPayout.status === 'approved' ? 'bg-sky-50 border border-sky-100' :
                      'bg-amber-50 border border-amber-100'
                    }`}>
                      <i className={`text-lg ${
                        payslipPayout.status === 'paid' ? 'ri-checkbox-circle-fill text-emerald-500' :
                        payslipPayout.status === 'approved' ? 'ri-shield-check-fill text-sky-500' :
                        'ri-time-fill text-amber-500'
                      }`}></i>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${
                          payslipPayout.status === 'paid' ? 'text-emerald-800' :
                          payslipPayout.status === 'approved' ? 'text-sky-800' : 'text-amber-800'
                        }`}>
                          {payslipPayout.status === 'paid' ? 'Payment sent' :
                           payslipPayout.status === 'approved' ? 'Approved — payment incoming' :
                           payslipPayout.status === 'reviewed' ? 'Under review' : 'Submitted — awaiting approval'}
                        </p>
                        {payslipPayout.status === 'paid' && payslipPayout.payment_date && (
                          <p className="text-xs text-emerald-600 mt-0.5">Paid on {new Date(payslipPayout.payment_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-gray-800">{fmt(payslipPayout.final_payout)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {activeTab === 'assets' && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Platform</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Account</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Access</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {assets.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-sm text-gray-400 py-8">No asset access records</td></tr>
                  ) : assets.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 capitalize">{a.platform.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.account_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{a.access_level}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                          a.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>{a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showEdit && contractor && (
        <EditContractorModal
          contractor={contractor}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); fetch(); }}
        />
      )}
    </AdminLayout>
  );
}
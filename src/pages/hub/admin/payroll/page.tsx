import { useState, useEffect } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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

interface RateEntry {
  effective_date: string;
  payment_type: string;
  hourly_rate: number | null;
  monthly_rate: number | null;
}

interface PayRow {
  contractor: Contractor;
  hours: number;
  cappedHours: number;
  overtimeHours: number;
  overtimePay: number;
  derivedHourlyRate: number;
  pay: number;
  payOriginalCurrency?: number;
  days: number;
  prorated: boolean;
  proratedNote?: string;
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
  const { hubUser } = useAuth();
  const isOwner = (hubUser as any)?.role === 'owner';

  const periods = getPeriods();
  const lastPeriod = periods[periods.length - 1];

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
  const [usdRate, setUsdRate] = useState<number>(56); // fallback rate

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(r => r.json())
      .then(d => { if (d?.rates?.PHP) setUsdRate(d.rates.PHP); })
      .catch(() => {}); // silently keep fallback
  }, []);

  // Payout workflow state
  const [payoutsMap, setPayoutsMap] = useState<Record<string, any>>({});
  const [batch, setBatch] = useState<any>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  // Row edit overrides (before approval)
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState('');
  const [editPay, setEditPay] = useState('');
  const [rowOverrides, setRowOverrides] = useState<Record<string, { hours?: number; pay?: number }>>({});
  const [editAdjItems, setEditAdjItems] = useState<{ label: string; amount: number; type: string }[]>([]);
  const [editAdjLabel, setEditAdjLabel] = useState('');
  const [editAdjAmount, setEditAdjAmount] = useState('');
  const [editAdjType, setEditAdjType] = useState('bonus');
  const [editAdjSign, setEditAdjSign] = useState<'+' | '-'>('+');
  const [editSaving, setEditSaving] = useState(false);

  const ADJ_TYPES = [
    { value: 'bonus', label: 'Bonus' },
    { value: 'referral', label: 'Referral Fee' },
    { value: 'reimbursement', label: 'Reimbursement' },
    { value: 'allowance', label: 'Allowance' },
    { value: 'deduction', label: 'Deduction' },
    { value: 'other', label: 'Other' },
  ];

  const openEditRow = (r: PayRow) => {
    const override = rowOverrides[r.contractor.id];
    const p = payoutsMap[r.contractor.id];
    setEditHours(String(override?.hours ?? r.cappedHours));
    setEditPay(String(override?.pay !== undefined ? override.pay : parseFloat(r.pay.toFixed(2))));
    setEditAdjItems((p?.adjustments || []).map((a: any) => ({ ...a, type: a.type || 'other' })));
    setEditAdjLabel('');
    setEditAdjAmount('');
    setEditAdjType('bonus');
    setEditAdjSign('+');
    setEditRowId(r.contractor.id);
  };

  const addEditAdjItem = () => {
    const amt = parseFloat(editAdjAmount);
    if (!editAdjLabel.trim() || isNaN(amt)) return;
    const signedAmt = editAdjSign === '-' ? -Math.abs(amt) : Math.abs(amt);
    setEditAdjItems(prev => [...prev, { label: editAdjLabel.trim(), amount: signedAmt, type: editAdjType }]);
    setEditAdjLabel('');
    setEditAdjAmount('');
    setEditAdjSign('+');
  };

  const saveEditRow = async (contractorId: string) => {
    setEditSaving(true);

    // Auto-flush any unsaved adj item in the input fields
    let finalAdjItems = [...editAdjItems];
    const pendingAmt = parseFloat(editAdjAmount);
    if (editAdjLabel.trim() && !isNaN(pendingAmt)) {
      const signedAmt = editAdjSign === '-' ? -Math.abs(pendingAmt) : Math.abs(pendingAmt);
      finalAdjItems = [...finalAdjItems, {
        label: editAdjLabel.trim(),
        amount: signedAmt,
        type: editAdjType,
      }];
    }

    const h = parseFloat(editHours);
    const p = parseFloat(editPay);
    setRowOverrides(prev => ({
      ...prev,
      [contractorId]: {
        hours: isNaN(h) ? undefined : h,
        pay: isNaN(p) ? undefined : p,
      },
    }));

    const row = rows.find(r => r.contractor.id === contractorId);
    const basePay = isNaN(p) ? (row?.pay ?? 0) : p;
    const adjTotal = finalAdjItems.reduce((s, i) => s + i.amount, 0);
    const finalPay = basePay + adjTotal;
    const existing = payoutsMap[contractorId];

    if (existing) {
      await supabase.from('hub_payouts')
        .update({ adjustments: finalAdjItems, final_payout: finalPay })
        .eq('id', existing.id);
    } else {
      await supabase.from('hub_payouts').insert({
        contractor_id: contractorId,
        cutoff_start: selectedPeriod.start,
        cutoff_end: selectedPeriod.end,
        final_payout: finalPay,
        status: 'pending',
        locked: false,
        adjustments: finalAdjItems,
      });
    }

    await fetchWorkflow();
    setEditSaving(false);
    setEditRowId(null);
  };

  // Keep adjContractorId etc for backward compat but no longer used
  const [adjContractorId] = useState<string | null>(null);
  const [adjSaving] = useState(false);

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

  const fetchWorkflow = async () => {
    const [payoutsRes, batchRes] = await Promise.all([
      supabase
        .from('hub_payouts')
        .select('id, contractor_id, status, final_payout, payment_date, batch_id, adjustments')
        .eq('cutoff_start', selectedPeriod.start),
      supabase
        .from('hub_payroll_batches')
        .select('*')
        .eq('period_start', selectedPeriod.start)
        .maybeSingle(),
    ]);
    const map: Record<string, any> = {};
    for (const p of payoutsRes.data || []) map[p.contractor_id] = p;
    setPayoutsMap(map);
    setBatch(batchRes.data ?? null);
  };

  const approvePayout = async (contractorId: string, computedPay: number) => {
    setWorkflowLoading(true);
    const finalPay = rowOverrides[contractorId]?.pay ?? computedPay;
    const existing = payoutsMap[contractorId];
    if (existing) {
      await supabase.from('hub_payouts').update({ status: 'hr_approved', approved_at: new Date().toISOString(), final_payout: finalPay }).eq('id', existing.id);
    } else {
      await supabase.from('hub_payouts').insert({
        contractor_id: contractorId,
        cutoff_start: selectedPeriod.start,
        cutoff_end: selectedPeriod.end,
        final_payout: finalPay,
        status: 'hr_approved',
        approved_at: new Date().toISOString(),
      });
    }
    await fetchWorkflow();
    setWorkflowLoading(false);
  };

  const requestFundTransfer = async () => {
    setWorkflowLoading(true);
    const approved = rows.filter(r => {
      const p = payoutsMap[r.contractor.id];
      return p?.status === 'hr_approved';
    });
    const total = approved.reduce((s, r) => {
      const p = payoutsMap[r.contractor.id];
      return s + (p?.final_payout ?? r.pay);
    }, 0);
    const { data: newBatch } = await supabase.from('hub_payroll_batches').insert({
      period_start: selectedPeriod.start,
      period_end: selectedPeriod.end,
      period_label: selectedPeriod.label,
      total_amount: total,
      contractor_count: approved.length,
      status: 'pending_owner',
      requested_by: hubUser?.id,
    }).select('id').single();

    if (newBatch) {
      const approvedIds = approved.map(r => payoutsMap[r.contractor.id]?.id).filter(Boolean);
      await supabase.from('hub_payouts').update({ batch_id: newBatch.id }).in('id', approvedIds);
    }
    await fetchWorkflow();
    setWorkflowLoading(false);
  };

  const approveBatch = async () => {
    if (!batch) return;
    setWorkflowLoading(true);
    await supabase.from('hub_payroll_batches').update({
      status: 'owner_approved',
      approved_by: hubUser?.id,
      approved_at: new Date().toISOString(),
    }).eq('id', batch.id);
    await fetchWorkflow();
    setWorkflowLoading(false);
  };


  const cancelPayout = async (contractorId: string) => {
    const p = payoutsMap[contractorId];
    if (!p) return;
    setWorkflowLoading(true);
    if (p.status === 'paid') {
      await supabase.from('hub_payouts').update({
        status: 'hr_approved',
        payment_date: null,
        paid_at: null,
      }).eq('id', p.id);
    } else {
      await supabase.from('hub_payouts').delete().eq('id', p.id);
    }
    // Clean up batch if no more active payouts remain in it
    if (batch) {
      const { count } = await supabase
        .from('hub_payouts')
        .select('id', { count: 'exact', head: true })
        .eq('batch_id', batch.id)
        .neq('id', p.id);
      if ((count ?? 0) === 0) {
        await supabase.from('hub_payroll_batches').delete().eq('id', batch.id);
      }
    }
    setConfirmCancelId(null);
    await fetchWorkflow();
    setWorkflowLoading(false);
  };

  const markPaid = async (contractorId: string) => {
    const existing = payoutsMap[contractorId];
    if (!existing) return;
    setWorkflowLoading(true);
    await supabase.from('hub_payouts').update({
      status: 'paid',
      payment_date: new Date().toISOString().slice(0, 10),
      paid_at: new Date().toISOString(),
    }).eq('id', existing.id);
    // Fire payslip email (non-blocking — ignore failures)
    supabase.functions.invoke('send-payslip', { body: { payout_id: existing.id } }).catch(() => {});
    await fetchWorkflow();
    setWorkflowLoading(false);
  };

  useEffect(() => {
    fetchPayroll();
    fetchWorkflow();
  }, [selectedPeriod, usdRate]);

  const fetchPayroll = async () => {
    setLoading(true);

    const [contractorsRes, hoursRes] = await Promise.all([
      supabase
        .from('hub_users')
        .select('id, full_name, avatar_url, department, currency, payment_type, hourly_rate, monthly_rate, start_date')
        .eq('status', 'active')
        .in('role', ['contractor', 'admin']),
      supabase
        .from('hub_daily_hours')
        .select('user_id, hours_capped, hours_raw, overtime_hours, date')
        .gte('date', selectedPeriod.start)
        .lte('date', selectedPeriod.end),
    ]);

    const eligibleContractors = (contractorsRes.data || []).filter((c: any) =>
      !c.start_date || c.start_date <= selectedPeriod.end
    );

    // Per-user per-date hours map (for hourly proration)
    const hoursByDate: Record<string, Record<string, number>> = {};
    const hoursMap: Record<string, { capped: number; raw: number; overtime: number; days: number }> = {};
    for (const h of hoursRes.data || []) {
      if (!hoursMap[h.user_id]) hoursMap[h.user_id] = { capped: 0, raw: 0, overtime: 0, days: 0 };
      hoursMap[h.user_id].capped += h.hours_capped;
      hoursMap[h.user_id].raw += h.hours_raw;
      hoursMap[h.user_id].overtime += h.overtime_hours || 0;
      hoursMap[h.user_id].days += 1;
      if (!hoursByDate[h.user_id]) hoursByDate[h.user_id] = {};
      hoursByDate[h.user_id][h.date] = (hoursByDate[h.user_id][h.date] || 0) + h.hours_capped;
    }

    // Fetch all rate history for eligible contractors up to period end
    const ids = eligibleContractors.map((c: any) => c.id);
    const { data: rateHistoryAll } = ids.length > 0
      ? await supabase
          .from('hub_rate_history')
          .select('contractor_id, effective_date, payment_type, hourly_rate, monthly_rate')
          .in('contractor_id', ids)
          .lte('effective_date', selectedPeriod.end)
          .order('effective_date', { ascending: true })
      : { data: [] };

    // Group rate history by contractor
    const rateHistoryMap: Record<string, RateEntry[]> = {};
    for (const r of rateHistoryAll || []) {
      if (!rateHistoryMap[r.contractor_id]) rateHistoryMap[r.contractor_id] = [];
      rateHistoryMap[r.contractor_id].push(r);
    }

    const result: PayRow[] = eligibleContractors.map((c: any) => {
      const hrs = hoursMap[c.id] || { capped: 0, raw: 0, overtime: 0, days: 0 };
      const payType = c.payment_type || 'hourly';
      const history = rateHistoryMap[c.id] || [];

      // Rate change that occurred DURING this period (first one only)
      const changeInPeriod = history.find(r =>
        r.effective_date >= selectedPeriod.start && r.effective_date <= selectedPeriod.end
      );

      // Rate in effect at the START of the period = most recent entry before period start
      const rateAtStart = [...history]
        .filter(r => r.effective_date < selectedPeriod.start)
        .pop() || null;

      let pay = 0;
      let overtimePay = 0;
      let derivedHourlyRate = 0;
      let prorated = false;
      let proratedNote = '';

      if (changeInPeriod) {
        prorated = true;
        // Old rate = rateAtStart if it exists, else the contractor's current rate
        // (current rate in hub_users = new rate after the change was saved)
        // We need the rate BEFORE changeInPeriod — look at entry just before it
        const beforeChange = [...history]
          .filter(r => r.effective_date < changeInPeriod.effective_date)
          .pop();

        const oldMonthly = beforeChange ? (beforeChange.monthly_rate || 0) : (c.monthly_rate || 0);
        const oldHourly  = beforeChange ? (beforeChange.hourly_rate  || 0) : (c.hourly_rate  || 0);
        const newMonthly = changeInPeriod.monthly_rate || 0;
        const newHourly  = changeInPeriod.hourly_rate  || 0;

        const periodStart = new Date(selectedPeriod.start);
        const periodEnd   = new Date(selectedPeriod.end);
        const changeDate  = new Date(changeInPeriod.effective_date);

        if (payType === 'fixed') {
          const totalDays = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000) + 1;
          const daysAtOld = Math.max(0, Math.round((changeDate.getTime() - periodStart.getTime()) / 86400000));
          const daysAtNew = totalDays - daysAtOld;

          const basePay = (oldMonthly / 2 / totalDays * daysAtOld) + (newMonthly / 2 / totalDays * daysAtNew);
          const newHourlyForOT = changeInPeriod.hourly_rate || 0;
          derivedHourlyRate = newHourlyForOT || newMonthly / 176;
          overtimePay = hrs.overtime * derivedHourlyRate;
          pay = basePay + overtimePay;
          proratedNote = `${daysAtOld}d @ ₱${oldMonthly.toLocaleString()}/mo · ${daysAtNew}d @ ₱${newMonthly.toLocaleString()}/mo`;
        } else {
          // Hourly: split hours by date
          const datesMap = hoursByDate[c.id] || {};
          let hrsAtOld = 0;
          let hrsAtNew = 0;
          for (const [date, h] of Object.entries(datesMap)) {
            if (date < changeInPeriod.effective_date) hrsAtOld += h;
            else hrsAtNew += h;
          }
          derivedHourlyRate = newHourly;
          overtimePay = hrs.overtime * newHourly;
          pay = hrsAtOld * oldHourly + hrsAtNew * newHourly + overtimePay;
          proratedNote = `${hrsAtOld.toFixed(1)}h @ ₱${oldHourly}/hr · ${hrsAtNew.toFixed(1)}h @ ₱${newHourly}/hr`;
        }
      } else {
        // No change in period — use rate in effect at period start (or current hub_users rate)
        const effectiveRate = rateAtStart || null;
        const monthly = effectiveRate?.monthly_rate ?? c.monthly_rate ?? 0;
        const hourly  = effectiveRate?.hourly_rate  ?? c.hourly_rate  ?? 0;

        // For fixed: use explicit hourly_rate as OT rate if set, else derive from monthly
        derivedHourlyRate = payType === 'fixed' ? (hourly || monthly / 176) : hourly;

        if (payType === 'hourly') {
          overtimePay = hrs.overtime * derivedHourlyRate;
          pay = hrs.capped * derivedHourlyRate + overtimePay;
        } else {
          overtimePay = hrs.overtime * derivedHourlyRate;
          pay = monthly / 2 + overtimePay;
        }
      }

      const isUSD = c.currency === 'USD';
      const payInPHP = isUSD ? pay * usdRate : pay;

      return {
        contractor: c as Contractor,
        hours: parseFloat(hrs.raw.toFixed(2)),
        cappedHours: parseFloat(hrs.capped.toFixed(2)),
        overtimeHours: parseFloat(hrs.overtime.toFixed(2)),
        overtimePay: parseFloat((isUSD ? overtimePay * usdRate : overtimePay).toFixed(2)),
        derivedHourlyRate: parseFloat(derivedHourlyRate.toFixed(2)),
        pay: payInPHP,
        payOriginalCurrency: isUSD ? parseFloat(pay.toFixed(2)) : undefined,
        days: hrs.days,
        prorated,
        proratedNote,
      };
    });

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

        {/* USD rate indicator — only if any contractor is USD */}
        {rows.some(r => r.contractor.currency === 'USD') && (
          <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-100 rounded-lg">
            <i className="ri-exchange-dollar-line text-sky-500 text-sm flex-shrink-0"></i>
            <p className="text-xs text-sky-700">
              Live rate: <strong>1 USD = ₱{usdRate.toFixed(2)}</strong> — USD contractor pay is converted to PHP at this rate.
            </p>
          </div>
        )}

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
                    {['Contractor', 'Type', 'Rate', 'Days Worked', 'Raw Hours', 'Billed Hours', 'Overtime', 'Pay', 'Status', ''].map(h => (
                      <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-gray-400 text-sm">
                        No contractor data found
                      </td>
                    </tr>
                  ) : rows.map((r) => {
                    const c = r.contractor;
                    const isFixed = c.payment_type === 'fixed';
                    const isUSD = c.currency === 'USD';
                    const rate = isFixed
                      ? `${fmt(c.monthly_rate || 0, 'PHP')}/mo · ${fmt(r.derivedHourlyRate, 'PHP')}/hr OT`
                      : isUSD
                        ? `$${c.hourly_rate}/hr USD`
                        : `${fmt(c.hourly_rate || 0, 'PHP')}/hr`;
                    const hoursExceeded = r.hours > r.cappedHours;
                    const override = rowOverrides[c.id];
                    const displayPay = override?.pay !== undefined ? override.pay : r.pay;
                    const displayHours = override?.hours !== undefined ? override.hours : r.cappedHours;

                    return (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={c.full_name} avatar_url={c.avatar_url} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-gray-900">{c.full_name}</p>
                                {override && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">edited</span>
                                )}
                              </div>
                              {c.department && <p className="text-xs text-gray-400">{c.department}</p>}
                            </div>
                            <button
                              onClick={() => openEditRow(r)}
                              title="Edit row"
                              className="text-gray-300 hover:text-[#FF6B35] cursor-pointer transition-colors flex-shrink-0"
                            >
                              <i className="ri-edit-line text-sm"></i>
                            </button>
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
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {displayHours.toFixed(2)}h
                          {override?.hours !== undefined && (
                            <span className="ml-1 text-[10px] text-gray-400 line-through">{r.cappedHours.toFixed(2)}h</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.overtimeHours > 0 ? (
                            <div className="space-y-0.5">
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">+{r.overtimeHours}h OT</span>
                              <p className="text-xs text-purple-500 pl-1">
                                {isUSD
                                  ? `$${(r.overtimeHours * (c.hourly_rate || 0)).toFixed(2)} → ${fmt(r.overtimePay, 'PHP')}`
                                  : fmt(r.overtimePay, 'PHP')}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {(() => {
                            const p = payoutsMap[c.id];
                            const adjs: { label: string; amount: number }[] = p?.adjustments || [];
                            const adjTotal = adjs.reduce((s: number, i: { label: string; amount: number }) => s + i.amount, 0);
                            const total = displayPay + adjTotal;
                            return (
                              <>
                                <div className="flex items-center gap-1.5">
                                  {adjTotal !== 0 ? (
                                    <span className="text-gray-900">{fmt(total, 'PHP')}</span>
                                  ) : (
                                    <span>
                                      {fmt(displayPay, 'PHP')}
                                      {override?.pay !== undefined && (
                                        <span className="ml-1 text-[10px] text-gray-400 line-through">{fmt(r.pay, 'PHP')}</span>
                                      )}
                                    </span>
                                  )}
                                  {r.prorated && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium whitespace-nowrap" title={r.proratedNote}>
                                      prorated
                                    </span>
                                  )}
                                </div>
                                {isUSD && r.payOriginalCurrency !== undefined && (
                                  <p className="text-[10px] text-sky-500 font-normal mt-0.5">
                                    ${r.payOriginalCurrency.toFixed(2)} USD × {usdRate.toFixed(2)}
                                  </p>
                                )}
                                {adjTotal !== 0 && (
                                  <p className="text-[10px] text-gray-400 font-normal mt-0.5">
                                    Base {fmt(displayPay, 'PHP')} + adj {adjTotal > 0 ? '+' : ''}{fmt(adjTotal, 'PHP')}
                                  </p>
                                )}
                                {r.prorated && r.proratedNote && (
                                  <p className="text-[10px] text-sky-500 font-normal mt-0.5">{r.proratedNote}</p>
                                )}
                                {isFixed && r.days === 0 && !r.prorated && (
                                  <p className="text-xs text-gray-400 font-normal">No attendance logged</p>
                                )}
                                {adjs.length > 0 && (
                                  <div className="mt-1 space-y-0.5">
                                    {adjs.map((a, i) => (
                                      <p key={i} className="text-[10px] text-emerald-600 font-normal">
                                        {a.label}: {a.amount > 0 ? '+' : ''}{fmt(a.amount, 'PHP')}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3">
                          {(() => {
                            const p = payoutsMap[c.id];
                            if (!p || p.status === 'pending') return <span className="text-xs text-gray-400">Pending</span>;
                            const cfg = {
                              submitted:   { label: 'Submitted',  cls: 'bg-amber-100 text-amber-700' },
                              hr_approved: { label: 'HR Approved', cls: 'bg-sky-100 text-sky-700' },
                              paid:        { label: 'Paid',        cls: 'bg-emerald-100 text-emerald-700' },
                            }[p.status as string] || { label: p.status, cls: 'bg-gray-100 text-gray-500' };
                            return <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>;
                          })()}
                        </td>
                        {/* Action */}
                        <td className="px-4 py-3">
                          {confirmCancelId === c.id ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs text-gray-500 whitespace-nowrap">Undo?</span>
                              <button
                                onClick={() => cancelPayout(c.id)}
                                disabled={workflowLoading}
                                className="text-xs px-2 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 cursor-pointer disabled:opacity-40"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmCancelId(null)}
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {(() => {
                                const p = payoutsMap[c.id];
                                const batchApproved = batch?.status === 'owner_approved';
                                if (p?.status === 'paid') return <i className="ri-checkbox-circle-fill text-emerald-400 text-sm"></i>;
                                if (batchApproved && p?.status === 'hr_approved') {
                                  return (
                                    <button
                                      onClick={() => markPaid(c.id)}
                                      disabled={workflowLoading}
                                      className="text-xs px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 cursor-pointer disabled:opacity-40 whitespace-nowrap"
                                    >
                                      Mark Paid
                                    </button>
                                  );
                                }
                                if (!p || p.status === 'pending' || p.status === 'submitted') {
                                  return (
                                    <button
                                      onClick={() => approvePayout(c.id, r.pay)}
                                      disabled={workflowLoading || !!batch}
                                      className="text-xs px-2.5 py-1.5 bg-[#111827] text-white rounded-lg hover:bg-gray-700 cursor-pointer disabled:opacity-40 whitespace-nowrap"
                                    >
                                      Approve
                                    </button>
                                  );
                                }
                                return null;
                              })()}
                              {payoutsMap[c.id] && payoutsMap[c.id].status !== 'pending' && (
                                <button
                                  onClick={() => setConfirmCancelId(c.id)}
                                  title="Undo / revert status"
                                  className="text-gray-300 hover:text-rose-400 cursor-pointer transition-colors p-0.5"
                                >
                                  <i className="ri-arrow-go-back-line text-sm"></i>
                                </button>
                              )}
                            </div>
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
                      <td colSpan={2} className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Fund Transfer Workflow */}
        {!loading && (() => {
          const approvedCount = rows.filter(r => payoutsMap[r.contractor.id]?.status === 'hr_approved').length;
          const paidCount = rows.filter(r => payoutsMap[r.contractor.id]?.status === 'paid').length;

          return (
            <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#111827]">Fund Transfer</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{selectedPeriod.label}</p>
                </div>
                {!batch && approvedCount > 0 && (
                  <button
                    onClick={requestFundTransfer}
                    disabled={workflowLoading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#FF6B35] text-white text-xs font-medium rounded-lg hover:bg-[#e55a27] cursor-pointer disabled:opacity-40 whitespace-nowrap"
                  >
                    <i className="ri-send-plane-line text-sm"></i>
                    Request Fund Transfer ({approvedCount} contractors)
                  </button>
                )}
              </div>

              {!batch && approvedCount === 0 && (
                <p className="text-xs text-gray-400">Approve at least one contractor to request a fund transfer.</p>
              )}

              {batch && (
                <div className={`rounded-xl p-4 border ${
                  batch.status === 'owner_approved'
                    ? 'bg-emerald-50 border-emerald-100'
                    : 'bg-amber-50 border-amber-100'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <i className={`text-2xl ${batch.status === 'owner_approved' ? 'ri-checkbox-circle-fill text-emerald-500' : 'ri-time-fill text-amber-500'}`}></i>
                      <div>
                        <p className={`text-sm font-semibold ${batch.status === 'owner_approved' ? 'text-emerald-800' : 'text-amber-800'}`}>
                          {batch.status === 'owner_approved' ? 'Fund transfer approved — mark contractors paid as you send' : 'Awaiting owner approval'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {batch.contractor_count} contractors · {fmt(batch.total_amount, 'PHP')}
                          {batch.approved_at && ` · Approved ${new Date(batch.approved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </p>
                      </div>
                    </div>
                    {isOwner && batch.status === 'pending_owner' && (
                      <button
                        onClick={approveBatch}
                        disabled={workflowLoading}
                        className="flex-shrink-0 px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-40 whitespace-nowrap"
                      >
                        Approve & Release
                      </button>
                    )}
                  </div>

                  {batch.status === 'owner_approved' && paidCount < batch.contractor_count && (
                    <div className="mt-3 pt-3 border-t border-emerald-200">
                      <p className="text-xs text-emerald-700">
                        <strong>{paidCount}</strong> of <strong>{batch.contractor_count}</strong> contractors marked paid.
                        Use the <strong>Mark Paid</strong> button on each row after sending their transfer.
                      </p>
                    </div>
                  )}

                  {paidCount > 0 && paidCount === batch.contractor_count && (
                    <div className="mt-3 pt-3 border-t border-emerald-200 flex items-center gap-2">
                      <i className="ri-check-double-line text-emerald-500"></i>
                      <p className="text-xs text-emerald-700 font-medium">All contractors paid for this period.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
      {/* Edit Row Modal — hours, pay override + additions/deductions */}
      {editRowId && (() => {
        const editRow = rows.find(r => r.contractor.id === editRowId);
        if (!editRow) return null;
        const c = editRow.contractor;
        const adjTotal = editAdjItems.reduce((s, i) => s + i.amount, 0);
        const basePay = parseFloat(editPay) || editRow.pay;
        const grandTotal = basePay + adjTotal;
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditRowId(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-sm font-semibold text-[#111827]">Edit Payroll</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{c.full_name} · {selectedPeriod.label}</p>
                </div>
                <button onClick={() => setEditRowId(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><i className="ri-close-line text-lg"></i></button>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                {/* Hours + Base pay */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Base Pay</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">Billed Hours</label>
                      <input type="number" value={editHours} onChange={e => setEditHours(e.target.value)} step="0.5"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                      <p className="text-[10px] text-gray-400">Slack: {editRow.cappedHours.toFixed(2)}h</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">Base Pay (₱)</label>
                      <input type="number" value={editPay} onChange={e => setEditPay(e.target.value)} step="0.01"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                      <p className="text-[10px] text-gray-400">Computed: {fmt(editRow.pay, 'PHP')}</p>
                    </div>
                  </div>
                </div>

                {/* Additions & Deductions */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Additions & Deductions</p>
                  {editAdjItems.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {editAdjItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            item.type === 'deduction' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'
                          }`}>{ADJ_TYPES.find(t => t.value === item.type)?.label ?? item.type}</span>
                          <span className="text-xs text-gray-700 flex-1">{item.label}</span>
                          <span className={`text-xs font-semibold ${item.amount >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {item.amount > 0 ? '+' : ''}{fmt(item.amount, 'PHP')}
                          </span>
                          <button onClick={() => setEditAdjItems(prev => prev.filter((_, i) => i !== idx))}
                            className="text-gray-300 hover:text-rose-400 cursor-pointer flex-shrink-0">
                            <i className="ri-delete-bin-line text-sm"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Add line item */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select value={editAdjType} onChange={e => {
                        setEditAdjType(e.target.value);
                        setEditAdjSign(e.target.value === 'deduction' ? '-' : '+');
                      }}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white cursor-pointer">
                        {ADJ_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setEditAdjSign(s => s === '+' ? '-' : '+')}
                          className={`w-9 flex-shrink-0 rounded-lg text-sm font-bold border transition-colors cursor-pointer ${
                            editAdjSign === '+'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                              : 'bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100'
                          }`}
                        >
                          {editAdjSign}
                        </button>
                        <input type="number" placeholder="Amount (₱)" value={editAdjAmount} onChange={e => setEditAdjAmount(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addEditAdjItem()}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Description (e.g. May referral — John)" value={editAdjLabel}
                        onChange={e => setEditAdjLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addEditAdjItem()}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                      <button onClick={addEditAdjItem}
                        className="px-3 py-2 bg-[#111827] text-white text-xs rounded-lg hover:bg-gray-700 cursor-pointer whitespace-nowrap">
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Total summary */}
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Base pay</span><span>{fmt(basePay, 'PHP')}</span>
                  </div>
                  {adjTotal !== 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Adjustments</span>
                      <span className={adjTotal >= 0 ? 'text-emerald-600' : 'text-rose-500'}>
                        {adjTotal > 0 ? '+' : ''}{fmt(adjTotal, 'PHP')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-[#111827] pt-1 border-t border-gray-200">
                    <span>Total</span><span>{fmt(grandTotal, 'PHP')}</span>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-4 pt-3 border-t border-gray-100 flex justify-between gap-2 flex-shrink-0">
                <button
                  onClick={() => { setRowOverrides(prev => { const n = { ...prev }; delete n[editRowId!]; return n; }); setEditAdjItems([]); setEditRowId(null); }}
                  className="px-3 py-2 text-xs text-rose-400 hover:text-rose-600 cursor-pointer"
                >
                  Reset all
                </button>
                <div className="flex gap-2">
                  <button onClick={() => setEditRowId(null)} className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer">Cancel</button>
                  <button onClick={() => saveEditRow(editRowId!)} disabled={editSaving}
                    className="px-4 py-2 bg-[#FF6B35] text-white text-xs font-medium rounded-lg hover:bg-[#e55a27] cursor-pointer disabled:opacity-40">
                    {editSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </AdminLayout>
  );
}

import { supabase } from '@/lib/supabase';

export async function fetchPayrollTotal(periodStart: string, periodEnd: string, usdRate = 56): Promise<number> {
  const [contractorsRes, hoursRes] = await Promise.all([
    supabase
      .from('hub_users')
      .select('id, currency, payment_type, hourly_rate, monthly_rate, start_date')
      .eq('status', 'active')
      .in('role', ['contractor', 'admin']),
    supabase
      .from('hub_daily_hours')
      .select('user_id, hours_capped, overtime_hours, date')
      .gte('date', periodStart)
      .lte('date', periodEnd),
  ]);

  const contractors = (contractorsRes.data || []).filter((c: any) =>
    !c.start_date || c.start_date <= periodEnd
  );

  const hoursByDate: Record<string, Record<string, number>> = {};
  const overtimeByDate: Record<string, Record<string, number>> = {};
  const hoursMap: Record<string, { capped: number; overtime: number }> = {};
  for (const h of hoursRes.data || []) {
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

  const ids = contractors.map((c: any) => c.id);
  const [{ data: rateHistoryAll }, { data: payoutsData }] = await Promise.all([
    ids.length > 0
      ? supabase
          .from('hub_rate_history')
          .select('contractor_id, effective_date, hourly_rate, monthly_rate')
          .in('contractor_id', ids)
          .lte('effective_date', periodEnd)
          .order('effective_date', { ascending: true })
      : Promise.resolve({ data: [] }),
    ids.length > 0
      ? supabase
          .from('hub_payouts')
          .select('contractor_id, adjustments')
          .in('contractor_id', ids)
          .eq('cutoff_start', periodStart)
      : Promise.resolve({ data: [] }),
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

  let total = 0;

  for (const c of contractors) {
    const hrs = hoursMap[c.id] || { capped: 0, overtime: 0 };
    const payType = c.payment_type || 'hourly';
    const history = rateHistoryMap[c.id] || [];

    const changeInPeriod = history.find(r =>
      r.effective_date >= periodStart && r.effective_date <= periodEnd
    );
    const rateAtStart = [...history].filter(r => r.effective_date < periodStart).pop() || null;

    let pay = 0;

    if (changeInPeriod) {
      const beforeChange = [...history].filter(r => r.effective_date < changeInPeriod.effective_date).pop();
      const oldMonthly = beforeChange ? (beforeChange.monthly_rate || 0) : (c.monthly_rate || 0);
      const oldHourly  = beforeChange ? (beforeChange.hourly_rate  || 0) : (c.hourly_rate  || 0);
      const newMonthly = changeInPeriod.monthly_rate || 0;
      const newHourly  = changeInPeriod.hourly_rate  || 0;

      const pStart   = new Date(periodStart + 'T00:00:00');
      const pEnd     = new Date(periodEnd   + 'T00:00:00');
      const chDate   = new Date(changeInPeriod.effective_date + 'T00:00:00');
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
        for (const [date, h] of Object.entries(datesMap)) {
          if (date < changeInPeriod.effective_date) hrsAtOld += h as number;
          else hrsAtNew += h as number;
        }
        pay = hrsAtOld * oldHourly + hrsAtNew * newHourly + hrs.overtime * newHourly;
      }
    } else {
      const monthly = rateAtStart?.monthly_rate ?? c.monthly_rate ?? 0;
      const hourly  = rateAtStart?.hourly_rate  ?? c.hourly_rate  ?? 0;
      const otRate  = payType === 'fixed' ? (hourly || monthly / 176) : hourly;
      if (payType === 'fixed') {
        pay = monthly / 2 + hrs.overtime * otRate;
      } else {
        pay = hrs.capped * hourly + hrs.overtime * hourly;
      }
    }

    const inPHP = c.currency === 'USD' ? pay * usdRate : pay;
    total += inPHP + (adjMap[c.id] || 0);
  }

  return total;
}

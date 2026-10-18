// The "payment sent" email for a payslip: the total, how it's made up, and the
// hours behind it. The official payslip PDF is attached separately.
import {
  amount, BLACK, breakdownBar, CHART, columnChart, details, esc, GREY, hunaEmail, label, p, RULE, SANS, statTiles,
} from '../_shared/emailLayout.ts';
import { EMPLOYEE_NOTE, PAYOUTS_URL, payslipTracker } from '../_shared/employeeEmails.ts';

export interface PayslipEmail {
  firstName: string;
  periodLabel: string;
  issuedLabel: string;
  payslipNo: string;
  department?: string | null;
  contractType: string;
  rateLabel: string;
  /** Hourly pay: hours and rate already show elsewhere, so base pay needs no note. */
  hourly: boolean;
  total: number;
  basePay: number;
  basePayDesc: string;
  overtimePay: number;
  overtimeHours: number;
  adjustments: Array<{ label: string; amount: number; type?: string }>;
  daysWorked: number;
  hoursBilled: number;
  days: Array<{ date: string; hours: number; overtime: number }>;
  pdfAttached: boolean;
  fmt: (n: number) => string;
}

const WEEKDAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function payslipEmail(e: PayslipEmail): string {
  const additions = e.adjustments.filter((a) => a.amount > 0);
  const deductions = e.adjustments.filter((a) => a.amount < 0);
  const addTotal = additions.reduce((t, a) => t + a.amount, 0);

  const parts = [
    { label: 'Base pay', amount: e.basePay, display: e.fmt(e.basePay), color: CHART.base, note: e.hourly ? undefined : e.basePayDesc },
    ...(e.overtimePay > 0 ? [{ label: 'Overtime', amount: e.overtimePay, display: e.fmt(e.overtimePay), color: CHART.extra }] : []),
    ...(addTotal > 0 ? [{ label: 'Additions', amount: addTotal, display: `+${e.fmt(addTotal)}`, color: CHART.add, note: additions.map((a) => a.label).join(', ') }] : []),
  ];
  const less = deductions.map((d) =>
    `<tr><td style="padding:5px 0;text-align:left;font-family:${SANS};font-size:14px;color:${GREY}">Less: ${esc(d.label)}</td><td align="right" style="padding:5px 0;text-align:right;white-space:nowrap;font-family:${SANS};font-size:14px;font-weight:600;color:${BLACK}">−${e.fmt(Math.abs(d.amount))}</td></tr>`).join('');
  const totalRow = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:-10px 0 24px">${less}
    <tr><td style="padding:10px 0 0;border-top:1px solid ${RULE};text-align:left;font-family:${SANS};font-size:15px;font-weight:700;color:${BLACK}">Total payout</td>
    <td align="right" style="padding:10px 0 0;border-top:1px solid ${RULE};text-align:right;white-space:nowrap;font-family:${SANS};font-size:15px;font-weight:700;color:${BLACK}">${e.fmt(e.total)}</td></tr></table>`;

  const hasOT = e.days.some((d) => d.overtime > 0);
  const max = Math.max(8, ...e.days.map((d) => d.hours + d.overtime));
  const chart = e.days.length
    ? label('Your hours, day by day') + columnChart(
        e.days.map((d) => {
          const dt = new Date(`${d.date}T00:00:00`);
          return { top: WEEKDAY[dt.getDay()], bottom: String(dt.getDate()), value: d.hours, extra: d.overtime, label: (d.hours + d.overtime).toFixed(1) };
        }),
        { max, legend: hasOT ? ['Regular hours', 'Overtime'] : undefined },
      )
    : '';

  return hunaEmail({
    title: `Payment sent — ${e.periodLabel}`,
    heading: 'Payment sent',
    body: [
      p(`Hi ${esc(e.firstName)}, your pay for <strong>${esc(e.periodLabel)}</strong> is on its way.${e.pdfAttached ? ' Your official payslip is attached as a PDF.' : ''}`),
      amount('Total payout', esc(e.fmt(e.total))),
      payslipTracker('paid', { paid: e.issuedLabel }),
      statTiles([
        { label: 'Days worked', value: String(e.daysWorked), sub: 'days' },
        { label: 'Hours billed', value: e.hoursBilled.toFixed(1), sub: 'hours' },
        ...(e.overtimeHours > 0 ? [{ label: 'Overtime', value: `+${e.overtimeHours.toFixed(1)}`, sub: 'hours' }] : []),
      ]),
      label('What makes up your pay'),
      breakdownBar(parts),
      totalRow,
      chart,
      details([
        ['Payslip no.', esc(e.payslipNo)],
        ['Team', e.department && esc(e.department)],
        ['Rate', `${esc(e.contractType)} · ${esc(e.rateLabel)}`],
      ]),
    ].join(''),
    buttons: [{ label: 'View in Sentro', url: PAYOUTS_URL }],
    note: EMPLOYEE_NOTE,
  });
}

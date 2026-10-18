// Payslip submitted: the team gets a review request. (The employee gets no email;
// the "Payment sent" email from send-payslip is the one they keep.)
import { details, esc, hunaEmail, p, TEAM_NOTE } from '../_shared/emailLayout.ts';

export function teamPayslipEmail(o: { name: string; department?: string | null; periodLabel: string; amount: string; reviewUrl: string }): string {
  return hunaEmail({
    title: `Payslip submitted — ${o.name}`,
    heading: 'Payslip submitted',
    body: [
      p(`<strong>${esc(o.name)}</strong> submitted their payslip for <strong>${esc(o.periodLabel)}</strong> and is waiting for approval.`),
      details([['Team', o.department && esc(o.department)], ['Amount', `<strong>${esc(o.amount)}</strong>`]]),
    ].join(''),
    buttons: [{ label: 'Review payslip', url: o.reviewUrl }],
    note: TEAM_NOTE,
  });
}

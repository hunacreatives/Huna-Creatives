// A payslip flag resolved by HR. (Approvals go out on Slack / app push, not email.)
import { amount, esc, hunaEmail, p } from '../_shared/emailLayout.ts';
import { EMPLOYEE_NOTE, PAYOUTS_URL } from '../_shared/employeeEmails.ts';

export function disputeResolvedEmail(o: { firstName: string; periodLabel: string; amount: string }): string {
  return hunaEmail({
    title: `Your payslip flag is resolved — ${o.periodLabel}`,
    heading: 'Your payslip flag is resolved',
    body: [
      p(`Hi ${esc(o.firstName)}, HR reviewed the flag you raised on your payslip for <strong>${esc(o.periodLabel)}</strong> and resolved it. Here’s the amount now on file.`),
      amount('Payslip amount', esc(o.amount)),
    ].join(''),
    buttons: [{ label: 'View in Sentro', url: PAYOUTS_URL }],
    note: EMPLOYEE_NOTE,
  });
}

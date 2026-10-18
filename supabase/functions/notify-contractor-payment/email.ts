// A project payout to an employee, with how much of their total fee is now paid.
import { amount, details, esc, hunaEmail, label, p, progressBar } from '../_shared/emailLayout.ts';
import { EMPLOYEE_NOTE } from '../_shared/employeeEmails.ts';

export function projectPayoutEmail(o: {
  name: string; projectName: string; clientName?: string | null; amount: string; date: string; notes?: string | null;
  totalCut: number; totalPaid: number; isFullyPaid: boolean; receiptUrl?: string | null; fmt: (n: number) => string;
}): string {
  const pct = o.totalCut > 0 ? (o.totalPaid / o.totalCut) * 100 : 0;
  const remaining = Math.max(o.totalCut - o.totalPaid, 0);
  return hunaEmail({
    title: `You've been paid ${o.amount}`,
    heading: 'Payment sent',
    body: [
      p(`Hi ${esc(o.name)}, a payout for <strong>${esc(o.projectName)}</strong> is on its way to you.`),
      amount('Amount paid', esc(o.amount), esc(o.date)),
      details([['Client', o.clientName && esc(o.clientName)], ['Note', o.notes && esc(o.notes)]]),
      o.totalCut > 0
        ? label('Your fee for this project') + progressBar(pct,
            `<strong style="color:#140f0b">${esc(o.fmt(o.totalPaid))}</strong> of ${esc(o.fmt(o.totalCut))} received${o.isFullyPaid ? '. Paid in full.' : ` · ${esc(o.fmt(remaining))} to go`}`)
        : '',
    ].join(''),
    buttons: o.receiptUrl ? [{ label: 'View receipt', url: esc(o.receiptUrl) }] : [],
    note: EMPLOYEE_NOTE,
  });
}

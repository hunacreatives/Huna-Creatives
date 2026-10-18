// Confirms a payment was received, with the proof of receipt if there is one.
import { amount, details, esc, hunaEmail, label, p, PANEL, RULE } from '../_shared/emailLayout.ts';

export function receiptEmail(o: {
  clientName: string; projectName: string; amount: string; date: string; ref?: string | null;
  notes?: string | null; totalPaid: string; balance: string; isPaid: boolean;
  receiptUrl?: string | null; receiptThumb?: string | null;
}): string {
  return hunaEmail({
    title: `Payment received — ${o.projectName}`,
    heading: 'Payment confirmed',
    body: [
      p(`Hi ${esc(o.clientName)}, thank you for your payment for <strong>${esc(o.projectName)}</strong>.`),
      amount('Amount received', esc(o.amount), esc(o.date)),
      details([
        ['Reference', o.ref && `#${esc(o.ref)}`],
        ['Note', o.notes && esc(o.notes)],
        ['Paid to date', esc(o.totalPaid)],
        o.isPaid ? ['Balance', 'Fully paid. Thank you.'] : ['Remaining', esc(o.balance)],
      ]),
      o.receiptUrl
        ? label('Proof of receipt')
          + `<a href="${esc(o.receiptUrl)}" style="display:block;border:1px solid ${RULE};border-radius:10px;overflow:hidden"><img src="${esc(o.receiptThumb ?? o.receiptUrl)}" alt="Receipt" style="display:block;width:100%;max-height:300px;object-fit:contain;background:${PANEL};border:0"></a>`
          + p('Tap the image to view it full size.', { small: true, muted: true })
        : '',
    ].join(''),
    note: 'This email is not monitored. For concerns, email contact@hunacreatives.com.',
  });
}

// A reminder that a payment is coming up, with the QR codes to pay with.
import { amount, BLACK, details, esc, hunaEmail, label, p, PANEL, quote, SANS, SITE_URL } from '../_shared/emailLayout.ts';

const QRS = [
  ['qr-gcash.jpg', 'GCash'],
  ['qr-bdo.jpg', 'BDO InstaPay'],
  ['qr-gotyme.jpg', 'GoTyme'],
];

const qrRow = () => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr>${QRS.map(([file, name], i) =>
  `<td width="33%" align="center" style="padding:0 ${i === 2 ? 0 : 5}px 0 ${i === 0 ? 0 : 5}px;vertical-align:top">
    <div style="background:${PANEL};border-radius:10px;padding:12px 8px;text-align:center">
      <img src="${SITE_URL}/images/${file}" alt="${name} QR" width="110" height="110" style="display:block;margin:0 auto;width:110px;max-width:100%;height:auto;border-radius:6px">
      <p style="margin:8px 0 0;font-family:${SANS};font-size:12px;font-weight:700;color:${BLACK}">${name}</p>
    </div></td>`).join('')}</tr></table>`;

export function reminderEmail(o: {
  clientName: string; projectName: string; amountDue: string | null; dueDate: string | null;
  notes?: string | null; paidToDate?: string | null; payUrl?: string | null;
}): string {
  return hunaEmail({
    title: `Payment reminder — ${o.projectName}`,
    body: [
      p(`Hi ${esc(o.clientName)},`),
      p(`Just a reminder that a payment is coming up for your project <strong>${esc(o.projectName)}</strong>.`),
      amount('Amount due', o.amountDue ? esc(o.amountDue) : 'See invoice', o.dueDate ? `Due ${esc(o.dueDate)}` : undefined),
      o.notes ? quote(o.notes) : '',
      details([['Paid to date', o.paidToDate && esc(o.paidToDate)]]),
      label('Pay via'),
      qrRow(),
      o.payUrl ? p('After paying, tap below to send us your receipt.') : '',
    ].join(''),
    buttons: o.payUrl ? [{ label: 'Submit proof of payment', url: o.payUrl }] : [],
    note: 'This email is not monitored. For concerns, email contact@hunacreatives.com.',
  });
}

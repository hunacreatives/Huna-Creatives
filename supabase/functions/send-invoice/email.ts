// The invoice email, with a link to the online payment page.
import { amount, details, esc, hunaEmail, itemsTable, label, link, MUTED, p, quote } from '../_shared/emailLayout.ts';

export interface InvoiceEmail {
  invoiceNo: string;            // already padded, e.g. 0012
  billedTo: string;
  toLine: string;               // recipient emails as typed
  billToAddress?: string | null;
  projectName: string;
  service?: string | null;
  startDate?: string | null;    // formatted
  issueDate: string;            // formatted
  dueDate: string;              // formatted, or '—'
  lineItems: Array<{ description: string; amount: string }>;
  payments: Array<{ date: string; note: string; amount: string }>; // formatted
  subtotal: string;
  totalPaid: string;
  showPaidRow: boolean;
  amountDue: string;
  isPaid: boolean;
  message?: string | null;
  notes?: string | null;
  payUrl: string;
  fmt: (n: number) => string;
}

export function invoiceEmail(i: InvoiceEmail): string {
  const totals: Array<[string, string]> = [['Subtotal', i.subtotal]];
  if (i.showPaidRow) totals.push(['Total paid so far', `− ${i.totalPaid}`]);
  totals.push(['Amount due', i.isPaid ? 'Paid in full' : i.amountDue]);

  return hunaEmail({
    title: `Invoice #${i.invoiceNo}`,
    heading: `Invoice #${esc(i.invoiceNo)}`,
    body: [
      i.message ? quote(i.message) : '',
      amount(i.isPaid ? 'Balance' : 'Amount due', i.isPaid ? 'Paid in full' : esc(i.amountDue), i.isPaid ? undefined : `Due ${esc(i.dueDate)}`),
      details([
        ['Billed to', `<strong>${esc(i.billedTo)}</strong>${i.toLine ? `<br>${esc(i.toLine)}` : ''}${i.billToAddress ? `<br>${esc(i.billToAddress).replace(/\n/g, '<br>')}` : ''}`],
        ['From', `Huna Creatives<br>${link('mailto:billing@hunacreatives.com', 'billing@hunacreatives.com')}`],
        ['Project', `${esc(i.projectName)}${i.service ? `<br><span style="color:${MUTED}">${esc(i.service)}</span>` : ''}`],
        ['Started', i.startDate && esc(i.startDate)],
        ['Issue date', esc(i.issueDate)],
        // The amount panel already shows the due date unless it's paid.
        ['Due date', i.isPaid && esc(i.dueDate)],
      ]),
      label('Items'),
      itemsTable({
        head: ['Description', 'Amount'],
        rows: i.lineItems.map((li) => [esc(li.description), i.fmt(parseFloat(li.amount) || 0)]),
        totals,
      }),
      i.payments.length
        ? label('Payments received') + itemsTable({
            head: ['Date', 'Note', 'Payment'],
            rows: i.payments.map((pm) => [esc(pm.date), esc(pm.note), esc(pm.amount)]),
            align: ['left', 'left', 'right'],
          })
        : '',
      i.notes ? p(esc(i.notes), { small: true, muted: true }) : '',
      i.isPaid ? '' : p('<strong>Pay securely online.</strong> Tap below and scan the QR code with GCash, Maya, or your bank’s app. Your payment is confirmed automatically.'),
    ].join(''),
    buttons: i.isPaid ? [] : [{ label: 'Pay now', url: i.payUrl }],
    note: 'Questions about this invoice? Email us at contact@hunacreatives.com.',
  });
}

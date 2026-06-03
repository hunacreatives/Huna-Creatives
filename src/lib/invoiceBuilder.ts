export interface InvoiceLineItem {
  description: string;
  amount: string;
}

export interface InvoicePaymentHistoryItem {
  id: number;
  amount: number;
  paid_at: string;
  notes: string | null;
  receipt_url?: string | null;
}

export interface InvoiceProjectSnapshot {
  id: number;
  client_name: string;
  project_name: string;
  service: string | null;
  contract_price: number;
  start_date: string | null;
  deadline: string | null;
  contact_email: string | null;
  hub_project_payments: InvoicePaymentHistoryItem[];
}

export interface InvoiceBuilderFormState {
  send_to: string;
  cc: string;
  client_name: string;
  billing_address: string;
  reference: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  payment_terms: string;
  currency: 'PHP' | 'USD';
  customer_notes: string;
  payment_instructions: string;
  amount_requested: string;
}

export const emptyInvoiceBuilderForm = (): InvoiceBuilderFormState => ({
  send_to: '',
  cc: '',
  client_name: '',
  billing_address: '',
  reference: '',
  invoice_number: '',
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: '',
  payment_terms: 'Due on receipt',
  currency: 'PHP',
  customer_notes: '',
  payment_instructions: '',
  amount_requested: '',
});

export function buildInvoiceDefaults(project: InvoiceProjectSnapshot, invoiceNumber: string): InvoiceBuilderFormState {
  const totalPaid = project.hub_project_payments.reduce((sum, payment) => sum + payment.amount, 0);
  const balance = Math.max(project.contract_price - totalPaid, 0);

  return {
    send_to: project.contact_email ?? '',
    cc: '',
    client_name: project.client_name,
    billing_address: '',
    reference: '',
    invoice_number: invoiceNumber,
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: project.deadline ?? '',
    payment_terms: project.deadline ? 'Due by stated date' : 'Due on receipt',
    currency: 'PHP',
    customer_notes: '',
    payment_instructions: '',
    amount_requested: String(balance),
  };
}

export function buildDefaultInvoiceLineItems(project: InvoiceProjectSnapshot): InvoiceLineItem[] {
  return [{ description: project.service ?? project.project_name, amount: String(project.contract_price) }];
}

export function parseEmailList(value: string) {
  return value
    .split(/[,\n;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function formatInvoiceCurrency(amount: number, currency: 'PHP' | 'USD') {
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function buildInvoicePreviewHtml(params: {
  project: InvoiceProjectSnapshot;
  form: InvoiceBuilderFormState;
  lineItems: InvoiceLineItem[];
  includePaymentHistory: boolean;
  payUrl?: string | null;
  printOnLoad?: boolean;
}) {
  const { project, form, lineItems, includePaymentHistory, payUrl, printOnLoad = false } = params;
  const validLineItems = lineItems.filter((item) => item.description.trim() && item.amount !== '');
  const normalizedLineItems = validLineItems.length > 0
    ? validLineItems
    : [{ description: project.service ?? project.project_name, amount: String(project.contract_price) }];
  const lineItemsTotal = normalizedLineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const totalPaid = project.hub_project_payments.reduce((sum, item) => sum + item.amount, 0);
  const amountRequested = form.amount_requested ? parseFloat(form.amount_requested) : NaN;
  const balanceDue = Number.isFinite(amountRequested) ? amountRequested : Math.max(lineItemsTotal - totalPaid, 0);
  const logoUrl = 'https://www.hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png';
  const currency = form.currency;
  const fmt = (amount: number) => formatInvoiceCurrency(amount, currency);
  const issueDate = form.issue_date
    ? new Date(`${form.issue_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';
  const dueDate = form.due_date
    ? new Date(`${form.due_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';
  const paymentRows = includePaymentHistory
    ? project.hub_project_payments.map((payment) => `
      <tr>
        <td>${new Date(payment.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td>${payment.notes ?? 'Payment received'}</td>
        <td class="amount paid">+ ${fmt(payment.amount)}</td>
      </tr>`).join('')
    : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Invoice #${form.invoice_number || String(project.id).padStart(4, '0')} — ${project.project_name}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;background:#f9fafb;padding:24px}
  .invoice-card{max-width:1100px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden}
  .content{padding:28px 40px 36px}
  .header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;background:#0f172a;padding:28px 40px}
  .header-brand img{height:64px;display:block}
  .header-right{text-align:right}
  .header-right h1{font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em}
  .header-right .inv{font-size:36px;line-height:1;font-weight:800;color:#fff}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid #f3f4f6}
  .meta-col .eyebrow{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
  .meta-col .title{font-size:16px;font-weight:700}
  .meta-col .line{font-size:12px;color:#6b7280;line-height:1.7;white-space:pre-line}
  .meta-col.right{text-align:right}
  .project-box{background:#f9fafb;border-radius:10px;padding:14px 16px;margin-bottom:20px}
  .project-box .name{font-size:14px;font-weight:600}
  .project-box .sub{font-size:12px;color:#6b7280;margin-top:3px}
  .settings-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:20px}
  .settings-card{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px 14px}
  .settings-card .eyebrow{font-size:10px;color:#9a3412;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
  .settings-card .value{font-size:13px;font-weight:700;color:#7c2d12}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  th{background:#111827;color:#fff;padding:10px 14px;font-size:11px;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:.04em}
  td{padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px}
  td.amount{text-align:right;font-weight:600}
  td.paid{color:#059669}
  .summary-wrap{display:flex;justify-content:flex-end;margin-top:10px}
  .summary-card{width:360px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:14px 18px}
  .summary-title{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-bottom:8px}
  .totals{width:100%;margin:0}
  .totals tr td{padding:7px 0;font-size:13px;color:#6b7280;border:none}
  .totals tr td:last-child{text-align:right}
  .totals .divider td{padding:5px 0 0}
  .totals .divider-line{border-top:2px solid #e5e7eb}
  .totals .balance td{font-size:16px;font-weight:800;color:#111827;padding-top:10px}
  .totals .balance td:last-child{color:${balanceDue <= 0 ? '#059669' : '#FF6B35'}}
  .notes-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}
  .note-card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px}
  .note-card .eyebrow{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}
  .note-card .body{font-size:13px;color:#374151;line-height:1.6;white-space:pre-line}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af}
  .pay-via{margin-top:24px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px;text-align:center}
  .pay-via .title{font-size:14px;font-weight:700;color:#111827;margin-bottom:6px}
  .pay-via .body{font-size:12px;color:#6b7280;margin-bottom:14px}
  .pay-via .button{display:inline-block;background:#111827;color:#ffffff;font-size:13px;font-weight:700;padding:10px 18px;border-radius:9px;text-decoration:none}
  @media print{body{padding:0;background:#fff}.invoice-card{max-width:none;border:none;border-radius:0}.content{padding:24px}}
</style></head><body>
<div class="invoice-card">
<div class="header">
  <div class="header-brand">
    <img src="${logoUrl}" onerror="this.parentElement.style.display='none'" />
  </div>
  <div class="header-right">
    <h1>Invoice</h1>
    <div class="inv">#${form.invoice_number || String(project.id).padStart(4, '0')}</div>
  </div>
</div>
<div class="content">
<div class="meta">
  <div class="meta-col">
    <div class="eyebrow">From</div>
    <div class="title">Huna Creatives</div>
    <div class="line">billing@hunacreatives.com
www.hunacreatives.com</div>
  </div>
  <div class="meta-col right">
    <div class="eyebrow">Bill To</div>
    <div class="title">${form.client_name || project.client_name}</div>
    <div class="line">${form.send_to ? `${form.send_to}${form.billing_address ? '\n' : ''}` : ''}${form.billing_address}</div>
  </div>
</div>
<div class="project-box">
  <div class="name">${project.project_name}</div>
  ${project.service ? `<div class="sub">${project.service}</div>` : ''}
  ${project.start_date ? `<div class="sub">Started ${new Date(project.start_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>` : ''}
</div>
<div class="settings-grid">
  <div class="settings-card"><div class="eyebrow">Issue Date</div><div class="value">${issueDate}</div></div>
  <div class="settings-card"><div class="eyebrow">Due Date</div><div class="value">${dueDate}</div></div>
  <div class="settings-card"><div class="eyebrow">Payment Terms</div><div class="value">${form.payment_terms || '—'}</div></div>
  <div class="settings-card"><div class="eyebrow">Reference / PO</div><div class="value">${form.reference || '—'}</div></div>
</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${normalizedLineItems.map((item) => `<tr><td>${item.description}</td><td class="amount">${fmt(parseFloat(item.amount) || 0)}</td></tr>`).join('')}</tbody>
</table>
${includePaymentHistory && project.hub_project_payments.length > 0 ? `
<table>
  <thead><tr><th>Date</th><th>Note</th><th style="text-align:right">Payment</th></tr></thead>
  <tbody>${paymentRows}</tbody>
</table>` : ''}
<div class="summary-wrap">
  <div class="summary-card">
    <div class="summary-title">Invoice Summary</div>
    <table class="totals">
      <tr><td>Subtotal</td><td>${fmt(lineItemsTotal)}</td></tr>
      ${includePaymentHistory ? `<tr><td>Total paid</td><td style="color:#059669">− ${fmt(totalPaid)}</td></tr>` : ''}
      <tr class="divider"><td colspan="2"><div class="divider-line"></div></td></tr>
      <tr class="balance"><td>Balance due</td><td>${balanceDue <= 0 ? 'Paid in full' : fmt(balanceDue)}</td></tr>
    </table>
  </div>
</div>
${form.customer_notes || form.payment_instructions ? `
<div class="notes-grid">
  ${form.customer_notes ? `<div class="note-card"><div class="eyebrow">Customer Notes</div><div class="body">${form.customer_notes}</div></div>` : ''}
  ${form.payment_instructions ? `<div class="note-card"><div class="eyebrow">Payment Instructions</div><div class="body">${form.payment_instructions}</div></div>` : ''}
</div>` : ''}
${balanceDue > 0 && payUrl ? `
<div class="pay-via">
  <div class="title">Choose your payment channel online</div>
  <div class="body">Open your secure payment page to select GCash, BDO, or GoTyme, then upload proof of payment.</div>
  <a href="${payUrl}" target="_blank" rel="noopener noreferrer" class="button">Pay Now →</a>
</div>` : ''}
<div class="footer">This invoice was prepared in Sentro OS. Questions? Contact contact@hunacreatives.com.</div>
</div>
</div>
${printOnLoad ? '<script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>' : ''}
</body></html>`;
}


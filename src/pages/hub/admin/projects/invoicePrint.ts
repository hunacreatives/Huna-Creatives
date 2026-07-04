import { supabase } from '@/lib/supabase';
import { fmtDate } from './shared';

export interface PrintableProject {
  id: number;
  project_name: string;
  client_name: string;
  service: string | null;
  contract_price: number;
  start_date: string | null;
  notes: string | null;
  contact_email: string | null;
  hub_project_payments: { id: number; amount: number; paid_at: string; notes: string | null; receipt_url: string | null }[];
}

// Opens the printable invoice window (used by the Print button and previews).
export async function openInvoicePrintView(project: PrintableProject, overrides?: { due_date?: string; invoice_number?: string; bill_to_name?: string; bill_to_address?: string; reference?: string; payment_terms?: string; message?: string; line_items?: { description: string; amount: string }[]; show_payments?: boolean; amount_requested?: number }) {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Preparing invoice…</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px;color:#111827} .muted{color:#6b7280;font-size:14px}</style></head><body><h2>Preparing invoice preview…</h2><p class="muted">Please wait while we generate the print view.</p></body></html>`);
    win.document.close();

    const { data: latestLink } = await supabase
      .from('hub_invoice_payment_links')
      .select('token')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const payUrl = latestLink?.token
      ? `https://hunacreatives.com/pay/${latestLink.token}`
      : null;
    const totalPaid = project.hub_project_payments.reduce((s, x) => s + x.amount, 0);
    const fmt2 = (n: number) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const logoUrl = 'https://www.hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png';
    const invNum = overrides?.invoice_number || String(project.id).padStart(4,'0');
    const billToName = overrides?.bill_to_name || project.client_name;
    const billToAddress = overrides?.bill_to_address?.trim() || '';
    const customMsg = overrides?.message || '';
    const lineItems = overrides?.line_items ?? [{ description: project.service ?? project.project_name, amount: String(project.contract_price) }];
    const showPayments = overrides?.show_payments ?? true;
    const lineItemsTotal = lineItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    // balance_due is what appears on the invoice — use explicit amount_requested if provided,
    // otherwise fall back to lineItemsTotal (the invoice amount itself, not auto-deducted)
    const balanceDue = overrides?.amount_requested != null ? overrides.amount_requested : lineItemsTotal - totalPaid;
    const paymentRows = project.hub_project_payments.map(p => `
      <tr>
        <td>${fmtDate(p.paid_at)}</td>
        <td>${p.notes ?? 'Payment received'}</td>
        <td class="amount paid">+ ${fmt2(p.amount)}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Invoice #${invNum} — ${project.project_name}</title>
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
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #f3f4f6}
  .meta-col .eyebrow{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
  .meta-col .title{font-size:16px;font-weight:700}
  .meta-col .line{font-size:12px;color:#6b7280;line-height:1.7;white-space:pre-line}
  .meta-col.right{text-align:right}
  .project-box{background:#f9fafb;border-radius:10px;padding:14px 16px;margin-bottom:20px}
  .project-box .name{font-size:14px;font-weight:600}
  .project-box .sub{font-size:12px;color:#6b7280;margin-top:3px}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  th{background:#111827;color:#fff;padding:10px 14px;font-size:11px;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:.04em}
  td{padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px}
  td.amount{text-align:right;font-weight:600}
  td.paid{color:#059669}
  .summary-wrap{display:flex;justify-content:flex-end;margin-top:10px}
  .summary-card{width:340px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:14px 18px}
  .summary-title{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-bottom:8px}
  .totals{width:100%;margin:0}
  .totals tr td{padding:7px 0;font-size:13px;color:#6b7280;border:none}
  .totals tr td:last-child{text-align:right}
  .totals .divider td{padding:5px 0 0}
  .totals .divider-line{border-top:2px solid #e5e7eb}
  .totals .balance td{font-size:16px;font-weight:800;color:#111827;padding-top:10px}
  .totals .balance td:last-child{color:${balanceDue <= 0 ? '#059669' : '#FF6B35'}}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af}
  .pay-via{margin-top:32px}
  .pay-via h3{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:14px}
  .qr-grid{display:flex;gap:12px}
  .qr-item{flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 10px;text-align:center}
  .qr-item img{width:100px;height:100px;object-fit:contain;border-radius:6px;display:block;margin:0 auto}
  .qr-item p{margin:8px 0 0;font-size:12px;font-weight:700;color:#111827}
  @media print{body{padding:0;background:#fff}.invoice-card{max-width:none;border:none;border-radius:0}.content{padding:24px}}
</style></head><body>
<div class="invoice-card">
<div class="header">
  <div class="header-brand">
    <img src="${logoUrl}" onerror="this.parentElement.style.display='none'" />
  </div>
  <div class="header-right">
    <h1>Invoice</h1>
    <div class="inv">#${invNum}</div>
  </div>
</div>
<div class="content">
${customMsg ? `<div style="background:#fffbf5;border:1px solid #fed7aa;border-radius:10px;padding:14px 16px;margin-bottom:24px;font-size:13px;color:#92400e">${customMsg}</div>` : ''}
<div class="meta">
  <div class="meta-col">
    <div class="eyebrow">From</div>
    <div class="title">Huna Creatives</div>
    <div class="line">billing@hunacreatives.com
www.hunacreatives.com</div>
  </div>
  <div class="meta-col right">
    <div class="eyebrow">Bill To</div>
    <div class="title">${billToName}</div>
    <div class="line">${project.contact_email ? `${project.contact_email}${billToAddress ? '\n' : ''}` : ''}${billToAddress}</div>
  </div>
</div>
<div class="project-box">
  <div class="name">${project.project_name}</div>
  ${project.service ? `<div class="sub">${project.service}</div>` : ''}
  ${project.start_date ? `<div class="sub">Started ${new Date(project.start_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>` : ''}
</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${lineItems.map(i => `<tr><td>${i.description}</td><td class="amount">${fmt2(parseFloat(i.amount) || 0)}</td></tr>`).join('')}</tbody>
</table>
${showPayments && project.hub_project_payments.length > 0 ? `
<table>
  <thead><tr><th>Date</th><th>Note</th><th style="text-align:right">Payment</th></tr></thead>
  <tbody>${paymentRows}</tbody>
</table>` : ''}
<div class="summary-wrap">
  <div class="summary-card">
    <div class="summary-title">Invoice Summary</div>
    <table class="totals">
      <tr><td>Subtotal</td><td>${fmt2(lineItemsTotal)}</td></tr>
      ${showPayments ? `<tr><td>Total paid</td><td style="color:#059669">− ${fmt2(totalPaid)}</td></tr>` : ''}
      <tr class="divider"><td colspan="2"><div class="divider-line"></div></td></tr>
      <tr class="balance"><td>Balance due</td><td>${balanceDue <= 0 ? 'Paid in full' : fmt2(balanceDue)}</td></tr>
    </table>
  </div>
</div>
${balanceDue > 0 && payUrl ? `
<div style="margin-top:14px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px;text-align:center;">
  <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:6px;">Choose your payment channel online</div>
  <div style="font-size:12px;color:#6b7280;margin-bottom:14px;">Open your secure payment page to select GCash, BDO, or GoTyme, then upload proof of payment.</div>
  <a href="${payUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#111827;color:#ffffff;font-size:13px;font-weight:700;padding:10px 18px;border-radius:9px;text-decoration:none;">Pay Now →</a>
</div>` : ''}
${project.notes ? `<p style="font-size:12px;color:#6b7280;font-style:italic;margin-top:16px">${project.notes}</p>` : ''}
<div class="footer">This email is not being monitored. Please do not reply directly. If you have questions, contact contact@hunacreatives.com.</div>
</div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>
</body></html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
}

import { useEffect, useState } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const serviceCfg: Record<string, { border: string; dot: string; badge: string }> = {
  'Website Design':           { border: 'border-l-sky-400',     dot: 'bg-sky-400',     badge: 'bg-sky-50 text-sky-700' },
  'Website Maintenance':      { border: 'border-l-cyan-400',    dot: 'bg-cyan-400',    badge: 'bg-cyan-50 text-cyan-700' },
  'Branding & Identity':      { border: 'border-l-violet-400',  dot: 'bg-violet-400',  badge: 'bg-violet-50 text-violet-700' },
  'Graphic Design':           { border: 'border-l-pink-400',    dot: 'bg-pink-400',    badge: 'bg-pink-50 text-pink-700' },
  'Social Media Management':  { border: 'border-l-orange-400',  dot: 'bg-orange-400',  badge: 'bg-orange-50 text-orange-700' },
  'Content Creation':         { border: 'border-l-amber-400',   dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700' },
  'SEO':                      { border: 'border-l-emerald-400', dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700' },
  'Digital Ads':              { border: 'border-l-rose-400',    dot: 'bg-rose-400',    badge: 'bg-rose-50 text-rose-700' },
  'Email Marketing':          { border: 'border-l-indigo-400',  dot: 'bg-indigo-400',  badge: 'bg-indigo-50 text-indigo-700' },
  'Other':                    { border: 'border-l-gray-300',    dot: 'bg-gray-300',    badge: 'bg-gray-50 text-gray-500' },
};
const getServiceCfg = (service: string | null) => serviceCfg[service ?? ''] ?? serviceCfg['Other'];

const statusCfg: Record<string, { label: string; cls: string }> = {
  ongoing:   { label: 'Ongoing',   cls: 'bg-sky-100 text-sky-700' },
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
  paused:    { label: 'Paused',    cls: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' },
};

interface ContractorPayout { id: number; amount: number; paid_at: string; notes: string | null; receipt_url: string | null; }

interface Project {
  id: number; client_name: string; project_name: string; service: string | null;
  contract_price: number; status: string; start_date: string | null; deadline: string | null; notes: string | null; contact_email: string | null;
  hub_project_payments: { id: number; amount: number; paid_at: string; notes: string | null; receipt_url: string | null }[];
  hub_project_costs: { id: number; label: string; amount: number; date: string }[];
  hub_project_contractors: {
    id: number; percentage: number; payout_type: string; fixed_amount: number | null;
    payout_status: string; paid_at: string | null; notes: string | null;
    hub_users: { id: string; full_name: string; avatar_url: string | null; email: string | null };
    hub_project_contractor_payouts: ContractorPayout[];
  }[];
}

interface Contractor { id: string; full_name: string; avatar_url: string | null; project_percentage: number | null; department: string | null; }

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) return <img src={url} alt={name} className="w-7 h-7 rounded-full object-cover object-top flex-shrink-0" />;
  return <div className="w-7 h-7 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-bold">{name[0].toUpperCase()}</span></div>;
}

export default function AdminProjectsPage() {
  const { hubUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);

  // Project form
  const SERVICES = ['Website Design', 'Website Maintenance', 'Branding & Identity', 'Graphic Design', 'Social Media Management', 'Content Creation', 'SEO', 'Digital Ads', 'Email Marketing', 'Other'];
  const emptyForm = { client_name: '', project_name: '', service: 'Website Design', contract_price: '', status: 'ongoing', start_date: '', deadline: '', notes: '', contact_email: '' };
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Payment log
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState('');
  const [payReceipt, setPayReceipt] = useState<File | null>(null);
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState('');

  // Payment edit
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editPayForm, setEditPayForm] = useState({ amount: '', date: '', notes: '', receipt: null as File | null, existingReceiptUrl: null as string | null });
  const [editPaySaving, setEditPaySaving] = useState(false);
  const [editPayError, setEditPayError] = useState('');

  // Cost log
  const [costLabel, setCostLabel] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [costDate, setCostDate] = useState(new Date().toISOString().slice(0, 10));
  const [costSaving, setCostSaving] = useState(false);
  const [costError, setCostError] = useState('');

  // Contractor assignment
  const [addCtxId, setAddCtxId] = useState('');
  const [addCtxPayoutType, setAddCtxPayoutType] = useState<'percentage' | 'fixed'>('percentage');
  const [addCtxPct, setAddCtxPct] = useState('');
  const [addCtxFixed, setAddCtxFixed] = useState('');
  const [ctxSaving, setCtxSaving] = useState(false);
  const [ctxAddError, setCtxAddError] = useState('');

  // Staged contractor payouts: keyed by hub_project_contractors.id
  const [ctxPayForm, setCtxPayForm] = useState<Record<number, { amount: string; date: string; notes: string; receipt: File | null; notify: boolean }>>({});
  const [ctxPaySaving, setCtxPaySaving] = useState<Record<number, boolean>>({});
  const [ctxPayError, setCtxPayError] = useState<Record<number, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Invoice
  const [invoiceModal, setInvoiceModal] = useState<Project | null>(null);
  const emptyInvoiceForm = { email: '', cc: '', subject: '', due_date: '', invoice_number: '', message: '' };
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm);
  const setIf = (patch: Partial<typeof emptyInvoiceForm>) => setInvoiceForm(f => ({ ...f, ...patch }));
  const [invoiceLineItems, setInvoiceLineItems] = useState<{ description: string; amount: string }[]>([]);
  const [invoiceShowPayments, setInvoiceShowPayments] = useState(true);
  const [invoiceSending, setInvoiceSending] = useState(false);
  const [invoiceMsg, setInvoiceMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchAll = async () => {
    const [pRes, cRes] = await Promise.all([
      supabase.from('hub_projects')
        .select('*, hub_project_payments(id, amount, paid_at, notes, receipt_url), hub_project_costs(id, label, amount, date), hub_project_contractors(id, percentage, payout_type, fixed_amount, payout_status, paid_at, notes, hub_users(id, full_name, avatar_url, email), hub_project_contractor_payouts(id, amount, paid_at, notes, receipt_url))')
        .order('created_at', { ascending: false }),
      supabase.from('hub_users').select('id, full_name, avatar_url, project_percentage, department')
        .eq('status', 'active').order('full_name'),
    ]);
    setProjects((pRes.data as Project[]) ?? []);
    setContractors((cRes.data as Contractor[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const activeProject = projects.find(p => p.id === activeId) ?? null;

  const derived = (p: Project) => {
    const totalPaid = p.hub_project_payments.reduce((s, x) => s + x.amount, 0);
    const totalCosts = p.hub_project_costs.reduce((s, x) => s + x.amount, 0);
    const netProfit = p.contract_price - totalCosts;
    const balance = p.contract_price - totalPaid;
    const paidPct = p.contract_price > 0 ? (totalPaid / p.contract_price) * 100 : 0;
    return { totalPaid, totalCosts, netProfit, balance, paidPct };
  };

  const saveProject = async () => {
    if (!form.client_name.trim() || !form.project_name.trim() || !form.contract_price) { setFormError('Client, project name and contract price are required.'); return; }
    setFormSaving(true); setFormError('');
    const payload = { client_name: form.client_name.trim(), project_name: form.project_name.trim(), service: form.service || null, contract_price: parseFloat(form.contract_price), status: form.status, start_date: form.start_date || null, deadline: form.deadline || null, notes: form.notes || null, contact_email: form.contact_email.trim() || null };
    if (editingProject) {
      const { error } = await supabase.from('hub_projects').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingProject.id);
      if (error) { setFormError(error.message); setFormSaving(false); return; }
      logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'update', entity_type: 'project', entity_id: String(editingProject.id), description: `Updated project "${form.project_name}"` });
    } else {
      const { data, error } = await supabase.from('hub_projects').insert(payload).select('id').single();
      if (error) { setFormError(error.message); setFormSaving(false); return; }
      logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'create', entity_type: 'project', description: `Created project "${form.project_name}" for ${form.client_name}` });
      if (data) setActiveId(data.id);
    }
    setFormSaving(false); setShowForm(false); setEditingProject(null); setForm(emptyForm);
    fetchAll();
  };

  const logPayment = async () => {
    if (!activeId || !payAmount) return;
    setPaySaving(true); setPayError('');

    let receipt_url: string | null = null;
    if (payReceipt) {
      const ext = payReceipt.name.split('.').pop();
      const path = `client-payments/${activeId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('payout-receipts').upload(path, payReceipt, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('payout-receipts').getPublicUrl(path);
        receipt_url = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('hub_project_payments').insert({
      project_id: activeId, amount: parseFloat(payAmount), paid_at: payDate, notes: payNotes || null, receipt_url,
    });
    setPaySaving(false);
    if (error) { setPayError(error.message); return; }
    setPayAmount(''); setPayNotes(''); setPayReceipt(null);
    fetchAll();
  };

  const logCost = async () => {
    if (!activeId || !costLabel.trim() || !costAmount) return;
    setCostSaving(true); setCostError('');
    const { error } = await supabase.from('hub_project_costs').insert({
      project_id: activeId, label: costLabel.trim(), amount: parseFloat(costAmount), date: costDate,
    });
    setCostSaving(false);
    if (error) { setCostError(error.message); return; }
    setCostLabel(''); setCostAmount('');
    fetchAll();
  };

  const deletePayment = async (pid: number) => {
    await supabase.from('hub_project_payments').delete().eq('id', pid);
    fetchAll();
  };

  const updatePayment = async () => {
    if (!editPayForm.amount) return;
    setEditPaySaving(true); setEditPayError('');

    let receipt_url = editPayForm.existingReceiptUrl;
    if (editPayForm.receipt) {
      const ext = editPayForm.receipt.name.split('.').pop();
      const path = `client-payments/${activeId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('payout-receipts').upload(path, editPayForm.receipt, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('payout-receipts').getPublicUrl(path);
        receipt_url = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('hub_project_payments').update({
      amount: parseFloat(editPayForm.amount),
      paid_at: editPayForm.date,
      notes: editPayForm.notes || null,
      receipt_url,
    }).eq('id', editingPaymentId!);

    setEditPaySaving(false);
    if (error) { setEditPayError(error.message); return; }
    setEditingPaymentId(null);
    fetchAll();
  };

  const deleteCost = async (cid: number) => {
    await supabase.from('hub_project_costs').delete().eq('id', cid);
    fetchAll();
  };

  const addContractor = async () => {
    if (!activeId || !addCtxId) return;
    if (addCtxPayoutType === 'percentage' && !addCtxPct) return;
    if (addCtxPayoutType === 'fixed' && !addCtxFixed) return;
    setCtxSaving(true); setCtxAddError('');
    const { error } = await supabase.from('hub_project_contractors').upsert({
      project_id: activeId,
      contractor_id: addCtxId,
      payout_type: addCtxPayoutType,
      percentage: addCtxPayoutType === 'percentage' ? parseFloat(addCtxPct) : 0,
      fixed_amount: addCtxPayoutType === 'fixed' ? parseFloat(addCtxFixed) : null,
    }, { onConflict: 'project_id,contractor_id' });
    setCtxSaving(false);
    if (error) { setCtxAddError(error.message); return; }
    setAddCtxId(''); setAddCtxPct(''); setAddCtxFixed('');
    fetchAll();
  };

  const removeContractor = async (id: number) => {
    await supabase.from('hub_project_contractors').delete().eq('id', id);
    fetchAll();
  };

  const logContractorPayout = async (pcId: number, cut: number, contractorName: string, contractorEmail: string | null, project: Project) => {
    const form = ctxPayForm[pcId];
    if (!form?.amount) return;
    setCtxPaySaving(p => ({ ...p, [pcId]: true }));
    setCtxPayError(p => ({ ...p, [pcId]: '' }));

    let receipt_url: string | null = null;
    if (form.receipt) {
      const ext = form.receipt.name.split('.').pop();
      const path = `payouts/${pcId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('payout-receipts').upload(path, form.receipt, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('payout-receipts').getPublicUrl(path);
        receipt_url = urlData.publicUrl;
      }
    }

    const amount = parseFloat(form.amount);
    const paid_at = form.date || new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('hub_project_contractor_payouts').insert({
      project_contractor_id: pcId,
      amount,
      paid_at,
      notes: form.notes || null,
      receipt_url,
    });
    setCtxPaySaving(p => ({ ...p, [pcId]: false }));
    if (error) { setCtxPayError(p => ({ ...p, [pcId]: error.message })); return; }
    setCtxPayForm(p => ({ ...p, [pcId]: { amount: '', date: new Date().toISOString().slice(0, 10), notes: '', receipt: null, notify: true } }));
    logAudit({ actor_id: hubUser?.id, actor_name: hubUser?.full_name, action: 'approve', entity_type: 'project_payout', description: `Logged payout of ₱${form.amount} to ${contractorName}` });

    // auto-mark paid if fully paid
    const pc = projects.flatMap(p => p.hub_project_contractors).find(x => x.id === pcId);
    const prev = pc?.hub_project_contractor_payouts.reduce((s, x) => s + x.amount, 0) ?? 0;
    const newTotal = prev + amount;
    if (pc && newTotal >= cut) {
      await supabase.from('hub_project_contractors').update({ payout_status: 'paid', paid_at: new Date().toISOString() }).eq('id', pcId);
    }

    // Send email notification
    if (form.notify && contractorEmail) {
      supabase.functions.invoke('notify-contractor-payment', {
        body: {
          to: contractorEmail,
          contractor_name: contractorName,
          project_name: project.project_name,
          client_name: project.client_name,
          amount,
          paid_at,
          notes: form.notes || null,
          receipt_url,
          total_paid: newTotal,
          total_cut: cut,
          is_fully_paid: newTotal >= cut,
        },
      });
    }

    fetchAll();
  };

  const deleteContractorPayout = async (payoutId: number) => {
    await supabase.from('hub_project_contractor_payouts').delete().eq('id', payoutId);
    fetchAll();
  };

  const sendInvoice = async (project: Project) => {
    setInvoiceSending(true);
    setInvoiceMsg(null);
    const invNum = invoiceForm.invoice_number.trim() || String(project.id).padStart(4, '0');
    const { data, error } = await supabase.functions.invoke('send-invoice', {
      body: {
        to: invoiceForm.email.trim(),
        cc: invoiceForm.cc.trim() || undefined,
        subject: invoiceForm.subject.trim() || undefined,
        client_name: project.client_name,
        project_name: project.project_name,
        service: project.service,
        contract_price: project.contract_price,
        start_date: project.start_date,
        deadline: invoiceForm.due_date || project.deadline,
        payments: invoiceShowPayments ? project.hub_project_payments : [],
        show_payments: invoiceShowPayments,
        line_items: invoiceLineItems.filter(i => i.description && i.amount),
        notes: project.notes,
        message: invoiceForm.message.trim() || undefined,
        invoice_number: invNum,
      },
    });
    setInvoiceSending(false);
    if (error || data?.error) {
      setInvoiceMsg({ ok: false, text: data?.error ?? error?.message ?? 'Failed to send' });
    } else {
      setInvoiceMsg({ ok: true, text: 'Invoice sent!' });
      if (invoiceForm.email.trim() !== project.contact_email) {
        await supabase.from('hub_projects').update({ contact_email: invoiceForm.email.trim() }).eq('id', project.id);
        fetchAll();
      }
    }
  };

  const printInvoice = (project: Project, overrides?: { due_date?: string; invoice_number?: string; message?: string; line_items?: { description: string; amount: string }[]; show_payments?: boolean }) => {
    const d = derived(project);
    const fmt2 = (n: number) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const balance = project.contract_price - d.totalPaid;
    const logoUrl = 'https://www.hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png';
    const invNum = overrides?.invoice_number || String(project.id).padStart(4,'0');
    const dueDate = overrides?.due_date || project.deadline;
    const customMsg = overrides?.message || '';
    const lineItems = overrides?.line_items ?? [{ description: project.service ?? project.project_name, amount: String(project.contract_price) }];
    const showPayments = overrides?.show_payments ?? true;
    const lineItemsTotal = lineItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    const paymentRows = project.hub_project_payments.map(p => `
      <tr>
        <td>${new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td>${p.notes ?? 'Payment received'}</td>
        <td class="amount paid">+ ${fmt2(p.amount)}</td>
      </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Invoice #${invNum} — ${project.project_name}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;background:#fff;padding:48px}
  .header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:36px;padding-bottom:24px;border-bottom:3px solid #FF6B35}
  .header img{height:36px}
  .header-right{text-align:right}
  .header-right h1{font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em}
  .header-right .inv{font-size:22px;font-weight:800;color:#111827}
  .meta{display:flex;justify-content:space-between;margin-bottom:28px}
  .meta .to p:first-child{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
  .meta .to p:last-child{font-size:17px;font-weight:700}
  .meta .dates{text-align:right;font-size:13px;color:#6b7280;line-height:1.8}
  .project-box{background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:28px}
  .project-box .name{font-size:14px;font-weight:600}
  .project-box .sub{font-size:12px;color:#6b7280;margin-top:3px}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  th{background:#111827;color:#fff;padding:10px 14px;font-size:11px;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:.04em}
  td{padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px}
  td.amount{text-align:right;font-weight:600}
  td.paid{color:#059669}
  .totals{margin-left:auto;width:280px}
  .totals tr td{padding:6px 0;font-size:13px;color:#6b7280;border:none}
  .totals tr td:last-child{text-align:right}
  .totals .balance td{font-size:16px;font-weight:800;color:#111827;border-top:2px solid #e5e7eb;padding-top:10px}
  .totals .balance td:last-child{color:${balance <= 0 ? '#059669' : '#FF6B35'}}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af}
  .pay-via{margin-top:32px}
  .pay-via h3{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:14px}
  .qr-grid{display:flex;gap:12px}
  .qr-item{flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 10px;text-align:center}
  .qr-item img{width:100px;height:100px;object-fit:contain;border-radius:6px;display:block;margin:0 auto}
  .qr-item p{margin:8px 0 0;font-size:12px;font-weight:700;color:#111827}
  @media print{body{padding:24px}}
</style></head><body>
<div class="header">
  <img src="${logoUrl}" onerror="this.style.display='none'" />
  <div class="header-right"><h1>Invoice</h1><div class="inv">#${invNum}</div></div>
</div>
${customMsg ? `<div style="background:#fffbf5;border:1px solid #fed7aa;border-radius:10px;padding:14px 16px;margin-bottom:24px;font-size:13px;color:#92400e">${customMsg}</div>` : ''}
<div class="meta">
  <div class="to"><p>Billed to</p><p>${project.client_name}</p></div>
  <div class="dates">
    <div>Date: <strong>${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</strong></div>
    ${dueDate ? `<div>Due: <strong>${new Date(dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</strong></div>` : ''}
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
<table class="totals">
  <tr><td>Total contract</td><td>${fmt2(lineItemsTotal)}</td></tr>
  ${showPayments ? `<tr><td>Total paid</td><td style="color:#059669">− ${fmt2(d.totalPaid)}</td></tr>` : ''}
  <tr class="balance"><td>Balance due</td><td>${(showPayments ? balance : lineItemsTotal) <= 0 ? 'Paid in full' : fmt2(showPayments ? balance : lineItemsTotal)}</td></tr>
</table>
${project.notes ? `<p style="font-size:12px;color:#6b7280;font-style:italic;margin-top:16px">${project.notes}</p>` : ''}
${balance > 0 ? `
<div class="pay-via">
  <h3>Pay via</h3>
  <div class="qr-grid">
    <div class="qr-item"><img src="https://www.hunacreatives.com/images/qr-gcash.jpg" alt="GCash" /><p>GCash</p></div>
    <div class="qr-item"><img src="https://www.hunacreatives.com/images/qr-bdo.jpg" alt="BDO" /><p>BDO InstaPay</p></div>
    <div class="qr-item"><img src="https://www.hunacreatives.com/images/qr-gotyme.jpg" alt="GoTyme" /><p>GoTyme</p></div>
  </div>
</div>` : ''}
<div class="footer">Huna Creatives · billing@hunacreatives.com</div>
<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script>
</body></html>`);
    win.document.close();
  };

  const filtered = projects.filter(p =>
    !search || p.client_name.toLowerCase().includes(search.toLowerCase()) || p.project_name.toLowerCase().includes(search.toLowerCase())
  );

  // Group by service
  const grouped = filtered.reduce<Record<string, Project[]>>((acc, p) => {
    const key = p.service || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const deadlineStatus = (deadline: string | null, status: string) => {
    if (!deadline || status === 'completed' || status === 'cancelled') return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(deadline); due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, cls: 'bg-red-100 text-red-600' };
    if (diff <= 7) return { label: `${diff}d left`, cls: 'bg-amber-100 text-amber-600' };
    return null;
  };

  const summaryTotals = (() => {
    let contractValue = 0, costs = 0, collected = 0;
    for (const p of projects) {
      contractValue += p.contract_price;
      costs += p.hub_project_costs.reduce((s, x) => s + x.amount, 0);
      collected += p.hub_project_payments.reduce((s, x) => s + x.amount, 0);
    }
    const netProfit = contractValue - costs;
    const collectionPct = contractValue > 0 ? Math.min((collected / contractValue) * 100, 100) : 0;
    return { contractValue, costs, netProfit, collected, collectionPct };
  })();

  return (
    <AdminLayout title="Projects">
      <div className="space-y-4">

      {/* Summary strip */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Contract Value', value: fmt(summaryTotals.contractValue), icon: 'ri-file-list-3-line', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-100' },
            { label: 'Operational Costs', value: fmt(summaryTotals.costs), icon: 'ri-subtract-line', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
            { label: 'Net Profit', value: fmt(summaryTotals.netProfit), icon: 'ri-line-chart-line', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
            { label: 'Collected from Clients', value: `${fmt(summaryTotals.collected)} (${summaryTotals.collectionPct.toFixed(0)}%)`, icon: 'ri-money-dollar-circle-line', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          ].map(card => (
            <div key={card.label} className={`bg-white border ${card.border} rounded-xl p-4`}>
              <div className={`w-7 h-7 ${card.bg} rounded-lg flex items-center justify-center mb-2`}>
                <i className={`${card.icon} ${card.color} text-sm`}></i>
              </div>
              <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-5 md:h-[calc(100vh-220px)]">

        {/* Left: project list */}
        <div className={`w-full md:w-80 flex-shrink-0 flex flex-col gap-3 ${activeId ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
            </div>
            <button onClick={() => { setEditingProject(null); setForm(emptyForm); setShowForm(true); }}
              className="flex items-center gap-1 px-3 py-2 bg-[#111827] text-white text-xs rounded-lg hover:bg-gray-800 cursor-pointer whitespace-nowrap">
              <i className="ri-add-line"></i> New
            </button>
          </div>

          <div className="md:flex-1 md:overflow-y-auto space-y-4 pr-1">
            {loading ? (
              <div className="flex justify-center py-8"><i className="ri-loader-4-line animate-spin text-gray-300 text-xl"></i></div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No projects yet.</p>
            ) : Object.entries(grouped).map(([service, items]) => {
              const sc = getServiceCfg(service);
              return (
              <div key={service}>
                <div className="flex items-center gap-1.5 px-1 mb-1.5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`}></div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{service}</p>
                </div>
                <div className="space-y-2">
                  {items.map(p => {
                    const d = derived(p);
                    const cfg = statusCfg[p.status] ?? statusCfg.ongoing;
                    const dl = deadlineStatus(p.deadline, p.status);
                    const sc2 = getServiceCfg(p.service);
                    return (
                      <button key={p.id} onClick={() => setActiveId(p.id)}
                        className={`w-full text-left p-3.5 rounded-xl border-l-4 border border-gray-100 transition-all cursor-pointer ${sc2.border} ${activeId === p.id ? 'bg-orange-50 border-r-[#FF6B35] border-t-[#FF6B35] border-b-[#FF6B35]' : 'bg-white hover:border-r-gray-200 hover:border-t-gray-200 hover:border-b-gray-200'}`}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#111827] leading-tight truncate">{p.project_name}</p>
                            <p className="text-[11px] text-gray-400">{p.client_name}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
                            {dl && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${dl.cls}`}>{dl.label}</span>}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                            <span>{fmt(d.totalPaid)} collected</span>
                            <span>{fmtPct(d.paidPct)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${d.paidPct >= 100 ? 'bg-emerald-400' : dl?.cls.includes('red') ? 'bg-red-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(d.paidPct, 100)}%` }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* Right: project detail */}
        {activeProject ? (() => {
          const d = derived(activeProject);
          const cfg = statusCfg[activeProject.status] ?? statusCfg.ongoing;
          const unassigned = contractors.filter(c => !activeProject.hub_project_contractors.some(pc => pc.hub_users?.id === c.id));

          return (
            <div className="flex-1 overflow-y-auto space-y-4 min-w-0">
              {/* Mobile back button */}
              <button onClick={() => setActiveId(null)} className="md:hidden flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 cursor-pointer">
                <i className="ri-arrow-left-line"></i> All Projects
              </button>
              {/* Header */}
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-[#111827] text-lg">{activeProject.project_name}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
                      {activeProject.service && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getServiceCfg(activeProject.service).badge}`}>{activeProject.service}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{activeProject.client_name}</p>
                    {(activeProject.start_date || activeProject.deadline) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {activeProject.start_date && `Started ${new Date(activeProject.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                        {activeProject.start_date && activeProject.deadline && ' · '}
                        {activeProject.deadline && `Due ${new Date(activeProject.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => printInvoice(activeProject)}
                      className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer flex items-center gap-1">
                      <i className="ri-printer-line"></i> Print
                    </button>
                    <button onClick={() => { setInvoiceModal(activeProject); setInvoiceForm({ email: activeProject.contact_email ?? '', cc: '', subject: `Invoice #${String(activeProject.id).padStart(4,'0')} — ${activeProject.project_name}`, due_date: activeProject.deadline ?? '', invoice_number: String(activeProject.id).padStart(4,'0'), message: '' }); setInvoiceLineItems([{ description: activeProject.service ?? activeProject.project_name, amount: String(activeProject.contract_price) }]); setInvoiceShowPayments(true); setInvoiceMsg(null); }}
                      className="text-xs px-2.5 py-1.5 bg-[#111827] text-white rounded-lg hover:bg-gray-700 cursor-pointer flex items-center gap-1">
                      <i className="ri-mail-send-line"></i> Send Invoice
                    </button>
                    <button onClick={() => { setEditingProject(activeProject); setForm({ client_name: activeProject.client_name, project_name: activeProject.project_name, service: activeProject.service || '', contract_price: String(activeProject.contract_price), status: activeProject.status, start_date: activeProject.start_date || '', deadline: activeProject.deadline || '', notes: activeProject.notes || '', contact_email: activeProject.contact_email || '' }); setShowForm(true); }}
                      className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer flex items-center gap-1">
                      <i className="ri-edit-line"></i> Edit
                    </button>
                  </div>
                </div>

                {/* Financials */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {[
                    { label: 'Contract Price', value: fmt(activeProject.contract_price), sub: null, color: 'text-gray-900' },
                    { label: 'Operational Costs', value: fmt(d.totalCosts), sub: null, color: 'text-rose-600' },
                    { label: 'Net Profit', value: fmt(d.netProfit), sub: 'after costs', color: 'text-emerald-600' },
                    { label: 'Balance Due', value: fmt(d.balance), sub: `${fmtPct(d.paidPct)} collected`, color: d.balance > 0 ? 'text-amber-600' : 'text-emerald-600' },
                  ].map(card => (
                    <div key={card.label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{card.label}</p>
                      <p className={`text-base font-bold mt-0.5 ${card.color}`}>{card.value}</p>
                      {card.sub && <p className="text-[10px] text-gray-400 mt-0.5">{card.sub}</p>}
                    </div>
                  ))}
                </div>

                {/* Collection progress */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Client payments</span>
                    <span>{fmt(d.totalPaid)} of {fmt(activeProject.contract_price)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${Math.min(d.paidPct, 100)}%` }} />
                  </div>
                </div>
                {activeProject.notes && <p className="text-xs text-gray-400 italic mt-3">{activeProject.notes}</p>}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Client Payments */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client Payments</p>
                  {activeProject.hub_project_payments.length === 0 ? (
                    <p className="text-xs text-gray-400">No payments logged yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...activeProject.hub_project_payments].sort((a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime()).map((pp) => (
                        <div key={pp.id} className="bg-gray-50 rounded-lg overflow-hidden">
                          {editingPaymentId === pp.id ? (
                            <div className="p-2.5 space-y-2">
                              <div className="flex gap-2">
                                <input type="number" value={editPayForm.amount} onChange={e => setEditPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="Amount"
                                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                                <input type="date" value={editPayForm.date} onChange={e => setEditPayForm(f => ({ ...f, date: e.target.value }))}
                                  className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                              </div>
                              <input value={editPayForm.notes} onChange={e => setEditPayForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)"
                                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-white transition-colors flex-1">
                                  <i className="ri-image-add-line text-gray-400 text-sm"></i>
                                  <span className="text-xs text-gray-400 truncate">{editPayForm.receipt ? editPayForm.receipt.name : editPayForm.existingReceiptUrl ? 'Replace receipt' : 'Attach proof of payment'}</span>
                                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setEditPayForm(f => ({ ...f, receipt: e.target.files?.[0] ?? null }))} />
                                </label>
                                {editPayForm.existingReceiptUrl && !editPayForm.receipt && (
                                  <button onClick={() => setLightboxUrl(editPayForm.existingReceiptUrl)} className="cursor-pointer flex-shrink-0">
                                    <img src={editPayForm.existingReceiptUrl} alt="receipt" className="h-8 w-12 object-cover rounded border border-gray-200 hover:opacity-80" />
                                  </button>
                                )}
                                {(editPayForm.receipt || editPayForm.existingReceiptUrl) && (
                                  <button onClick={() => setEditPayForm(f => ({ ...f, receipt: null, existingReceiptUrl: null }))} className="text-gray-300 hover:text-rose-400 cursor-pointer text-xs flex-shrink-0">
                                    <i className="ri-close-line"></i>
                                  </button>
                                )}
                              </div>
                              {editPayError && <p className="text-xs text-red-500">{editPayError}</p>}
                              <div className="flex gap-2">
                                <button onClick={() => setEditingPaymentId(null)} className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-white cursor-pointer">Cancel</button>
                                <button onClick={updatePayment} disabled={!editPayForm.amount || editPaySaving}
                                  className="flex-1 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 cursor-pointer disabled:opacity-40">
                                  {editPaySaving ? '...' : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2 p-2.5">
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-semibold text-emerald-600">{fmt(pp.amount)}</span>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[11px] text-gray-400">
                                    <i className="ri-calendar-line text-[10px] mr-0.5"></i>
                                    {pp.paid_at ? new Date(pp.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                  </span>
                                  {pp.notes && (
                                    <span className="text-[11px] text-gray-500">
                                      · <i className="ri-file-text-line text-[10px] mr-0.5"></i>{pp.notes}
                                    </span>
                                  )}
                                </div>
                                {pp.receipt_url && (
                                  <button onClick={() => setLightboxUrl(pp.receipt_url)} className="mt-1.5 cursor-pointer">
                                    <img src={pp.receipt_url} alt="receipt" className="h-8 w-14 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity" />
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button onClick={() => { setEditingPaymentId(pp.id); setEditPayForm({ amount: String(pp.amount), date: pp.paid_at, notes: pp.notes ?? '', receipt: null, existingReceiptUrl: pp.receipt_url }); setEditPayError(''); }}
                                  className="text-gray-300 hover:text-gray-600 cursor-pointer mt-0.5"><i className="ri-edit-line text-xs"></i></button>
                                <button onClick={() => deletePayment(pp.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer mt-0.5"><i className="ri-delete-bin-line text-xs"></i></button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex gap-2">
                      <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Amount"
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                      <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                        className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Notes (optional)"
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                      <button onClick={logPayment} disabled={!payAmount || paySaving}
                        className="px-3 py-1.5 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                        {paySaving ? '...' : '+ Log'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <i className="ri-image-add-line text-gray-400 text-sm"></i>
                        <span className="text-xs text-gray-400">{payReceipt ? payReceipt.name : 'Attach receipt (optional)'}</span>
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setPayReceipt(e.target.files?.[0] ?? null)} />
                      </label>
                      {payReceipt && (
                        <button onClick={() => setPayReceipt(null)} className="text-gray-300 hover:text-rose-400 cursor-pointer text-xs">
                          <i className="ri-close-line"></i>
                        </button>
                      )}
                    </div>
                    {payError && <p className="text-xs text-red-500">{payError}</p>}
                  </div>
                </div>

                {/* Operational Costs */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Operational Costs</p>
                  {activeProject.hub_project_costs.length === 0 ? (
                    <p className="text-xs text-gray-400">No costs logged yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {activeProject.hub_project_costs.map(cc => (
                        <div key={cc.id} className="flex items-center justify-between gap-2 text-sm">
                          <div>
                            <span className="text-gray-700 text-xs">{cc.label}</span>
                            <span className="font-medium text-rose-500 ml-2">{fmt(cc.amount)}</span>
                            <span className="text-xs text-gray-400 ml-1">· {new Date(cc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          <button onClick={() => deleteCost(cc.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer"><i className="ri-delete-bin-line text-xs"></i></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex gap-2">
                      <input value={costLabel} onChange={e => setCostLabel(e.target.value)} placeholder="e.g. Hosting, Domain"
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                      <input type="number" value={costAmount} onChange={e => setCostAmount(e.target.value)} placeholder="Amount"
                        className="w-24 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <input type="date" value={costDate} onChange={e => setCostDate(e.target.value)}
                        className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                      <button onClick={logCost} disabled={!costLabel.trim() || !costAmount || costSaving}
                        className="flex-1 px-3 py-1.5 bg-rose-500 text-white text-xs rounded-lg hover:bg-rose-600 cursor-pointer disabled:opacity-40">
                        {costSaving ? '...' : '+ Log Cost'}
                      </button>
                    </div>
                    {costError && <p className="text-xs text-red-500">{costError}</p>}
                  </div>
                </div>
              </div>

              {/* Team & Payouts */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Team & Payouts</p>
                <p className="text-[11px] text-gray-400">Based on net profit of <strong className="text-emerald-600">{fmt(d.netProfit)}</strong></p>

                {activeProject.hub_project_contractors.length === 0 ? (
                  <p className="text-xs text-gray-400">No contractors assigned to this project yet.</p>
                ) : (
                  <div className="space-y-3">
                    {activeProject.hub_project_contractors.map(pc => {
                      const u = pc.hub_users;
                      if (!u) return null;
                      const isFixed = pc.payout_type === 'fixed';
                      const cut = isFixed ? (pc.fixed_amount ?? 0) : d.netProfit * (pc.percentage / 100);
                      const totalPaidOut = pc.hub_project_contractor_payouts.reduce((s, x) => s + x.amount, 0);
                      const paidPct = cut > 0 ? Math.min((totalPaidOut / cut) * 100, 100) : 0;
                      const isFullyPaid = totalPaidOut >= cut && cut > 0;
                      const pf = ctxPayForm[pc.id] ?? { amount: '', date: new Date().toISOString().slice(0, 10), notes: '', receipt: null, notify: true };
                      const setPf = (patch: Partial<typeof pf>) => setCtxPayForm(prev => ({ ...prev, [pc.id]: { ...pf, ...patch } }));
                      return (
                        <div key={pc.id} className="border border-gray-100 rounded-xl overflow-hidden">
                          {/* Contractor header */}
                          <div className="flex items-center gap-3 p-3 bg-gray-50">
                            <Avatar name={u.full_name} url={u.avatar_url} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-gray-800">{u.full_name}</p>
                                {isFixed
                                  ? <span className="text-xs text-gray-400">Fixed fee → <strong className="text-[#111827]">{fmt(cut)}</strong></span>
                                  : <span className="text-xs text-gray-400">{pc.percentage}% → <strong className="text-[#111827]">{fmt(cut)}</strong></span>
                                }
                                {isFullyPaid
                                  ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Paid in full</span>
                                  : totalPaidOut > 0
                                    ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{fmt(totalPaidOut)} paid</span>
                                    : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Unpaid</span>
                                }
                              </div>
                              <div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden w-full">
                                <div className={`h-full rounded-full transition-all ${isFullyPaid ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${paidPct}%` }} />
                              </div>
                            </div>
                            <button onClick={() => removeContractor(pc.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer flex-shrink-0"><i className="ri-delete-bin-line text-xs"></i></button>
                          </div>

                          {/* Payout history */}
                          {pc.hub_project_contractor_payouts.length > 0 && (
                            <div className="px-3 py-2 space-y-1.5 border-t border-gray-100">
                              {pc.hub_project_contractor_payouts.map(pp => (
                                <div key={pp.id} className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2 text-gray-600 flex-wrap">
                                    <i className="ri-arrow-right-line text-gray-300 text-[10px]"></i>
                                    <span className="font-semibold text-emerald-600">{fmt(pp.amount)}</span>
                                    <span className="text-gray-400">{new Date(pp.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    {pp.notes && <span className="text-gray-400">· {pp.notes}</span>}
                                    {pp.receipt_url && (
                                      <button onClick={() => setLightboxUrl(pp.receipt_url)} className="cursor-pointer flex-shrink-0">
                                        <img src={pp.receipt_url} alt="receipt" className="h-6 w-9 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity" />
                                      </button>
                                    )}
                                  </div>
                                  <button onClick={() => deleteContractorPayout(pp.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer"><i className="ri-delete-bin-line text-[10px]"></i></button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Log payout form */}
                          {!isFullyPaid && (
                            <div className="px-3 py-2.5 border-t border-gray-100 bg-white space-y-2">
                              <div className="flex gap-2">
                                <div className="flex-1 flex gap-1">
                                  <input type="number" value={pf.amount} onChange={e => setPf({ amount: e.target.value })} placeholder={`Amount (of ${fmt(cut)})`}
                                    className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                                  <button
                                    type="button"
                                    onClick={() => setPf({ amount: String((cut - totalPaidOut).toFixed(2)) })}
                                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 cursor-pointer whitespace-nowrap"
                                  >
                                    Remaining
                                  </button>
                                </div>
                                <input type="date" value={pf.date} onChange={e => setPf({ date: e.target.value })}
                                  className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                              </div>
                              <div className="flex gap-2">
                                <input value={pf.notes} onChange={e => setPf({ notes: e.target.value })} placeholder="Notes (optional)"
                                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                                <button onClick={() => logContractorPayout(pc.id, cut, u.full_name, u.email, activeProject)} disabled={!pf.amount || ctxPaySaving[pc.id]}
                                  className="px-3 py-1.5 bg-[#111827] text-white text-xs rounded-lg hover:bg-gray-800 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                                  {ctxPaySaving[pc.id] ? '...' : '+ Payout'}
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                  <i className="ri-image-add-line text-gray-400 text-sm"></i>
                                  <span className="text-xs text-gray-400">{pf.receipt ? pf.receipt.name : 'Attach receipt (optional)'}</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={e => setPf({ receipt: e.target.files?.[0] ?? null })} />
                                </label>
                                {pf.receipt && (
                                  <button onClick={() => setPf({ receipt: null })} className="text-gray-300 hover:text-rose-400 cursor-pointer text-xs">
                                    <i className="ri-close-line"></i>
                                  </button>
                                )}
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                                <input type="checkbox" checked={pf.notify} onChange={e => setPf({ notify: e.target.checked })}
                                  className="w-3.5 h-3.5 accent-[#FF6B35]" />
                                <span className="text-xs text-gray-400">
                                  Notify {u.email ? u.full_name.split(' ')[0] : 'contractor'} via email
                                  {!u.email && <span className="text-amber-500 ml-1">(no email on file)</span>}
                                </span>
                              </label>
                              {ctxPayError[pc.id] && <p className="text-xs text-red-500">{ctxPayError[pc.id]}</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {unassigned.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex gap-2">
                      <select value={addCtxId} onChange={e => {
                        setAddCtxId(e.target.value);
                        const c = contractors.find(x => x.id === e.target.value);
                        if (c?.project_percentage) setAddCtxPct(String(c.project_percentage));
                      }}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white">
                        <option value="">Add contractor...</option>
                        {unassigned.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.department ? ` — ${c.department}` : ''}</option>)}
                      </select>
                      {/* Payout type toggle */}
                      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs flex-shrink-0">
                        <button onClick={() => setAddCtxPayoutType('percentage')}
                          className={`px-2.5 py-1.5 cursor-pointer transition-colors ${addCtxPayoutType === 'percentage' ? 'bg-[#111827] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                          %
                        </button>
                        <button onClick={() => setAddCtxPayoutType('fixed')}
                          className={`px-2.5 py-1.5 cursor-pointer transition-colors border-l border-gray-200 ${addCtxPayoutType === 'fixed' ? 'bg-[#111827] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                          ₱
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {addCtxPayoutType === 'percentage' ? (
                        <div className="relative flex-1">
                          <input type="number" value={addCtxPct} onChange={e => setAddCtxPct(e.target.value)} placeholder="%" min="1" max="100"
                            className="w-full px-2.5 py-1.5 pr-6 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                      ) : (
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₱</span>
                          <input type="number" value={addCtxFixed} onChange={e => setAddCtxFixed(e.target.value)} placeholder="Fixed fee amount"
                            className="w-full pl-6 pr-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                        </div>
                      )}
                      <button onClick={addContractor} disabled={!addCtxId || (addCtxPayoutType === 'percentage' ? !addCtxPct : !addCtxFixed) || ctxSaving}
                        className="px-3 py-1.5 bg-[#111827] text-white text-xs rounded-lg hover:bg-gray-800 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                        {ctxSaving ? '...' : 'Add'}
                      </button>
                    </div>
                    {ctxAddError && <p className="text-xs text-red-500">{ctxAddError}</p>}
                  </div>
                )}
              </div>
            </div>
          );
        })() : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                <i className="ri-folder-open-line text-2xl text-gray-300"></i>
              </div>
              <p className="text-sm">Select a project to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Project form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-[#111827]">{editingProject ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={() => { setShowForm(false); setEditingProject(null); }} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center"><i className="ri-close-line text-lg"></i></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Client Name *</label>
                  <input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="e.g. FS Architects"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Project Name *</label>
                  <input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} placeholder="e.g. fsarchitects.ph"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Service</label>
                  <select value={SERVICES.includes(form.service) ? form.service : 'Other'}
                    onChange={e => setForm({ ...form, service: e.target.value === 'Other' ? '' : e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {!SERVICES.slice(0, -1).includes(form.service) && (
                    <input value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}
                      placeholder="Describe the service..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] mt-1.5" />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Contract Price (PHP) *</label>
                  <input type="number" value={form.contract_price} onChange={e => setForm({ ...form, contract_price: e.target.value })} placeholder="0.00"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Deadline</label>
                  <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any notes..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Client Contact Email <span className="text-gray-400 font-normal">(for invoices)</span></label>
                <input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="client@email.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
              </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => { setShowForm(false); setEditingProject(null); }} className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button onClick={saveProject} disabled={formSaving}
                className="flex-1 py-2.5 text-sm bg-[#FF6B35] text-white rounded-lg hover:bg-[#e55a27] disabled:opacity-40 cursor-pointer">
                {formSaving ? 'Saving...' : editingProject ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Send Invoice modal */}
      {invoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setInvoiceModal(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#111827]">Send Invoice</h3>
                <p className="text-xs text-gray-400 mt-0.5">{invoiceModal.project_name} · {invoiceModal.client_name}</p>
              </div>
              <button onClick={() => setInvoiceModal(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><i className="ri-close-line text-lg"></i></button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              {/* Recipient */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Send to <span className="text-red-400">*</span></label>
                  <input type="email" value={invoiceForm.email} onChange={e => setIf({ email: e.target.value })} placeholder="client@email.com"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" autoFocus />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">CC <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="email" value={invoiceForm.cc} onChange={e => setIf({ cc: e.target.value })} placeholder="cc@email.com"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
              </div>
              {/* Subject */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Subject</label>
                <input type="text" value={invoiceForm.subject} onChange={e => setIf({ subject: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
              </div>
              {/* Invoice # and Due date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Invoice #</label>
                  <input type="text" value={invoiceForm.invoice_number} onChange={e => setIf({ invoice_number: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Due date</label>
                  <input type="date" value={invoiceForm.due_date} onChange={e => setIf({ due_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
              </div>
              {/* Line items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600">Invoice Line Items</label>
                  <button type="button" onClick={() => setInvoiceLineItems(p => [...p, { description: '', amount: '' }])}
                    className="text-xs text-[#FF6B35] hover:text-[#e55a27] cursor-pointer flex items-center gap-1">
                    <i className="ri-add-line"></i> Add line
                  </button>
                </div>
                <div className="space-y-1.5">
                  {invoiceLineItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input value={item.description} onChange={e => setInvoiceLineItems(p => p.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                        placeholder="e.g. Website Design — Phase 1"
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                      <input type="number" value={item.amount} onChange={e => setInvoiceLineItems(p => p.map((x, i) => i === idx ? { ...x, amount: e.target.value } : x))}
                        placeholder="Amount"
                        className="w-28 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                      {invoiceLineItems.length > 1 && (
                        <button type="button" onClick={() => setInvoiceLineItems(p => p.filter((_, i) => i !== idx))}
                          className="text-gray-300 hover:text-rose-400 cursor-pointer flex-shrink-0">
                          <i className="ri-close-line text-sm"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Show payments toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={invoiceShowPayments} onChange={e => setInvoiceShowPayments(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#FF6B35]" />
                <span className="text-xs text-gray-600">Include payment history on invoice</span>
              </label>

              {/* Message */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Message <span className="text-gray-400 font-normal">(optional note to client)</span></label>
                <textarea value={invoiceForm.message} onChange={e => setIf({ message: e.target.value })} rows={3}
                  placeholder="e.g. Thank you for your continued trust in Huna Creatives. Please find your invoice below."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none" />
              </div>
              {/* Balance summary */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between"><span>Contract</span><span className="font-medium text-gray-700">{fmt(invoiceModal.contract_price)}</span></div>
                <div className="flex justify-between"><span>Paid</span><span className="font-medium text-emerald-600">{fmt(invoiceModal.hub_project_payments.reduce((s,p)=>s+p.amount,0))}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                  <span className="font-semibold text-gray-700">Balance</span>
                  <span className="font-bold text-[#FF6B35]">{fmt(invoiceModal.contract_price - invoiceModal.hub_project_payments.reduce((s,p)=>s+p.amount,0))}</span>
                </div>
              </div>
              {invoiceMsg && (
                <p className={`text-xs font-medium ${invoiceMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                  {invoiceMsg.ok ? <><i className="ri-check-line mr-1"></i>{invoiceMsg.text}</> : invoiceMsg.text}
                </p>
              )}
            </div>
            <div className="px-5 pb-5 space-y-2">
              <button
                onClick={() => printInvoice(invoiceModal, { due_date: invoiceForm.due_date, invoice_number: invoiceForm.invoice_number, message: invoiceForm.message, line_items: invoiceLineItems.filter(i => i.description && i.amount), show_payments: invoiceShowPayments })}
                className="w-full py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <i className="ri-printer-line"></i> Preview / Print
              </button>
              <div className="flex gap-2">
                <button onClick={() => setInvoiceModal(null)} className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">Cancel</button>
                <button
                  onClick={() => sendInvoice(invoiceModal)}
                  disabled={invoiceSending || !invoiceForm.email.trim()}
                  className="flex-1 py-2 text-sm bg-[#FF6B35] text-white rounded-lg hover:bg-[#e55a27] disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {invoiceSending ? <><i className="ri-loader-4-line animate-spin"></i> Sending…</> : <><i className="ri-mail-send-line"></i> Send Invoice</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-3xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={lightboxUrl} alt="Receipt" className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" />
            <button onClick={() => setLightboxUrl(null)} className="absolute top-2 right-2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black cursor-pointer">
              <i className="ri-close-line text-sm"></i>
            </button>
            <a href={lightboxUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 text-white text-xs rounded-lg hover:bg-black">
              <i className="ri-external-link-line text-xs"></i> Open full size
            </a>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

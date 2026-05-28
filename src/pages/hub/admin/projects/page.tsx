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
interface PaymentReminder { id: number; send_date: string; amount_due: number | null; notes: string | null; status: string; sent_at: string | null; }
type InvoiceSendMode = 'now' | 'schedule';

interface Project {
  id: number; client_name: string; project_name: string; service: string | null;
  contract_price: number; status: string; start_date: string | null; deadline: string | null; notes: string | null; contact_email: string | null;
  hub_project_payments: { id: number; amount: number; paid_at: string; notes: string | null; receipt_url: string | null }[];
  hub_project_costs: { id: number; label: string; amount: number; date: string }[];
  hub_payment_reminders: PaymentReminder[];
  hub_project_contractors: {
    id: number; percentage: number; payout_type: string; fixed_amount: number | null;
    payout_status: string; paid_at: string | null; notes: string | null;
    project_role?: string | null;
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'paused' | 'completed' | 'cancelled'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
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

  // Send receipt
  const [sendReceiptModal, setSendReceiptModal] = useState<{ payment: Project['hub_project_payments'][0]; project: Project } | null>(null);
  const [sendReceiptEmail, setSendReceiptEmail] = useState('');
  const [sendReceiptCc, setSendReceiptCc] = useState('');
  const [sendReceiptSending, setSendReceiptSending] = useState(false);
  const [sendReceiptMsg, setSendReceiptMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Contractor assignment
  const [addCtxId, setAddCtxId] = useState('');
  const [addCtxRole, setAddCtxRole] = useState('');
  const [ctxSaving, setCtxSaving] = useState(false);
  const [ctxAddError, setCtxAddError] = useState('');
  const [ctxConfigSaving, setCtxConfigSaving] = useState<Record<number, boolean>>({});
  const [ctxConfigError, setCtxConfigError] = useState<Record<number, string>>({});
  const [ctxConfigForm, setCtxConfigForm] = useState<Record<number, { payoutType: 'percentage' | 'fixed'; percentage: string; fixedAmount: string }>>({});

  // Staged contractor payouts: keyed by hub_project_contractors.id
  const [ctxPayForm, setCtxPayForm] = useState<Record<number, { amount: string; date: string; notes: string; receipt: File | null; notify: boolean }>>({});
  const [ctxPaySaving, setCtxPaySaving] = useState<Record<number, boolean>>({});
  const [ctxPayError, setCtxPayError] = useState<Record<number, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Invoice
  const [invoiceModal, setInvoiceModal] = useState<Project | null>(null);
  const emptyInvoiceForm = {
    email: '',
    cc: '',
    subject: '',
    due_date: '',
    invoice_number: '',
    bill_to_name: '',
    bill_to_address: '',
    reference: '',
    payment_terms: '',
    send_mode: 'now' as InvoiceSendMode,
    scheduled_for: '',
    message: '',
    amount_requested: '',
  };
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm);
  const setIf = (patch: Partial<typeof emptyInvoiceForm>) => setInvoiceForm(f => ({ ...f, ...patch }));
  const [invoiceLineItems, setInvoiceLineItems] = useState<{ description: string; amount: string }[]>([]);
  const [invoiceShowPayments, setInvoiceShowPayments] = useState(true);
  const [invoiceSending, setInvoiceSending] = useState(false);
  const [invoiceMsg, setInvoiceMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Payment reminders
  const [reminderDate, setReminderDate] = useState('');
  const [reminderAmount, setReminderAmount] = useState('');
  const [reminderNotes, setReminderNotes] = useState('');
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderError, setReminderError] = useState('');
  const invoiceLocked = !!invoiceMsg?.ok;

  const fetchNextInvoiceNumber = async () => {
    const [sentRes, scheduledRes] = await Promise.all([
      supabase.from('hub_invoice_log').select('invoice_number').order('id', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('hub_scheduled_invoices').select('invoice_number').order('id', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const latest = [sentRes.data?.invoice_number, scheduledRes.data?.invoice_number]
      .map((value) => parseInt(String(value ?? ''), 10))
      .filter((value) => !Number.isNaN(value));

    if (latest.length === 0) return '0001';
    return String(Math.max(...latest) + 1).padStart(4, '0');
  };

  const fetchAll = async () => {
    const [pRes, cRes] = await Promise.all([
      supabase.from('hub_projects')
        .select('*, hub_project_payments(id, amount, paid_at, notes, receipt_url), hub_project_costs(id, label, amount, date), hub_payment_reminders(id, send_date, amount_due, notes, status, sent_at), hub_project_contractors(id, percentage, payout_type, fixed_amount, payout_status, paid_at, notes, hub_users(id, full_name, avatar_url, email), hub_project_contractor_payouts(id, amount, paid_at, notes, receipt_url))')
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

  const sendReceipt = async () => {
    if (!sendReceiptModal || !sendReceiptEmail.trim()) return;
    setSendReceiptSending(true); setSendReceiptMsg(null);
    const { payment, project } = sendReceiptModal;
    const totalPaid = project.hub_project_payments.reduce((s, p) => s + p.amount, 0);
    const { data, error } = await supabase.functions.invoke('send-payment-receipt', {
      body: {
        to: sendReceiptEmail.trim(),
        cc: sendReceiptCc.trim() || undefined,
        client_name: project.client_name,
        project_name: project.project_name,
        amount: payment.amount,
        paid_at: payment.paid_at,
        notes: payment.notes,
        receipt_url: payment.receipt_url,
        total_paid: totalPaid,
        contract_price: project.contract_price,
        invoice_number: project.id,
        project_id: project.id,
      },
    });
    setSendReceiptSending(false);
    if (error || data?.error) {
      setSendReceiptMsg({ ok: false, text: data?.error ?? error?.message ?? 'Failed to send' });
    } else {
      setSendReceiptMsg({ ok: true, text: 'Receipt sent!' });
    }
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
    const contractorId = addCtxId;
    const wasAlreadyAssigned = !!activeProject?.hub_project_contractors.some(pc => pc.hub_users?.id === contractorId);
    setCtxSaving(true); setCtxAddError('');
    const { error } = await supabase.from('hub_project_contractors').upsert({
      project_id: activeId,
      contractor_id: contractorId,
      project_role: addCtxRole.trim() || null,
      payout_type: 'percentage',
      percentage: 0,
      fixed_amount: null,
    }, { onConflict: 'project_id,contractor_id' });
    setCtxSaving(false);
    if (error) { setCtxAddError(error.message); return; }
    setAddCtxId(''); setAddCtxRole('');
    if (!wasAlreadyAssigned) {
      supabase.functions.invoke('notify-project-assigned', {
        body: { project_id: activeId, contractor_id: contractorId },
      }).catch(() => {});
    }
    fetchAll();
  };

  const saveContractorPayoutConfig = async (pcId: number) => {
    const form = ctxConfigForm[pcId];
    if (!form) return;
    const isPercentage = form.payoutType === 'percentage';
    if (isPercentage && !form.percentage) {
      setCtxConfigError(prev => ({ ...prev, [pcId]: 'Percentage is required.' }));
      return;
    }
    if (!isPercentage && !form.fixedAmount) {
      setCtxConfigError(prev => ({ ...prev, [pcId]: 'Fixed fee amount is required.' }));
      return;
    }

    setCtxConfigSaving(prev => ({ ...prev, [pcId]: true }));
    setCtxConfigError(prev => ({ ...prev, [pcId]: '' }));

    const { error } = await supabase.from('hub_project_contractors').update({
      payout_type: form.payoutType,
      percentage: isPercentage ? parseFloat(form.percentage) : 0,
      fixed_amount: isPercentage ? null : parseFloat(form.fixedAmount),
    }).eq('id', pcId);

    setCtxConfigSaving(prev => ({ ...prev, [pcId]: false }));
    if (error) {
      setCtxConfigError(prev => ({ ...prev, [pcId]: error.message }));
      return;
    }

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

  const addReminder = async () => {
    if (!activeId || !reminderDate) return;
    setReminderSaving(true); setReminderError('');
    const { error } = await supabase.from('hub_payment_reminders').insert({
      project_id: activeId,
      send_date: reminderDate,
      amount_due: reminderAmount ? parseFloat(reminderAmount) : null,
      notes: reminderNotes || null,
      status: 'pending',
    });
    setReminderSaving(false);
    if (error) { setReminderError(error.message); return; }
    setReminderDate(''); setReminderAmount(''); setReminderNotes('');
    fetchAll();
  };

  const deleteReminder = async (rid: number) => {
    await supabase.from('hub_payment_reminders').delete().eq('id', rid);
    fetchAll();
  };

  const buildInvoicePayload = (project: Project) => {
    const invNum = invoiceForm.invoice_number.trim() || String(project.id).padStart(4, '0');
    return {
      to: invoiceForm.email.trim(),
      cc: invoiceForm.cc.trim() || undefined,
      subject: invoiceForm.subject.trim() || undefined,
      client_name: project.client_name,
      project_name: project.project_name,
      service: project.service,
      contract_price: project.contract_price,
      start_date: project.start_date,
      deadline: invoiceForm.due_date || project.deadline,
      payments: project.hub_project_payments,
      show_payments: invoiceShowPayments,
      line_items: invoiceLineItems.filter(i => i.description && i.amount),
      notes: project.notes,
      bill_to_name: invoiceForm.bill_to_name.trim() || undefined,
      bill_to_address: invoiceForm.bill_to_address.trim() || undefined,
      reference: invoiceForm.reference.trim() || undefined,
      payment_terms: invoiceForm.payment_terms.trim() || undefined,
      message: invoiceForm.message.trim() || undefined,
      invoice_number: invNum,
      project_id: project.id,
      app_base_url: typeof window !== 'undefined' ? window.location.origin : undefined,
      amount_requested: invoiceForm.amount_requested ? parseFloat(invoiceForm.amount_requested) : undefined,
    };
  };

  const sendInvoice = async (project: Project) => {
    setInvoiceSending(true);
    setInvoiceMsg(null);
    const payload = buildInvoicePayload(project);
    const { data, error } = await supabase.functions.invoke('send-invoice', {
      body: payload,
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
      const year = String(new Date().getFullYear());
      const invoiceSummary = [
        `Invoice #${payload.invoice_number}`,
        `Client: ${payload.client_name}`,
        `Project: ${payload.project_name}`,
        `Amount: ₱${payload.amount_requested?.toLocaleString() ?? payload.contract_price?.toLocaleString()}`,
        `Sent to: ${payload.to}`,
        `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      ].join('\n');
      supabase.functions.invoke('upload-to-drive', {
        body: {
          filename: `Invoice-${payload.invoice_number}-${payload.client_name.replace(/\s+/g, '-')}-${year}.txt`,
          mimeType: 'text/plain',
          base64Content: btoa(invoiceSummary),
          type: 'invoice',
          meta: { year },
        },
      }).catch(() => {});
    }
  };

  const scheduleInvoice = async (project: Project) => {
    if (!invoiceForm.scheduled_for) {
      setInvoiceMsg({ ok: false, text: 'Choose when the invoice should be sent.' });
      return;
    }

    const scheduledAt = new Date(invoiceForm.scheduled_for);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      setInvoiceMsg({ ok: false, text: 'Scheduled send time must be in the future.' });
      return;
    }

    setInvoiceSending(true);
    setInvoiceMsg(null);
    const payload = buildInvoicePayload(project);
    const { error } = await supabase.from('hub_scheduled_invoices').insert({
      project_id: project.id,
      invoice_number: String(payload.invoice_number),
      to_email: payload.to,
      cc_email: payload.cc ?? null,
      subject: payload.subject ?? null,
      client_name: payload.client_name,
      project_name: payload.project_name,
      service: payload.service ?? null,
      contract_price: payload.contract_price,
      start_date: payload.start_date,
      due_date: payload.deadline,
      payments: payload.payments,
      show_payments: payload.show_payments,
      line_items: payload.line_items,
      notes: payload.notes ?? null,
      bill_to_name: payload.bill_to_name ?? null,
      bill_to_address: payload.bill_to_address ?? null,
      reference: payload.reference ?? null,
      payment_terms: payload.payment_terms ?? null,
      message: payload.message ?? null,
      amount_requested: payload.amount_requested ?? null,
      scheduled_for: scheduledAt.toISOString(),
    });
    setInvoiceSending(false);

    if (error) {
      setInvoiceMsg({ ok: false, text: error.message });
      return;
    }

    if (invoiceForm.email.trim() !== project.contact_email) {
      await supabase.from('hub_projects').update({ contact_email: invoiceForm.email.trim() }).eq('id', project.id);
    }
    setInvoiceMsg({ ok: true, text: `Invoice scheduled for ${scheduledAt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}.` });
    fetchAll();
  };

  const printInvoice = async (project: Project, overrides?: { due_date?: string; invoice_number?: string; bill_to_name?: string; bill_to_address?: string; reference?: string; payment_terms?: string; message?: string; line_items?: { description: string; amount: string }[]; show_payments?: boolean; amount_requested?: number }) => {
    const { data: latestLink } = await supabase
      .from('hub_invoice_payment_links')
      .select('token')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const payUrl = latestLink?.token
      ? `${window.location.origin}/pay/${latestLink.token}`
      : null;
    const d = derived(project);
    const fmt2 = (n: number) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const logoUrl = 'https://www.hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png';
    const invNum = overrides?.invoice_number || String(project.id).padStart(4,'0');
    const billToName = overrides?.bill_to_name || project.client_name;
    const billToAddress = overrides?.bill_to_address?.trim() || '';
    const customMsg = overrides?.message || '';
    const lineItems = overrides?.line_items ?? [{ description: project.service ?? project.project_name, amount: String(project.contract_price) }];
    const showPayments = overrides?.show_payments ?? true;
    const lineItemsTotal = lineItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const totalPaid = d.totalPaid;
    // balance_due is what appears on the invoice — use explicit amount_requested if provided,
    // otherwise fall back to lineItemsTotal (the invoice amount itself, not auto-deducted)
    const balanceDue = overrides?.amount_requested != null ? overrides.amount_requested : lineItemsTotal - totalPaid;
    const paymentRows = project.hub_project_payments.map(p => `
      <tr>
        <td>${new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
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
  .totals{margin-left:auto;width:280px}
  .totals tr td{padding:6px 0;font-size:13px;color:#6b7280;border:none}
  .totals tr td:last-child{text-align:right}
  .totals .balance td{font-size:16px;font-weight:800;color:#111827;border-top:2px solid #e5e7eb;padding-top:10px}
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
<table class="totals">
  <tr><td>Subtotal</td><td>${fmt2(lineItemsTotal)}</td></tr>
  ${showPayments ? `<tr><td>Total paid</td><td style="color:#059669">− ${fmt2(d.totalPaid)}</td></tr>` : ''}
  <tr class="balance"><td>Balance due</td><td>${balanceDue <= 0 ? 'Paid in full' : fmt2(balanceDue)}</td></tr>
</table>
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

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!win) {
      URL.revokeObjectURL(url);
      return;
    }
    win.addEventListener('load', () => {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, { once: true });
  };

  const projectTypes = Array.from(new Set(projects.map(p => p.service).filter(Boolean) as string[])).sort();

  const filtered = projects.filter(p => {
    const matchesSearch = !search || p.client_name.toLowerCase().includes(search.toLowerCase()) || p.project_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesType = typeFilter === 'all' || p.service === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

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

  const statusTabs = [
    { key: 'all' as const, label: 'All', icon: 'ri-apps-2-line', count: projects.length },
    { key: 'ongoing' as const, label: 'Active', icon: 'ri-flashlight-line', count: projects.filter(p => p.status === 'ongoing').length },
    { key: 'paused' as const, label: 'Paused', icon: 'ri-pause-circle-line', count: projects.filter(p => p.status === 'paused').length },
    { key: 'completed' as const, label: 'Completed', icon: 'ri-check-double-line', count: projects.filter(p => p.status === 'completed').length },
    { key: 'cancelled' as const, label: 'Archived', icon: 'ri-archive-line', count: projects.filter(p => p.status === 'cancelled').length },
  ];

  useEffect(() => {
    if (!filtered.length) {
      setActiveId(null);
      return;
    }
    if (activeId && !filtered.some(p => p.id === activeId)) {
      setActiveId(filtered[0].id);
    }
  }, [filtered, activeId]);

  const projectTags = (project: Project) => {
    const serviceTag = project.service ? [project.service] : ['General'];
    const roleTags = project.hub_project_contractors
      .map(pc => pc.project_role)
      .filter((role): role is string => !!role)
      .slice(0, 2);
    const deptTags = contractors
      .filter(c => project.hub_project_contractors.some(pc => pc.hub_users?.id === c.id))
      .map(c => c.department)
      .filter((dept): dept is string => !!dept)
      .slice(0, 2);
    return [...new Set([...serviceTag, ...roleTags, ...deptTags])].slice(0, 3);
  };

  return (
    <AdminLayout title="Projects">
      <div className="space-y-4">
        <section className="space-y-3">

          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto w-fit">
              {statusTabs.filter(tab => tab.key !== 'all').map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === tab.key ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setEditingProject(null); setForm(emptyForm); setShowForm(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#111827] text-white text-sm rounded-lg hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0">
              <i className="ri-add-line text-sm"></i>
              <span className="hidden sm:inline">New Project</span>
            </button>
          </div>

          {projectTypes.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${typeFilter === 'all' ? 'bg-[#111827] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                All Types
              </button>
              {projectTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${typeFilter === type ? 'bg-[#111827] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {type}
                  <span className="ml-1.5 opacity-50">{projects.filter(p => p.service === type && (statusFilter === 'all' || p.status === statusFilter)).length}</span>
                </button>
              ))}
            </div>
          )}

          <div className="pt-1 pb-3">
            {loading ? (
              <div className="flex justify-center py-16"><i className="ri-loader-4-line animate-spin text-gray-300 text-2xl"></i></div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-5 py-14 text-center">
                <p className="text-sm text-gray-400">No projects match this view yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:overflow-x-auto lg:gap-4 gap-3 lg:min-w-0 lg:pb-2">
                {filtered.map(p => {
                  const d = derived(p);
                  const cfg = statusCfg[p.status] ?? statusCfg.ongoing;
                  const dl = deadlineStatus(p.deadline, p.status);
                  const tags = projectTags(p);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setActiveId(prev => prev === p.id ? null : p.id)}
                      className={`w-full lg:w-[272px] lg:shrink-0 rounded-xl border bg-white p-4 text-left transition-colors flex flex-col gap-3 ${
                        activeId === p.id
                          ? 'border-[#FF6B35] shadow-sm'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      {/* Top row: status + assigned avatars */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${cfg.cls}`}>{cfg.label}</span>
                        <div className="flex -space-x-1.5">
                          {p.hub_project_contractors.slice(0, 3).map((pc: any) => (
                            pc.hub_users?.avatar_url
                              ? <img key={pc.hub_users.id} src={pc.hub_users.avatar_url} alt={pc.hub_users.full_name} className="w-5 h-5 rounded-full object-cover object-top border border-white" />
                              : <div key={pc.hub_users?.id} className="w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[8px] font-bold text-gray-500">{pc.hub_users?.full_name?.[0]}</div>
                          ))}
                          {p.hub_project_contractors.length > 3 && (
                            <div className="w-5 h-5 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[8px] text-gray-400">+{p.hub_project_contractors.length - 3}</div>
                          )}
                        </div>
                      </div>

                      {/* Project + client name */}
                      <div>
                        <h3 className="text-sm font-semibold text-[#111827] line-clamp-2 leading-snug">{p.project_name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{p.client_name}</p>
                      </div>

                      {/* Contract value */}
                      <p className="text-lg font-bold text-[#111827] leading-none">{fmt(p.contract_price)}</p>

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.map(tag => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{tag}</span>
                          ))}
                        </div>
                      )}

                      {/* Meta row */}
                      <div className="mt-auto flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-50 pt-2.5">
                        <span className="flex items-center gap-1">
                          <i className="ri-calendar-line"></i>
                          {p.deadline ? new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'}
                        </span>
                        {dl && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${dl.cls}`}>{dl.label}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {!loading && projects.length > 0 && !activeProject && (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            {[
              { label: 'Contract', value: fmt(summaryTotals.contractValue), cls: 'text-gray-800' },
              { label: 'Costs', value: fmt(summaryTotals.costs), cls: 'text-rose-600' },
              { label: 'Net', value: fmt(summaryTotals.netProfit), cls: 'text-teal-600' },
              { label: 'Collected', value: `${fmt(summaryTotals.collected)} (${summaryTotals.collectionPct.toFixed(0)}%)`, cls: 'text-emerald-600' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</p>
                <p className={`text-sm font-bold ${s.cls} truncate mt-1`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {activeProject ? (() => {
          const d = derived(activeProject);
          const cfg = statusCfg[activeProject.status] ?? statusCfg.ongoing;
          const unassigned = contractors.filter(c => !activeProject.hub_project_contractors.some(pc => pc.hub_users?.id === c.id));

          return (
            <>
              {/* Mobile: bottom sheet overlay */}
              <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setActiveId(null)} />
              <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 sticky top-0 bg-white">
                  <div>
                    <p className="font-semibold text-[#111827] text-sm">{activeProject.project_name}</p>
                    <p className="text-xs text-gray-400">{activeProject.client_name}</p>
                  </div>
                  <button onClick={() => setActiveId(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 cursor-pointer">
                    <i className="ri-close-line"></i>
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Contract', value: fmt(activeProject.contract_price), cls: 'text-gray-800' },
                      { label: 'Paid', value: fmt(d.totalPaid), cls: 'text-emerald-600' },
                      { label: 'Balance', value: fmt(d.balance), cls: d.balance > 0 ? 'text-rose-600' : 'text-gray-400' },
                      { label: 'Costs', value: fmt(d.totalCosts), cls: 'text-orange-600' },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</p>
                        <p className={`text-sm font-bold mt-0.5 ${s.cls}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={async () => { const nextNum = await fetchNextInvoiceNumber(); setInvoiceModal(activeProject); const _balance = activeProject.contract_price - activeProject.hub_project_payments.reduce((s,p)=>s+p.amount,0); setInvoiceForm({ email: activeProject.contact_email ?? '', cc: '', subject: `Invoice #${nextNum} — ${activeProject.project_name}`, due_date: activeProject.deadline ?? '', invoice_number: nextNum, bill_to_name: activeProject.client_name, bill_to_address: '', reference: '', payment_terms: activeProject.deadline ? 'Due by stated date' : 'Due on receipt', send_mode: 'now', scheduled_for: '', message: '', amount_requested: String(Math.max(_balance, 0)) }); setInvoiceLineItems([{ description: activeProject.service ?? activeProject.project_name, amount: String(activeProject.contract_price) }]); setInvoiceShowPayments(true); setInvoiceMsg(null); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#111827] text-white text-sm rounded-xl cursor-pointer">
                      <i className="ri-mail-send-line"></i> Send Invoice
                    </button>
                    <button onClick={() => { setEditingProject(activeProject); setForm({ project_name: activeProject.project_name, client_name: activeProject.client_name, contact_email: activeProject.contact_email ?? '', service: activeProject.service ?? '', scope: activeProject.scope ?? '', contract_price: String(activeProject.contract_price), deadline: activeProject.deadline ?? '', start_date: activeProject.start_date ?? '', status: activeProject.status, notes: activeProject.notes ?? '' }); setShowForm(true); }}
                      className="px-4 flex items-center gap-1.5 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl cursor-pointer">
                      <i className="ri-edit-line"></i>
                    </button>
                  </div>
                  {/* Team */}
                  {activeProject.hub_project_contractors.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Team</p>
                      <div className="space-y-2">
                        {activeProject.hub_project_contractors.map((pc: any) => (
                          <div key={pc.hub_users?.id} className="flex items-center gap-2.5">
                            {pc.hub_users?.avatar_url
                              ? <img src={pc.hub_users.avatar_url} alt={pc.hub_users.full_name} className="w-7 h-7 rounded-full object-cover object-top" />
                              : <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">{pc.hub_users?.full_name?.[0]}</div>
                            }
                            <div>
                              <p className="text-sm text-[#111827]">{pc.hub_users?.full_name}</p>
                              <p className="text-xs text-gray-400">{pc.hub_users?.department}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Payments */}
                  {activeProject.hub_project_payments.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Payments</p>
                      <div className="space-y-1.5">
                        {activeProject.hub_project_payments.map((pay: any) => (
                          <div key={pay.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{pay.label || new Date(pay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="font-medium text-emerald-600">{fmt(pay.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop: inline panel */}
            <div className="hidden lg:block space-y-4 min-w-0">
              {/* Header */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
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
                    <button onClick={() => void printInvoice(activeProject)}
                      className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer flex items-center gap-1 rounded-full px-2.5 py-1.5 hover:bg-white/55">
                      <i className="ri-printer-line"></i> Print
                    </button>
                    <button onClick={async () => { const nextNum = await fetchNextInvoiceNumber(); setInvoiceModal(activeProject); const _balance = activeProject.contract_price - activeProject.hub_project_payments.reduce((s,p)=>s+p.amount,0); setInvoiceForm({ email: activeProject.contact_email ?? '', cc: '', subject: `Invoice #${nextNum} — ${activeProject.project_name}`, due_date: activeProject.deadline ?? '', invoice_number: nextNum, bill_to_name: activeProject.client_name, bill_to_address: '', reference: '', payment_terms: activeProject.deadline ? 'Due by stated date' : 'Due on receipt', send_mode: 'now', scheduled_for: '', message: '', amount_requested: String(Math.max(_balance, 0)) }); setInvoiceLineItems([{ description: activeProject.service ?? activeProject.project_name, amount: String(activeProject.contract_price) }]); setInvoiceShowPayments(true); setInvoiceMsg(null); }}
                      className="text-xs px-3 py-1.5 bg-[#111827] text-white rounded-xl hover:bg-[#0f172a] cursor-pointer flex items-center gap-1">
                      <i className="ri-mail-send-line"></i> Send Invoice
                    </button>
                    <button onClick={() => { setEditingProject(activeProject); setForm({ client_name: activeProject.client_name, project_name: activeProject.project_name, service: activeProject.service || '', contract_price: String(activeProject.contract_price), status: activeProject.status, start_date: activeProject.start_date || '', deadline: activeProject.deadline || '', notes: activeProject.notes || '', contact_email: activeProject.contact_email || '' }); setShowForm(true); }}
                      className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer flex items-center gap-1 rounded-full px-2.5 py-1.5 hover:bg-white/55">
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
                    <div key={card.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
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
                  <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-white/55">
                    <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${Math.min(d.paidPct, 100)}%` }} />
                  </div>
                </div>
                {activeProject.notes && <p className="text-xs text-gray-400 italic mt-3">{activeProject.notes}</p>}
                </div>
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
                        <div key={pp.id} className="bg-white/45 border border-white/65 rounded-xl overflow-hidden backdrop-blur-md">
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
                                <button onClick={() => { setSendReceiptModal({ payment: pp, project: activeProject }); setSendReceiptEmail(activeProject.contact_email ?? ''); setSendReceiptCc(''); setSendReceiptMsg(null); }}
                                  className="text-gray-300 hover:text-sky-500 cursor-pointer mt-0.5" title="Send receipt to client">
                                  <i className="ri-mail-send-line text-xs"></i>
                                </button>
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

                {/* Payment Schedule */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Schedule</p>
                    <span className="text-[10px] text-gray-400">Reminders auto-send on due date</span>
                  </div>
                  {(activeProject.hub_payment_reminders ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400">No reminders scheduled.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {[...(activeProject.hub_payment_reminders ?? [])].sort((a, b) => a.send_date.localeCompare(b.send_date)).map(r => {
                        const isPast = r.send_date < new Date().toISOString().slice(0, 10);
                        const statusCls = r.status === 'sent' ? 'text-emerald-600 bg-emerald-50' : r.status === 'cancelled' ? 'text-gray-400 bg-gray-100 line-through' : isPast ? 'text-rose-500 bg-rose-50' : 'text-amber-600 bg-amber-50';
                        const statusLabel = r.status === 'sent' ? 'Sent' : r.status === 'cancelled' ? 'Cancelled' : isPast ? 'Overdue' : 'Pending';
                        return (
                          <div key={r.id} className="flex items-center justify-between gap-2 bg-white/48 border border-white/65 rounded-xl px-3 py-2 backdrop-blur-md">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-gray-700">
                                  {new Date(r.send_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                {r.amount_due && <span className="text-xs font-semibold text-[#FF6B35]">{fmt(r.amount_due)}</span>}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusCls}`}>{statusLabel}</span>
                              </div>
                              {r.notes && <p className="text-[11px] text-gray-400 mt-0.5">{r.notes}</p>}
                            </div>
                            {r.status === 'pending' && (
                              <button onClick={() => deleteReminder(r.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer flex-shrink-0">
                                <i className="ri-delete-bin-line text-xs"></i>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex gap-2">
                      <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                      <input type="number" value={reminderAmount} onChange={e => setReminderAmount(e.target.value)} placeholder="Amount (optional)"
                        className="w-32 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <input value={reminderNotes} onChange={e => setReminderNotes(e.target.value)} placeholder="Note e.g. 2nd installment"
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                      <button onClick={addReminder} disabled={!reminderDate || reminderSaving}
                        className="px-3 py-1.5 bg-[#111827] text-white text-xs rounded-lg hover:bg-gray-700 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                        {reminderSaving ? '...' : '+ Add'}
                      </button>
                    </div>
                    {reminderError && <p className="text-xs text-red-500">{reminderError}</p>}
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

              {/* Team */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Team</p>
                <p className="text-[11px] text-gray-400">Assign people first, then configure payout type and amount for each person.</p>

                {activeProject.hub_project_contractors.length === 0 ? (
                  <p className="text-xs text-gray-400">No contractors assigned to this project yet.</p>
                ) : (
                  <div className="space-y-3">
                    {activeProject.hub_project_contractors.map(pc => {
                      const u = pc.hub_users;
                      if (!u) return null;
                      const configForm = ctxConfigForm[pc.id] ?? {
                        payoutType: (pc.payout_type === 'fixed' ? 'fixed' : 'percentage') as 'percentage' | 'fixed',
                        percentage: pc.percentage ? String(pc.percentage) : '',
                        fixedAmount: pc.fixed_amount != null ? String(pc.fixed_amount) : '',
                      };
                      const setConfigForm = (patch: Partial<typeof configForm>) => setCtxConfigForm(prev => ({
                        ...prev,
                        [pc.id]: { ...configForm, ...patch },
                      }));
                      const isFixed = pc.payout_type === 'fixed';
                      const hasConfiguredPayout = isFixed ? (pc.fixed_amount ?? 0) > 0 : pc.percentage > 0;
                      const cut = hasConfiguredPayout ? (isFixed ? (pc.fixed_amount ?? 0) : d.netProfit * (pc.percentage / 100)) : 0;
                      const totalPaidOut = pc.hub_project_contractor_payouts.reduce((s, x) => s + x.amount, 0);
                      const paidPct = cut > 0 ? Math.min((totalPaidOut / cut) * 100, 100) : 0;
                      const isFullyPaid = totalPaidOut >= cut && cut > 0;
                      const pf = ctxPayForm[pc.id] ?? { amount: '', date: new Date().toISOString().slice(0, 10), notes: '', receipt: null, notify: true };
                      const setPf = (patch: Partial<typeof pf>) => setCtxPayForm(prev => ({ ...prev, [pc.id]: { ...pf, ...patch } }));
                      return (
                        <div key={pc.id} className="border border-gray-100 bg-white rounded-xl overflow-hidden">
                          {/* Contractor header */}
                          <div className="flex items-center gap-3 p-3 bg-white/45 backdrop-blur-md">
                            <Avatar name={u.full_name} url={u.avatar_url} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-gray-800">{u.full_name}</p>
                                {pc.project_role && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-gray-200 text-gray-500 font-medium">
                                    {pc.project_role}
                                  </span>
                                )}
                                {!hasConfiguredPayout ? (
                                  <span className="text-xs text-amber-600">No payout set</span>
                                ) : isFixed ? (
                                  <span className="text-xs text-gray-400">Fixed fee → <strong className="text-[#111827]">{fmt(cut)}</strong></span>
                                ) : (
                                  <span className="text-xs text-gray-400">{pc.percentage}% → <strong className="text-[#111827]">{fmt(cut)}</strong></span>
                                )}
                                {hasConfiguredPayout && (isFullyPaid
                                  ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Paid in full</span>
                                  : totalPaidOut > 0
                                    ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{fmt(totalPaidOut)} paid</span>
                                    : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Unpaid</span>
                                )}
                              </div>
                              {hasConfiguredPayout && (
                                <div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden w-full">
                                  <div className={`h-full rounded-full transition-all ${isFullyPaid ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${paidPct}%` }} />
                                </div>
                              )}
                            </div>
                            <button onClick={() => removeContractor(pc.id)} className="text-gray-300 hover:text-rose-400 cursor-pointer flex-shrink-0"><i className="ri-delete-bin-line text-xs"></i></button>
                          </div>

                          <div className="px-3 py-2.5 border-t border-gray-100 bg-white space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Payout Setup</p>
                              <span className="text-[11px] text-gray-400">Net profit basis: <strong className="text-emerald-600">{fmt(d.netProfit)}</strong></span>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs flex-shrink-0">
                                <button onClick={() => setConfigForm({ payoutType: 'percentage' })}
                                  className={`px-2.5 py-1.5 cursor-pointer transition-colors ${configForm.payoutType === 'percentage' ? 'bg-[#111827] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                                  Percentage
                                </button>
                                <button onClick={() => setConfigForm({ payoutType: 'fixed' })}
                                  className={`px-2.5 py-1.5 cursor-pointer transition-colors border-l border-gray-200 ${configForm.payoutType === 'fixed' ? 'bg-[#111827] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                                  Fixed Fee
                                </button>
                              </div>
                              {configForm.payoutType === 'percentage' ? (
                                <div className="relative w-24">
                                  <input type="number" value={configForm.percentage} onChange={e => setConfigForm({ percentage: e.target.value })} placeholder="%" min="1" max="100"
                                    className="w-full px-2.5 py-1.5 pr-6 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                                </div>
                              ) : (
                                <div className="relative w-40">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₱</span>
                                  <input type="number" value={configForm.fixedAmount} onChange={e => setConfigForm({ fixedAmount: e.target.value })} placeholder="Fixed fee amount"
                                    className="w-full pl-6 pr-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                                </div>
                              )}
                              <button onClick={() => saveContractorPayoutConfig(pc.id)} disabled={ctxConfigSaving[pc.id]}
                                className="px-3 py-1.5 bg-[#111827] text-white text-xs rounded-lg hover:bg-gray-800 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                                {ctxConfigSaving[pc.id] ? 'Saving...' : hasConfiguredPayout ? 'Update Payout' : 'Set Payout'}
                              </button>
                            </div>
                            {ctxConfigError[pc.id] && <p className="text-xs text-red-500">{ctxConfigError[pc.id]}</p>}
                          </div>

                          {/* Payout history */}
                          {hasConfiguredPayout && pc.hub_project_contractor_payouts.length > 0 && (
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
                          {hasConfiguredPayout && !isFullyPaid && (
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
                      }}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white">
                        <option value="">Add team member...</option>
                        {unassigned.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.department ? ` — ${c.department}` : ''}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input value={addCtxRole} onChange={e => setAddCtxRole(e.target.value)} placeholder="Project role (optional)"
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                      <button onClick={addContractor} disabled={!addCtxId || ctxSaving}
                        className="px-3 py-1.5 bg-[#111827] text-white text-xs rounded-lg hover:bg-gray-800 cursor-pointer disabled:opacity-40 whitespace-nowrap">
                        {ctxSaving ? '...' : 'Add Team Member'}
                      </button>
                    </div>
                    {ctxAddError && <p className="text-xs text-red-500">{ctxAddError}</p>}
                    <p className="text-[11px] text-gray-400">Payout can be configured after assignment.</p>
                  </div>
                )}
              </div>
            </div>
            </> // end desktop + mobile sheets
          );
        })() : (
          <div className="flex items-center justify-center text-gray-400 py-8">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                <i className="ri-folder-open-line text-2xl text-gray-300"></i>
              </div>
              <p className="text-sm">Select a project card to view details</p>
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
            {invoiceLocked ? (
              <div className="px-5 py-10 min-h-[420px] flex items-center justify-center">
                <div className="max-w-sm text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i className="ri-check-line text-3xl text-emerald-600"></i>
                  </div>
                  <h4 className="text-xl font-bold text-[#111827]">
                    {invoiceForm.send_mode === 'schedule' ? 'Invoice Scheduled' : 'Invoice Sent'}
                  </h4>
                  <p className="text-sm text-gray-500 mt-2">{invoiceMsg?.text}</p>
                  <p className="text-xs text-gray-400 mt-4">Close this window to return. Reopen the invoice modal if you need to prepare another send.</p>
                </div>
              </div>
            ) : (
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
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Delivery</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIf({ send_mode: 'now', scheduled_for: '' })}
                    className={`px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${invoiceForm.send_mode === 'now' ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    Send now
                  </button>
                  <button
                    type="button"
                    onClick={() => setIf({ send_mode: 'schedule' })}
                    className={`px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${invoiceForm.send_mode === 'schedule' ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    Schedule
                  </button>
                </div>
                {invoiceForm.send_mode === 'schedule' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Send on</label>
                    <input type="datetime-local" value={invoiceForm.scheduled_for} onChange={e => setIf({ scheduled_for: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                    <p className="text-[11px] text-gray-400">This invoice will be saved as a snapshot and sent automatically at the selected time.</p>
                  </div>
                )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Bill to name</label>
                  <input type="text" value={invoiceForm.bill_to_name} onChange={e => setIf({ bill_to_name: e.target.value })}
                    placeholder="e.g. FS Architects"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Reference / PO <span className="text-gray-400">(optional)</span></label>
                  <input type="text" value={invoiceForm.reference} onChange={e => setIf({ reference: e.target.value })}
                    placeholder="e.g. PO-1042"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Billing address <span className="text-gray-400">(optional)</span></label>
                <textarea value={invoiceForm.bill_to_address} onChange={e => setIf({ bill_to_address: e.target.value })} rows={2}
                  placeholder="Company address, attention line, or billing contact"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Payment terms <span className="text-gray-400">(optional)</span></label>
                  <input type="text" value={invoiceForm.payment_terms} onChange={e => setIf({ payment_terms: e.target.value })}
                    placeholder="e.g. Net 15 or Due on receipt"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Currency</label>
                  <input type="text" value="PHP (₱)" disabled
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
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

              {/* Amount to collect */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Amount to Request <span className="text-gray-400 font-normal">(what the client owes on this invoice)</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₱</span>
                  <input type="number" value={invoiceForm.amount_requested} onChange={e => setIf({ amount_requested: e.target.value })}
                    placeholder="e.g. 15000"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-[#FF6B35] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 font-semibold text-[#111827]" />
                </div>
                <p className="text-[10px] text-gray-400">This is the "Balance Due" shown on the invoice and on the payment page.</p>
              </div>
              {invoiceMsg && (
                <p className={`text-xs font-medium ${invoiceMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                  {invoiceMsg.ok ? <><i className="ri-check-line mr-1"></i>{invoiceMsg.text}</> : invoiceMsg.text}
                </p>
              )}
            </div>
            )}
            <div className="px-5 pb-5 space-y-2">
              {invoiceLocked ? (
                <button onClick={() => setInvoiceModal(null)} className="w-full py-2.5 text-sm bg-[#111827] text-white rounded-lg hover:bg-black cursor-pointer">
                  Close
                </button>
              ) : (
                <>
                  <button
                    onClick={() => void printInvoice(invoiceModal, { due_date: invoiceForm.due_date, invoice_number: invoiceForm.invoice_number, bill_to_name: invoiceForm.bill_to_name, bill_to_address: invoiceForm.bill_to_address, reference: invoiceForm.reference, payment_terms: invoiceForm.payment_terms, message: invoiceForm.message, line_items: invoiceLineItems.filter(i => i.description && i.amount), show_payments: invoiceShowPayments, amount_requested: invoiceForm.amount_requested ? parseFloat(invoiceForm.amount_requested) : undefined })}
                    className="w-full py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <i className="ri-printer-line"></i> Preview / Print
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => setInvoiceModal(null)} className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">Cancel</button>
                    <button
                      onClick={() => invoiceForm.send_mode === 'schedule' ? scheduleInvoice(invoiceModal) : sendInvoice(invoiceModal)}
                      disabled={invoiceSending || !invoiceForm.email.trim() || (invoiceForm.send_mode === 'schedule' && !invoiceForm.scheduled_for)}
                      className="flex-1 py-2 text-sm bg-[#FF6B35] text-white rounded-lg hover:bg-[#e55a27] disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {invoiceSending
                        ? <><i className="ri-loader-4-line animate-spin"></i> {invoiceForm.send_mode === 'schedule' ? 'Scheduling…' : 'Sending…'}</>
                        : <><i className={invoiceForm.send_mode === 'schedule' ? 'ri-calendar-schedule-line' : 'ri-mail-send-line'}></i> {invoiceForm.send_mode === 'schedule' ? 'Schedule Invoice' : 'Send Invoice'}</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send receipt modal */}
      {sendReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setSendReceiptModal(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#111827]">Send Payment Receipt</h3>
                <p className="text-xs text-gray-400 mt-0.5">{fmt(sendReceiptModal.payment.amount)} · {new Date(sendReceiptModal.payment.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <button onClick={() => setSendReceiptModal(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><i className="ri-close-line text-lg"></i></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Send to <span className="text-red-400">*</span></label>
                <input type="email" value={sendReceiptEmail} onChange={e => setSendReceiptEmail(e.target.value)}
                  placeholder="client@email.com" autoFocus
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">CC <span className="text-gray-400">(optional)</span></label>
                <input type="email" value={sendReceiptCc} onChange={e => setSendReceiptCc(e.target.value)}
                  placeholder="e.g. team@hunacreatives.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
              </div>

              {/* Payment summary */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs text-gray-500">
                <div className="flex justify-between"><span>Payment</span><span className="font-semibold text-emerald-600">{fmt(sendReceiptModal.payment.amount)}</span></div>
                <div className="flex justify-between"><span>Date</span><span className="font-medium text-gray-700">{new Date(sendReceiptModal.payment.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
                {sendReceiptModal.payment.notes && <div className="flex justify-between"><span>Note</span><span className="text-gray-600">{sendReceiptModal.payment.notes}</span></div>}
                <div className="flex justify-between pt-1 border-t border-gray-200"><span>Remaining balance</span><span className={`font-bold ${sendReceiptModal.project.contract_price - sendReceiptModal.project.hub_project_payments.reduce((s,p)=>s+p.amount,0) <= 0 ? 'text-emerald-600' : 'text-[#FF6B35]'}`}>{sendReceiptModal.project.contract_price - sendReceiptModal.project.hub_project_payments.reduce((s,p)=>s+p.amount,0) <= 0 ? 'Paid in full' : fmt(sendReceiptModal.project.contract_price - sendReceiptModal.project.hub_project_payments.reduce((s,p)=>s+p.amount,0))}</span></div>
              </div>

              {sendReceiptModal.payment.receipt_url && (
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                  <img src={sendReceiptModal.payment.receipt_url} alt="receipt" className="h-10 w-14 object-cover rounded border border-gray-200 flex-shrink-0" />
                  <p className="text-xs text-gray-500">Receipt image will be included in the email.</p>
                </div>
              )}

              {sendReceiptMsg && (
                <p className={`text-xs font-medium ${sendReceiptMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                  {sendReceiptMsg.ok ? <><i className="ri-check-line mr-1"></i>{sendReceiptMsg.text}</> : sendReceiptMsg.text}
                </p>
              )}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setSendReceiptModal(null)} className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button onClick={sendReceipt} disabled={sendReceiptSending || !sendReceiptEmail.trim()}
                className="flex-1 py-2.5 text-sm bg-[#FF6B35] text-white rounded-lg hover:bg-[#e55a27] disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5">
                {sendReceiptSending ? <><i className="ri-loader-4-line animate-spin"></i> Sending…</> : <><i className="ri-mail-send-line"></i> Send Receipt</>}
              </button>
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

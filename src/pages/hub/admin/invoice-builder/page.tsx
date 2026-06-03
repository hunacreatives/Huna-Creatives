import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import {
  buildDefaultInvoiceLineItems,
  buildInvoiceDefaults,
  buildInvoicePreviewHtml,
  emptyInvoiceBuilderForm,
  formatInvoiceCurrency,
  InvoiceBuilderFormState,
  InvoiceLineItem,
  InvoiceProjectSnapshot,
  isValidEmail,
  parseEmailList,
} from '@/lib/invoiceBuilder';

export default function AdminInvoiceBuilderPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [project, setProject] = useState<InvoiceProjectSnapshot | null>(null);
  const [form, setForm] = useState<InvoiceBuilderFormState>(emptyInvoiceBuilderForm());
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([{ description: '', amount: '' }]);
  const [includePaymentHistory, setIncludePaymentHistory] = useState(true);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const draftKey = `hub_invoice_draft_${projectId}`;

  const loadNextInvoiceNumber = async () => {
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

  useEffect(() => {
    const load = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const [{ data: projectData }, nextInvoiceNumber] = await Promise.all([
        supabase
          .from('hub_projects')
          .select('id, client_name, project_name, service, contract_price, start_date, deadline, contact_email, hub_project_payments(id, amount, paid_at, notes, receipt_url)')
          .eq('id', Number(projectId))
          .maybeSingle(),
        loadNextInvoiceNumber(),
      ]);

      const nextProject = (projectData as InvoiceProjectSnapshot | null) ?? null;
      setProject(nextProject);

      if (nextProject) {
        const defaults = buildInvoiceDefaults(nextProject, nextInvoiceNumber);
        const storedDraft = window.localStorage.getItem(draftKey);
        if (storedDraft) {
          try {
            const parsed = JSON.parse(storedDraft) as {
              form: InvoiceBuilderFormState;
              lineItems: InvoiceLineItem[];
              includePaymentHistory: boolean;
            };
            setForm({ ...defaults, ...parsed.form });
            setLineItems(parsed.lineItems?.length ? parsed.lineItems : buildDefaultInvoiceLineItems(nextProject));
            setIncludePaymentHistory(parsed.includePaymentHistory ?? true);
          } catch {
            setForm(defaults);
            setLineItems(buildDefaultInvoiceLineItems(nextProject));
            setIncludePaymentHistory(true);
          }
        } else {
          setForm(defaults);
          setLineItems(buildDefaultInvoiceLineItems(nextProject));
          setIncludePaymentHistory(true);
        }

        const { data: latestLink } = await supabase
          .from('hub_invoice_payment_links')
          .select('token')
          .eq('project_id', nextProject.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setPreviewToken(latestLink?.token ?? null);
      }

      setLoading(false);
    };

    void load();
  }, [draftKey, projectId]);

  const validLineItems = useMemo(
    () => lineItems.filter((item) => item.description.trim() && item.amount !== ''),
    [lineItems],
  );

  const subtotal = useMemo(
    () => validLineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0),
    [validLineItems],
  );
  const totalPaid = project?.hub_project_payments.reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
  const amountRequested = form.amount_requested ? parseFloat(form.amount_requested) : NaN;
  const balanceDue = Number.isFinite(amountRequested) ? amountRequested : Math.max(subtotal - totalPaid, 0);

  const previewHtml = useMemo(() => {
    if (!project) return '';
    return buildInvoicePreviewHtml({
      project,
      form,
      lineItems,
      includePaymentHistory,
      payUrl: previewToken ? `https://hunacreatives.com/pay/${previewToken}` : null,
    });
  }, [form, includePaymentHistory, lineItems, previewToken, project]);

  const updateForm = (patch: Partial<InvoiceBuilderFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const updateLineItem = (index: number, patch: Partial<InvoiceLineItem>) => {
    setLineItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const validateRecipients = () => {
    const toList = parseEmailList(form.send_to);
    const ccList = parseEmailList(form.cc);

    if (toList.length === 0 || toList.some((email) => !isValidEmail(email))) {
      return 'Enter at least one valid "Send To" email.';
    }
    if (ccList.some((email) => !isValidEmail(email))) {
      return 'One or more CC emails are invalid.';
    }
    return null;
  };

  const buildSendPayload = () => {
    if (!project) return null;
    const filteredLineItems = validLineItems.length > 0 ? validLineItems : buildDefaultInvoiceLineItems(project);
    return {
      to: parseEmailList(form.send_to),
      cc: parseEmailList(form.cc),
      subject: `Invoice #${form.invoice_number} — ${project.project_name}`,
      client_name: form.client_name.trim() || project.client_name,
      project_name: project.project_name,
      service: project.service,
      contract_price: project.contract_price,
      start_date: project.start_date,
      deadline: form.due_date || project.deadline,
      payments: project.hub_project_payments,
      show_payments: includePaymentHistory,
      line_items: filteredLineItems,
      notes: form.payment_instructions.trim() || null,
      bill_to_name: form.client_name.trim() || project.client_name,
      bill_to_address: form.billing_address.trim() || null,
      reference: form.reference.trim() || null,
      payment_terms: form.payment_terms.trim() || null,
      message: form.customer_notes.trim() || null,
      invoice_number: form.invoice_number.trim(),
      project_id: project.id,
      app_base_url: 'https://hunacreatives.com',
      amount_requested: balanceDue,
      currency: form.currency,
    };
  };

  const saveDraft = async () => {
    if (!project) return;
    setSavingDraft(true);
    window.localStorage.setItem(draftKey, JSON.stringify({ form, lineItems, includePaymentHistory }));
    if (form.send_to.trim() !== (project.contact_email ?? '').trim()) {
      await supabase.from('hub_projects').update({ contact_email: form.send_to.trim() || null }).eq('id', project.id);
    }
    setSavingDraft(false);
    setStatus({ ok: true, text: 'Draft saved locally for this project.' });
  };

  const previewPdf = () => {
    if (!project) return;
    const win = window.open('', '_blank', 'width=1200,height=840');
    if (!win) return;
    win.document.open();
    win.document.write(buildInvoicePreviewHtml({
      project,
      form,
      lineItems,
      includePaymentHistory,
      payUrl: previewToken ? `https://hunacreatives.com/pay/${previewToken}` : null,
      printOnLoad: true,
    }));
    win.document.close();
  };

  const sendInvoice = async () => {
    if (!project) return;

    const recipientError = validateRecipients();
    if (recipientError) {
      setStatus({ ok: false, text: recipientError });
      return;
    }

    setSending(true);
    setStatus(null);
    const payload = buildSendPayload();
    if (!payload) {
      setSending(false);
      return;
    }

    const invokePromise = supabase.functions.invoke('send-invoice', { body: payload });
    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('Invoice sending timed out. Please try again.')), 20000);
    });

    let data: any;
    let error: any;
    try {
      ({ data, error } = await Promise.race([invokePromise, timeoutPromise]) as any);
    } catch (err) {
      error = err;
    } finally {
      setSending(false);
    }

    if (error || data?.error) {
      setStatus({ ok: false, text: data?.error ?? error?.message ?? 'Failed to send invoice.' });
      return;
    }

    await supabase.from('hub_projects').update({ contact_email: form.send_to.trim() || null }).eq('id', project.id);
    window.localStorage.removeItem(draftKey);
    setStatus({ ok: true, text: 'Invoice sent successfully.' });
  };

  if (loading) {
    return (
      <AdminLayout title="Invoice Builder">
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i>
        </div>
      </AdminLayout>
    );
  }

  if (!project) {
    return (
      <AdminLayout title="Invoice Builder">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
          <p className="text-sm font-medium text-gray-900">Project not found</p>
          <p className="text-sm text-gray-500 mt-1">Open the builder from a project workspace to create an invoice.</p>
          <button
            onClick={() => navigate('/hub/admin/projects')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-medium text-white hover:bg-black cursor-pointer"
          >
            Back to Projects
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Invoice Builder">
      <div className="space-y-5">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#FF6B35]">Billing Workspace</p>
              <h1 className="mt-2 text-2xl font-bold text-[#111827]">{project.project_name}</h1>
              <p className="mt-1 text-sm text-gray-500">{project.client_name} · Build the invoice while seeing the final document live.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => navigate('/hub/admin/projects')}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={saveDraft}
                disabled={savingDraft}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                {savingDraft ? 'Saving Draft…' : 'Save Draft'}
              </button>
              <button
                onClick={previewPdf}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Preview PDF
              </button>
              <button
                onClick={sendInvoice}
                disabled={sending}
                className="rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e55a27] disabled:opacity-50 cursor-pointer"
              >
                {sending ? 'Sending…' : 'Send Invoice'}
              </button>
            </div>
          </div>
          {status && (
            <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${status.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
              {status.text}
            </div>
          )}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)]">
          <div className="space-y-5">
            <section className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6">
              <div className="mb-4">
                <p className="text-sm font-semibold text-[#111827]">Client Details</p>
                <p className="text-xs text-gray-400 mt-1">Who receives the invoice and how they should see themselves on the document.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-600">Send To</span>
                  <input value={form.send_to} onChange={(e) => updateForm({ send_to: e.target.value })} placeholder="client@email.com"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-600">CC</span>
                  <input value={form.cc} onChange={(e) => updateForm({ cc: e.target.value })} placeholder="finance@client.com, partner@client.com"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-600">Client Name</span>
                  <input value={form.client_name} onChange={(e) => updateForm({ client_name: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]" />
                </label>
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-gray-600">Billing Address</span>
                  <textarea value={form.billing_address} onChange={(e) => updateForm({ billing_address: e.target.value })} rows={3}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]" />
                </label>
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-gray-600">Reference / PO</span>
                  <input value={form.reference} onChange={(e) => updateForm({ reference: e.target.value })} placeholder="PO-1042"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]" />
                </label>
              </div>
            </section>

            <section className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6">
              <div className="mb-4">
                <p className="text-sm font-semibold text-[#111827]">Invoice Settings</p>
                <p className="text-xs text-gray-400 mt-1">Document identity, timing, and how money is presented.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-600">Invoice Number</span>
                  <input value={form.invoice_number} onChange={(e) => updateForm({ invoice_number: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-600">Currency</span>
                  <select value={form.currency} onChange={(e) => updateForm({ currency: e.target.value as 'PHP' | 'USD' })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]">
                    <option value="PHP">PHP</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-600">Issue Date</span>
                  <input type="date" value={form.issue_date} onChange={(e) => updateForm({ issue_date: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-600">Due Date</span>
                  <input type="date" value={form.due_date} onChange={(e) => updateForm({ due_date: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]" />
                </label>
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-gray-600">Payment Terms</span>
                  <input value={form.payment_terms} onChange={(e) => updateForm({ payment_terms: e.target.value })} placeholder="Due on receipt"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]" />
                </label>
              </div>
            </section>

            <section className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#111827]">Line Items</p>
                  <p className="text-xs text-gray-400 mt-1">Build the invoice like a document, one charge at a time.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLineItems((current) => [...current, { description: '', amount: '' }])}
                  className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-medium text-[#FF6B35] hover:bg-orange-100 cursor-pointer"
                >
                  <i className="ri-add-line"></i>
                  Add Item
                </button>
              </div>
              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={index} className="grid gap-3 rounded-xl border border-gray-100 bg-[#fcfcfc] p-3 md:grid-cols-[minmax(0,1fr)_160px_44px]">
                    <input
                      value={item.description}
                      onChange={(e) => updateLineItem(index, { description: e.target.value })}
                      placeholder="Description"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]"
                    />
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => updateLineItem(index, { amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]"
                    />
                    <button
                      type="button"
                      onClick={() => setLineItems((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index))}
                      className="rounded-xl border border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-200 cursor-pointer"
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6">
              <div className="mb-4">
                <p className="text-sm font-semibold text-[#111827]">Payment History</p>
                <p className="text-xs text-gray-400 mt-1">Choose whether received payments should appear in the invoice record.</p>
              </div>
              <label className="inline-flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={includePaymentHistory}
                  onChange={(e) => setIncludePaymentHistory(e.target.checked)}
                  className="h-4 w-4 accent-[#FF6B35]"
                />
                <span className="text-sm text-gray-700">Include payment history on invoice</span>
              </label>
            </section>

            <section className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6">
              <div className="mb-4">
                <p className="text-sm font-semibold text-[#111827]">Notes</p>
                <p className="text-xs text-gray-400 mt-1">Add context for the client and instructions for how they should pay.</p>
              </div>
              <div className="grid gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-600">Customer Notes</span>
                  <textarea value={form.customer_notes} onChange={(e) => updateForm({ customer_notes: e.target.value })} rows={4}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-600">Payment Instructions</span>
                  <textarea value={form.payment_instructions} onChange={(e) => updateForm({ payment_instructions: e.target.value })} rows={4}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-600">Balance Due</span>
                  <input value={form.amount_requested} onChange={(e) => updateForm({ amount_requested: e.target.value })}
                    className="w-full rounded-xl border border-[#FF6B35] px-3 py-2.5 text-sm font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/25 focus:border-[#FF6B35]" />
                </label>
              </div>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 self-start">
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <p className="text-sm font-semibold text-[#111827]">Live Preview</p>
                  <p className="text-xs text-gray-400 mt-1">This mirrors the final invoice document.</p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <div>Subtotal: {formatInvoiceCurrency(subtotal, form.currency)}</div>
                  <div>Balance: <span className="font-semibold text-[#FF6B35]">{formatInvoiceCurrency(balanceDue, form.currency)}</span></div>
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-[#f7f7f7]">
                <iframe title="Invoice preview" srcDoc={previewHtml} className="h-[980px] w-full bg-white" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}


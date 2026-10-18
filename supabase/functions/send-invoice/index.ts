import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireOwner, adminClient, authErrorResponse } from '../_shared/requireCaller.ts';
import { invoiceEmail } from './email.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'Huna Creatives Billing <billing@hunacreatives.com>';
const DEFAULT_BASE_URL = (
  Deno.env.get('PUBLIC_SITE_URL') ||
  Deno.env.get('SITE_URL') ||
  'https://www.hunacreatives.com'
).replace(/\/$/, '');
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const makeFmt = (currency: 'PHP' | 'USD') => (n: number) =>
  new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

function normalizeRecipients(input: unknown) {
  if (Array.isArray(input)) {
    return input.map((value) => String(value || '').trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input.split(/[,\n;]+/).map((value) => value.trim()).filter(Boolean);
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Admin-only workflow; ungated, any visitor could trigger it.
  try { await requireOwner(req, adminClient()); }
  catch (e) { const r = authErrorResponse(e, cors); if (r) return r; throw e; }

  try {
    const {
      to,
      cc,
      subject,
      client_name,
      project_name,
      service,
      contract_price,
      start_date,
      deadline,
      payments,
      show_payments,
      line_items,
      notes,
      bill_to_name,
      bill_to_address,
      reference,
      payment_terms,
      message,
      invoice_number,
      project_id,
      app_base_url,
      amount_requested,
      existing_invoice_log_id,
      preview_only,
      issue_date,
      currency,
    } = await req.json();
    const fmt = makeFmt(currency === 'USD' ? 'USD' : 'PHP');
    const toList = normalizeRecipients(to);
    const ccList = normalizeRecipients(cc);

    const lineItems: { description: string; amount: string }[] = line_items?.length
      ? line_items
      : [{ description: service ?? project_name, amount: String(contract_price) }];
    const lineItemsTotal = lineItems.reduce((s: number, i: any) => s + (parseFloat(i.amount) || 0), 0);
    const showPayments = show_payments !== false;

    if (toList.length === 0 || !client_name || !project_name) {
      return new Response(JSON.stringify({ error: 'to, client_name, and project_name are required' }), { status: 200, headers: cors });
    }

    const totalPaid: number = (payments ?? []).reduce((s: number, p: any) => s + p.amount, 0);
    const requestedAmount = amount_requested != null && String(amount_requested).trim() !== '' ? Number(amount_requested) : NaN;
    // A requested amount is authoritative. Otherwise: line-item subtotal capped
    // at the remaining contract balance, so full-contract invoices deduct
    // payments while installment invoices bill their own amount.
    const contractRemaining = Number(contract_price) > 0
      ? Math.max(Number(contract_price) - totalPaid, 0)
      : Number.POSITIVE_INFINITY;
    const amountDue: number = Number.isFinite(requestedAmount)
      ? Math.max(requestedAmount, 0)
      : Math.max(Math.min(lineItemsTotal, contractRemaining), 0);
    // Only render "− Total paid" in the summary when the arithmetic is real.
    const paymentsDeducted = Math.abs(lineItemsTotal - totalPaid - amountDue) < 0.005;
    const isPaid = amountDue <= 0;
    const fmtDate = (d: string | null | undefined) => d
      ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : '—';
    const issueDateFmt = fmtDate(issue_date || new Date().toISOString().slice(0, 10));
    // Never send an invoice dated due in the past (e.g. a stale project
    // deadline, or a scheduled invoice processed after its stored date).
    const todayIso = new Date().toISOString().slice(0, 10);
    const safeDueDate = deadline && deadline >= todayIso ? deadline : null;
    const dueDateFmt = fmtDate(safeDueDate);
    const billedTo = bill_to_name || client_name;
    if (existing_invoice_log_id) {
      await supabase
        .from('hub_invoice_payment_links')
        .update({ status: 'closed' })
        .eq('invoice_number', String(invoice_number))
        .eq('project_id', project_id ?? null)
        .eq('status', 'open');
    }

    const { data: paymentLink, error: paymentLinkError } = await supabase
      .from('hub_invoice_payment_links')
      .insert({
        project_id: project_id ?? null,
        invoice_number: String(invoice_number),
        client_name,
        project_name,
        to_email: toList.join(', '),
        amount_due: amountDue,
        due_date: safeDueDate,
        line_items: lineItems,
        payment_terms: payment_terms ?? null,
        reference: reference ?? null,
      })
      .select('token')
      .single();

    if (paymentLinkError || !paymentLink?.token) {
      return new Response(JSON.stringify({ error: paymentLinkError?.message ?? 'Failed to create payment link' }), { status: 200, headers: cors });
    }

    const normalizedAppBase =
      typeof app_base_url === 'string' && app_base_url.trim().length > 0
        ? app_base_url.replace(/\/$/, '')
        : DEFAULT_BASE_URL;
    const payUrl = `${normalizedAppBase}/pay/${paymentLink.token}`;

    // If this request is only for preview purposes, skip sending emails and return the token
    if (preview_only) {
      return new Response(JSON.stringify({ ok: true, token: paymentLink.token }), { headers: cors });
    }

    const paymentsOrdered = [...(payments ?? [])].sort((a: any, b: any) => {
      const at = new Date(a.paid_at).getTime();
      const bt = new Date(b.paid_at).getTime();
      if (Number.isNaN(at) || Number.isNaN(bt)) return 0;
      return at - bt;
    });

    const html = invoiceEmail({
      invoiceNo: String(invoice_number).padStart(4, '0'),
      billedTo,
      toLine: toList.join(', '),
      billToAddress: bill_to_address,
      projectName: project_name,
      service,
      startDate: start_date ? new Date(start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
      issueDate: issueDateFmt,
      dueDate: dueDateFmt,
      lineItems,
      payments: showPayments ? paymentsOrdered.map((p: any) => ({
        date: new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        note: p.notes ? p.notes : 'Payment received',
        amount: fmt(p.amount),
      })) : [],
      subtotal: fmt(lineItemsTotal),
      totalPaid: fmt(totalPaid),
      showPaidRow: showPayments && paymentsDeducted,
      amountDue: fmt(amountDue),
      isPaid,
      message,
      notes,
      payUrl,
      fmt,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: toList,
        ...(ccList.length > 0 ? { cc: ccList } : {}),
        bcc: ['contact@hunacreatives.com'],
        subject: subject ?? `Invoice #${String(invoice_number).padStart(4, '0')} — ${project_name}`,
        html,
      }),
    });
    clearTimeout(timeout);

    const resBody = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: resBody?.message ?? 'Failed to send email' }), { status: 200, headers: cors });
    }

    const logPayload = {
      invoice_number: String(invoice_number),
      project_id: project_id ?? null,
      client_name,
      project_name,
      sent_to: toList.join(', '),
      sent_cc: ccList.length > 0 ? ccList.join(', ') : null,
      subject: subject ?? null,
      contract_price: lineItemsTotal,
      total_paid: totalPaid,
      balance: amountDue,
      line_items: lineItems,
      show_payments: showPayments,
      sent_at: new Date().toISOString(),
    };

    if (existing_invoice_log_id) {
      await supabase.from('hub_invoice_log').update(logPayload).eq('id', existing_invoice_log_id);
    } else {
      await supabase.from('hub_invoice_log').insert(logPayload);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 200, headers: cors });
  }
});

import { reminderEmail } from './email.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'Huna Creatives Billing <billing@hunacreatives.com>';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const fmt = (n: number) =>
  '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const {
      to,
      client_name,
      project_name,
      amount_due,
      due_date,
      notes,
      total_paid,
      contract_price,
      pay_token,
    } = await req.json();

    if (!to || !client_name || !project_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 200, headers: cors });
    }

    const dueDateStr = due_date
      ? new Date(due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : null;
    const totalPaidSoFar = total_paid ?? 0;
    const contractTotal = contract_price ?? 0;

    const html = reminderEmail({
      clientName: client_name,
      projectName: project_name,
      amountDue: amount_due ? fmt(amount_due) : null,
      dueDate: dueDateStr,
      notes,
      paidToDate: contractTotal > 0 ? `${fmt(totalPaidSoFar)} of ${fmt(contractTotal)}` : null,
      payUrl: pay_token ? `https://hunacreatives.com/pay/${pay_token}` : null,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: `Payment Reminder — ${project_name}`,
        html,
      }),
    });

    const resBody = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: resBody?.message ?? 'Failed to send' }), { status: 200, headers: cors });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 200, headers: cors });
  }
});

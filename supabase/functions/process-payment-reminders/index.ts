import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const NOTIFY_USERS = ['U091BL9PQ77', 'U0838LWSY4E']; // Abigail, Francis

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const fmt = (n: number) =>
  '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function slackPost(path: string, body: object) {
  const res = await fetch(`https://slack.com/api/${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function notifySlack(client_name: string, project_name: string, amount_due: number | null) {
  const amountStr = amount_due ? ` · *${fmt(amount_due)}* due` : '';
  const text = `📧 *Payment reminder sent* to *${client_name}* for *${project_name}*${amountStr}.`;
  await Promise.all(NOTIFY_USERS.map(async (userId) => {
    const opened = await slackPost('conversations.open', { users: userId });
    const channel = opened.ok ? opened.channel?.id : userId;
    await slackPost('chat.postMessage', {
      channel,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text } },
        {
          type: 'actions',
          elements: [{
            type: 'button',
            text: { type: 'plain_text', text: 'View Projects →', emoji: true },
            url: 'https://hunacreatives.com/hub/admin/projects',
          }],
        },
      ],
    });
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const today = new Date().toISOString().slice(0, 10);

  const { data: reminders, error } = await supabase
    .from('hub_payment_reminders')
    .select('*, hub_projects(id, client_name, project_name, contact_email, contract_price, hub_project_payments(amount))')
    .eq('status', 'pending')
    .lte('send_date', today);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: cors });
  }

  const results: { id: number; ok: boolean; skipped?: boolean; error?: string }[] = [];

  for (const reminder of reminders ?? []) {
    const project = reminder.hub_projects;

    // Skip if project is fully paid — cancel all pending reminders for it
    const totalPaid = (project?.hub_project_payments ?? []).reduce((s: number, p: any) => s + p.amount, 0);
    const contractPrice = project?.contract_price ?? 0;
    if (contractPrice > 0 && totalPaid >= contractPrice) {
      await supabase
        .from('hub_payment_reminders')
        .update({ status: 'cancelled' })
        .eq('project_id', reminder.project_id)
        .eq('status', 'pending');
      results.push({ id: reminder.id, ok: true, skipped: true });
      continue;
    }

    if (!project?.contact_email) {
      results.push({ id: reminder.id, ok: false, error: 'No contact email on project' });
      continue;
    }

    // Create a payment link so the client can submit proof via /pay/:token
    const invoiceNumber = `REMIND-${reminder.id}`;
    const { data: payLink } = await supabase
      .from('hub_invoice_payment_links')
      .insert({
        project_id: reminder.project_id,
        invoice_number: invoiceNumber,
        client_name: project.client_name,
        project_name: project.project_name,
        to_email: project.contact_email,
        amount_due: reminder.amount_due ?? (contractPrice - totalPaid) ?? 0,
        due_date: reminder.send_date,
        line_items: reminder.notes ? [{ description: reminder.notes, amount: String(reminder.amount_due ?? '') }] : null,
        reference: invoiceNumber,
      })
      .select('token')
      .single();

    const payToken = payLink?.token ?? null;

    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-payment-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({
        to: project.contact_email,
        client_name: project.client_name,
        project_name: project.project_name,
        amount_due: reminder.amount_due,
        due_date: reminder.send_date,
        notes: reminder.notes,
        total_paid: totalPaid,
        contract_price: contractPrice,
        pay_token: payToken,
      }),
    });

    const body = await res.json();
    if (body.ok) {
      // Mark reminder as sent
      await supabase
        .from('hub_payment_reminders')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', reminder.id);

      // Log to hub_invoice_log so it appears in the Invoice Log page
      await supabase.from('hub_invoice_log').insert({
        invoice_number: invoiceNumber,
        project_id: reminder.project_id,
        client_name: project.client_name,
        project_name: project.project_name,
        sent_to: project.contact_email,
        subject: `Payment Reminder — ${project.project_name}`,
        contract_price: contractPrice || null,
        total_paid: totalPaid || null,
        balance: contractPrice ? contractPrice - totalPaid : null,
        line_items: reminder.amount_due
          ? [{ description: reminder.notes || 'Payment due', amount: String(reminder.amount_due) }]
          : null,
        source: 'payment_reminder',
        pay_link_token: payToken,
      });

      try { await notifySlack(project.client_name, project.project_name, reminder.amount_due); } catch (_) {}

      results.push({ id: reminder.id, ok: true });
    } else {
      results.push({ id: reminder.id, ok: false, error: body.error });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), { headers: cors });
});

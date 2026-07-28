import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hasPush } from '../_shared/push.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const NOTIFY_EMAILS = ['duterteabigaile@gmail.com', 'francisfielroble@gmail.com']; // Abigail, Francis
const FROM_EMAIL = 'Sentro OS <noreply@hunacreatives.com>';
const OT_URL = 'https://www.hunacreatives.com/hub/contractor/overtime';
const ADMIN_OT_URL = 'https://www.hunacreatives.com/hub/admin/attendance';

async function sendOvertimeApprovedEmail(contractor_name: string, hours: number, dateLabel: string) {
  if (!RESEND_API_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: NOTIFY_EMAILS,
      subject: `Overtime Approved: ${contractor_name}`,
      html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;padding:32px;margin:0">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#111827;padding:20px 24px"><span style="color:#fff;font-weight:700;font-size:14px;letter-spacing:0.05em">SENTRO <span style="color:#FF6B35">OS</span></span></div>
  <div style="padding:24px">
    <h2 style="margin:0 0 12px;font-size:16px;color:#111827">✅ Overtime Approved</h2>
    <p style="color:#4b5563;font-size:14px;margin:0 0 16px"><strong>${contractor_name}</strong>'s ${hours}h overtime request for ${dateLabel} was approved and will be reflected in payroll.</p>
    <a href="${ADMIN_OT_URL}" style="display:inline-block;background:#FF6B35;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">View Attendance →</a>
  </div>
</div></body></html>`,
    }),
  }).catch(() => {});
}

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

async function sendPush(user_id: string, title: string, body: string, url?: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, title, body, url }),
    });
  } catch {}
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { contractor_id, date, hours, decision } = await req.json() as {
      contractor_id: string;
      date: string;
      hours: number;
      decision: 'approved' | 'rejected';
    };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: user } = await supabase
      .from('hub_users')
      .select('slack_id, full_name')
      .eq('id', contractor_id)
      .single();

    const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const approved = decision === 'approved';
    const notifTitle = approved ? 'Overtime approved' : 'Overtime not approved';
    const notifBody = approved
      ? `Your ${hours}h OT request for ${dateLabel} has been approved.`
      : `Your ${hours}h OT request for ${dateLabel} was not approved.`;

    await supabase.from('hub_notifications').insert({
      user_id: contractor_id,
      type: approved ? 'overtime_approved' : 'overtime_rejected',
      title: notifTitle,
      body: notifBody,
      link: OT_URL,
      read: false,
    }).catch(() => {});

    if (user?.slack_id && SLACK_BOT_TOKEN && !(await hasPush(user.id))) {
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: user.slack_id,
          text: notifBody,
          unfurl_links: false,
          unfurl_media: false,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${approved ? '✅' : '❌'} *${notifTitle}*\n${notifBody}`,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'View Overtime →' },
                  url: OT_URL,
                  style: approved ? 'primary' : 'danger',
                },
              ],
            },
          ],
        }),
      }).catch(() => {});
    }

    await sendPush(contractor_id, notifTitle, notifBody, OT_URL);

    if (approved) {
      await sendOvertimeApprovedEmail(user?.full_name || 'A contractor', hours, dateLabel);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

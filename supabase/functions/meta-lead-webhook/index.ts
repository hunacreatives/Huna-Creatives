import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Meta Lead Ads webhook (Page → "leadgen" field).
// For every Instant Form lead: fetch the answers from the Graph API, save the
// lead to the contact inbox (contact_submissions, source 'meta_lead'), email
// the lead an auto-reply, and email the team the full answers.
//
// verify_jwt = false (Meta can't send a Supabase JWT). Requests are trusted
// only when the X-Hub-Signature-256 header matches META_APP_SECRET.
//
// Secrets: META_ACCESS_TOKEN (system user, needs leads_retrieval),
//          META_APP_SECRET, META_WEBHOOK_VERIFY_TOKEN, RESEND_API_KEY.

const GRAPH = 'https://graph.facebook.com/v23.0/';
const META_TOKEN = Deno.env.get('META_ACCESS_TOKEN') ?? '';
const APP_SECRET = Deno.env.get('META_APP_SECRET') ?? '';
const VERIFY_TOKEN = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

const FROM_EMAIL = 'Huna Creatives <contact@hunacreatives.com>';
const REPLY_TO = 'contact@hunacreatives.com';
const NOTIFY_EMAIL = 'contact@hunacreatives.com';
const SERVICE_LABEL = 'Website (Meta ad)';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Multiple-choice answers can come back with underscores for spaces
// ("₱60,000_-_₱100,000"); map them back to the exact option text.
const OPTIONS = [
  'Real estate / property', 'Architecture / interiors / construction', 'Clinic / health / wellness',
  'Hotel / resort / restaurant', 'Retail / e-commerce brand', 'Professional services', 'Other',
  'Below ₱60,000', '₱60,000 - ₱100,000', '₱100,000 - ₱200,000', '₱200,000+',
  'Within 1 month', '1 - 3 months', 'Just exploring',
  'Messenger', 'Viber', 'Phone call', 'Email',
];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9₱+]/g, '');
function pretty(v: string): string {
  const hit = OPTIONS.find((o) => norm(o) === norm(v));
  return hit ?? v.replace(/_/g, ' ').trim();
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function validSignature(raw: string, header: string | null): Promise<boolean> {
  if (!APP_SECRET || !header?.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(APP_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(hex, header.slice(7));
}

async function graph(path: string, token: string) {
  const res = await fetch(GRAPH + path, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message ?? 'Graph API error');
  return body;
}

// Leads can usually be read with the system-user token; some Page setups
// insist on a Page token, so fall back to one.
async function fetchLead(leadgenId: string, pageId: string | null) {
  const path = `${leadgenId}?fields=created_time,field_data,ad_id,ad_name,adset_name,campaign_name,form_id,platform,is_organic`;
  try {
    return await graph(path, META_TOKEN);
  } catch (err) {
    if (!pageId) throw err;
    const page = await graph(`${pageId}?fields=access_token`, META_TOKEN);
    return await graph(path, page.access_token);
  }
}

async function sendEmail(payload: Record<string, unknown>) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

function manilaTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// ── Emails ──────────────────────────────────────────────────────────────────

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

function shell(title: string, rows: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${esc(title)}</title>
  <style>
    @media only screen and (max-width:600px){
      .email-wrapper{padding:0!important}
      .email-body{padding:32px 20px!important}
      .email-header{padding:24px 20px!important}
      .email-footer{padding:20px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f2f2f0;-webkit-text-size-adjust:100%">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#f2f2f0">
    <tr><td align="center" class="email-wrapper" style="padding:40px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
        <tr><td class="email-header" style="background:#111111;padding:28px 40px;border-bottom:3px solid #FF6B35">
          <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives" height="32"
               style="display:block;height:32px;width:auto;border:0;outline:0;text-decoration:none">
        </td></tr>
        <tr><td class="email-body" style="padding:44px 40px 36px;background:#ffffff">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">${rows}</table>
        </td></tr>
        <tr><td class="email-footer" style="background:#111111;padding:24px 40px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
            <tr>
              <td style="font-family:${SANS};font-size:11px;color:#888888;letter-spacing:0.08em;text-transform:uppercase">Huna Creatives</td>
              <td align="right" style="font-family:${SANS};font-size:11px"><a href="mailto:contact@hunacreatives.com" style="color:#FF6B35;text-decoration:none">contact@hunacreatives.com</a></td>
            </tr>
            <tr><td colspan="2" style="font-family:${SANS};font-size:11px;color:#555555;padding-top:4px">Cebu City, Philippines</td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const para = (html: string) =>
  `<tr><td style="padding:0 0 16px;font-size:15px;line-height:1.75;color:#2a2a2a;font-family:${SERIF}">${html}</td></tr>`;

function summaryTable(rows: [string, string][]): string {
  const trs = rows.filter(([, v]) => v).map(([k, v]) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#777777;width:130px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;color:#1a1a1a">${esc(v)}</td></tr>`).join('');
  return `<tr><td style="padding:0 0 20px"><table cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:100%;background:#f7f7f5;border-radius:4px;padding:12px 18px;font-family:${SANS};font-size:13px;line-height:1.5">${trs}</table></td></tr>`;
}

function howWeReach(channel: string, phone: string): string {
  switch (channel) {
    case 'Phone call': return phone ? `call you at ${phone}` : 'call you';
    case 'Viber': return phone ? `message you on Viber at ${phone}` : 'message you on Viber';
    case 'Messenger': return 'message you on Messenger';
    case 'Email': return 'email you';
    default: return 'get in touch';
  }
}

function autoReply(l: Lead): { subject: string; html: string; text: string } {
  const first = l.name.split(/\s+/)[0] || 'there';
  const reach = howWeReach(l.channel, l.phone);
  const subject = 'We received your website inquiry';
  const rows = [
    para(`Hi ${esc(first)},`),
    para('Thanks for reaching out about a website. Here is what you sent us:'),
    summaryTable([['Business', l.business], ['Budget', l.budget], ['Timeline', l.timeline]]),
    para(`What happens next: we will ${esc(reach)} within one working day to ask a few questions about your business. Your fixed quote follows within 24 hours of that conversation. No hidden fees.`),
    ...(l.channel === 'Messenger'
      ? [para('If it is easier, you can also message us first at <a href="https://m.me/hunacreatives" style="color:#FF6B35">m.me/hunacreatives</a>.')]
      : []),
    para('While you wait, here is some of our recent work: <a href="https://hunacreatives.com/portfolio" style="color:#FF6B35">hunacreatives.com/portfolio</a>'),
    para('If anything is urgent, just reply to this email.'),
    para('Huna Creatives<br><span style="color:#777777">Cebu, Philippines</span>'),
  ].join('');
  const text = [
    `Hi ${first},`, '',
    'Thanks for reaching out about a website. Here is what you sent us:',
    `Business: ${l.business} · Budget: ${l.budget} · Timeline: ${l.timeline}`, '',
    `What happens next: we will ${reach} within one working day to ask a few questions about your business. Your fixed quote follows within 24 hours of that conversation. No hidden fees.`, '',
    ...(l.channel === 'Messenger' ? ['If it is easier, you can also message us first at m.me/hunacreatives.', ''] : []),
    'While you wait, here is some of our recent work: hunacreatives.com/portfolio', '',
    'If anything is urgent, just reply to this email.', '',
    'Huna Creatives', 'Cebu, Philippines',
  ].join('\n');
  return { subject, html: shell(subject, rows), text };
}

// ── Lead parsing ────────────────────────────────────────────────────────────

interface Lead {
  leadgenId: string; name: string; email: string; phone: string;
  business: string; website: string; budget: string; timeline: string; channel: string;
  adName: string; campaign: string; platform: string; createdTime: string; isTest: boolean;
  answers: Record<string, string>;
}

// deno-lint-ignore no-explicit-any
function parseLead(leadgenId: string, raw: any): Lead {
  const answers: Record<string, string> = {};
  for (const f of raw.field_data ?? []) answers[f.name] = pretty(String(f.values?.[0] ?? ''));
  const all = Object.values(answers).join(' ').toLowerCase();
  return {
    leadgenId,
    name: answers.full_name || [answers.first_name, answers.last_name].filter(Boolean).join(' ') || 'Meta lead',
    email: (answers.email ?? '').trim(),
    phone: (answers.phone_number ?? '').trim(),
    business: answers.business_type ?? '',
    website: answers.current_website ?? '',
    budget: answers.budget ?? '',
    timeline: answers.timeline ?? '',
    channel: answers.contact_channel ?? '',
    adName: raw.ad_name ?? '',
    campaign: raw.campaign_name ?? '',
    platform: raw.platform ?? '',
    createdTime: raw.created_time ?? new Date().toISOString(),
    // Leads from Meta's Lead Ads Testing Tool carry dummy values.
    isTest: all.includes('test lead') || all.includes('dummy data'),
    answers,
  };
}

function inboxMessage(l: Lead): string {
  return [
    `Business: ${l.business}`,
    `Current website: ${l.website}`,
    `Budget: ${l.budget}`,
    `Timeline: ${l.timeline}`,
    `Preferred contact: ${l.channel}`,
    `Phone: ${l.phone}`,
    `Email: ${l.email}`,
    '',
    `Ad: ${l.adName}${l.platform ? ` (${l.platform === 'ig' ? 'Instagram' : 'Facebook'})` : ''}`,
    `Submitted: ${manilaTime(l.createdTime)}`,
  ].join('\n');
}

// ── Processing ──────────────────────────────────────────────────────────────

async function processLead(leadgenId: string, pageId: string | null, sendAutoReply: boolean) {
  let lead: Lead;
  try {
    lead = parseLead(leadgenId, await fetchLead(leadgenId, pageId));
  } catch (err) {
    // Never lose a lead silently: tell the team to pick it up in Leads Center.
    console.error('fetch lead failed', leadgenId, err);
    await sendEmail({
      from: FROM_EMAIL, to: [NOTIFY_EMAIL],
      subject: 'New Meta lead — open Leads Center (details could not be loaded)',
      text: `A new lead came in (lead id ${leadgenId}) but its answers could not be read automatically:\n${String(err)}\n\nOpen Meta Business Suite → Leads Center to see it. No auto-reply was sent.`,
    }).catch((e) => console.error('alert email failed', e));
    return { leadgenId, ok: false, error: String(err) };
  }

  // Insert-or-skip on meta_lead_id: Meta can deliver the same lead more than once.
  const { data: inserted, error: dbError } = await supabase
    .from('contact_submissions')
    .upsert({
      source: 'meta_lead',
      meta_lead_id: leadgenId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone || null,
      subject: [lead.budget, lead.timeline].filter(Boolean).join(' · '),
      service: SERVICE_LABEL,
      message: inboxMessage(lead),
      meta_payload: { answers: lead.answers, ad_name: lead.adName, campaign_name: lead.campaign, platform: lead.platform, created_time: lead.createdTime, is_test: lead.isTest },
      created_at: lead.createdTime,
    }, { onConflict: 'meta_lead_id', ignoreDuplicates: true })
    .select('id');
  if (dbError) {
    await sendEmail({
      from: FROM_EMAIL, to: [NOTIFY_EMAIL],
      subject: `New Meta lead: ${lead.name} — not saved to the Hub`,
      text: `${inboxMessage(lead)}\n\nCould not save to the Hub (${dbError.message}). No auto-reply was sent; reply manually.`,
    }).catch((e) => console.error('alert email failed', e));
    throw new Error(`DB: ${dbError.message}`);
  }
  if (!inserted?.length) return { leadgenId, ok: true, duplicate: true };
  const submissionId = inserted[0].id;

  // Auto-reply to the lead.
  let replyNote = 'Auto-reply sent.';
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
  if (lead.isTest) replyNote = 'Test lead — no auto-reply sent.';
  else if (!sendAutoReply) replyNote = 'Imported without an auto-reply.';
  else if (!validEmail) replyNote = 'No valid email — no auto-reply sent.';
  else {
    try {
      const mail = autoReply(lead);
      await sendEmail({ from: FROM_EMAIL, to: [lead.email], reply_to: REPLY_TO, subject: mail.subject, html: mail.html, text: mail.text });
      await supabase.from('contact_submissions').update({ auto_reply_sent_at: new Date().toISOString() }).eq('id', submissionId);
    } catch (err) {
      console.error('auto-reply failed', leadgenId, err);
      replyNote = `Auto-reply FAILED: ${String(err)}`;
    }
  }

  // Team notification.
  const title = `${lead.isTest ? '[TEST] ' : ''}New Meta lead: ${lead.name}${lead.budget ? ` — ${lead.budget}` : ''}${lead.timeline ? `, ${lead.timeline}` : ''}`;
  const rows = [
    para(`<strong>${esc(lead.name)}</strong> wants to be reached by <strong>${esc(lead.channel || 'any channel')}</strong>. Reply within the hour if you can.`),
    summaryTable([
      ['Business', lead.business], ['Current website', lead.website], ['Budget', lead.budget],
      ['Timeline', lead.timeline], ['Contact via', lead.channel], ['Phone', lead.phone], ['Email', lead.email],
      ['Ad', lead.adName], ['Submitted', manilaTime(lead.createdTime)],
    ]),
    para(`<span style="font-size:13px;color:#777777">${esc(replyNote)} Saved to the Hub contact inbox.</span>`),
  ].join('');
  await sendEmail({
    from: FROM_EMAIL, to: [NOTIFY_EMAIL], reply_to: validEmail ? lead.email : undefined,
    subject: title, html: shell(title, rows), text: `${inboxMessage(lead)}\n\n${replyNote}`,
  }).catch((e) => console.error('notify email failed', e));

  return { leadgenId, ok: true, submissionId, replyNote };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Webhook verification handshake (when the subscription is created).
  if (req.method === 'GET') {
    const ok = url.searchParams.get('hub.mode') === 'subscribe' && VERIFY_TOKEN
      && timingSafeEqual(url.searchParams.get('hub.verify_token') ?? '', VERIFY_TOKEN);
    return ok ? new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 }) : new Response('Forbidden', { status: 403 });
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const raw = await req.text();

  // Manual import of existing leads (e.g. ones that arrived before the webhook):
  // POST {"leadgen_ids": [...], "send_auto_reply": false} with x-import-key = META_WEBHOOK_VERIFY_TOKEN.
  const importKey = req.headers.get('x-import-key');
  if (importKey) {
    if (!VERIFY_TOKEN || !timingSafeEqual(importKey, VERIFY_TOKEN)) return json({ error: 'Forbidden' }, 403);
    const { leadgen_ids = [], send_auto_reply = false, page_id = null } = JSON.parse(raw || '{}');
    const results = [];
    for (const id of leadgen_ids) {
      try { results.push(await processLead(String(id), page_id, !!send_auto_reply)); }
      catch (err) { results.push({ leadgenId: id, ok: false, error: String(err) }); }
    }
    return json({ results });
  }

  if (!(await validSignature(raw, req.headers.get('x-hub-signature-256')))) {
    return new Response('Invalid signature', { status: 401 });
  }

  // deno-lint-ignore no-explicit-any
  const body: any = JSON.parse(raw);
  const results = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen' || !change.value?.leadgen_id) continue;
      try {
        results.push(await processLead(String(change.value.leadgen_id), change.value.page_id ? String(change.value.page_id) : String(entry.id ?? ''), true));
      } catch (err) {
        console.error('process lead failed', change.value.leadgen_id, err);
        results.push({ leadgenId: change.value.leadgen_id, ok: false, error: String(err) });
      }
    }
  }
  console.log('meta-lead-webhook', JSON.stringify(results));
  // Always 200 once the signature checks out, so Meta doesn't retry-storm;
  // failures are emailed to the team above.
  return json({ received: true });
});

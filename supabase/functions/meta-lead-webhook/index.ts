import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { autoReply, teamLeadEmail, type LeadForEmail } from './email.ts';

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
// Per-form wording: the booking-website form (Oct 2026) reuses the current_website
// key for "How do clients book with you now?".
const FORM_LABELS: Record<string, { service: string; website: string }> = {
  '1141322145031619': { service: 'Booking website (Meta ad)', website: 'Books clients via' },
};
const labelsFor = (formId: string) => FORM_LABELS[formId] ?? { service: SERVICE_LABEL, website: 'Current website' };

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Real leads return multiple-choice answers as option keys ("o0", "o1"), which
// are resolved against the form's questions (formOptions). API test leads can
// return the text with underscores for spaces ("₱60,000_-_₱100,000"); pretty()
// maps those back to the exact option text.
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

// question key → option key → option text, per form (cached per instance).
type OptionMap = Record<string, Record<string, string>>;
const formOptionCache = new Map<string, OptionMap>();
// Fallback for the Oct 2026 quote-request form if the questions can't be fetched.
const FALLBACK_OPTIONS: Record<string, OptionMap> = {
  '1407340998172485': {
    business_type: { o0: 'Real estate / property', o1: 'Architecture / interiors / construction', o2: 'Clinic / health / wellness', o3: 'Hotel / resort / restaurant', o4: 'Retail / e-commerce brand', o5: 'Professional services', o6: 'Other' },
    budget: { o0: 'Below ₱60,000', o1: '₱60,000 - ₱100,000', o2: '₱100,000 - ₱200,000', o3: '₱200,000+' },
    timeline: { o0: 'Within 1 month', o1: '1 - 3 months', o2: 'Just exploring' },
    contact_channel: { o0: 'Messenger', o1: 'Viber', o2: 'Phone call', o3: 'Email' },
  },
};

async function formOptions(formId: string | undefined): Promise<OptionMap> {
  if (!formId) return {};
  const cached = formOptionCache.get(formId);
  if (cached) return cached;
  try {
    const form = await graph(`${formId}?fields=questions`, META_TOKEN);
    const map: OptionMap = {};
    for (const q of form.questions ?? []) {
      if (!q.options?.length) continue;
      map[q.key] = Object.fromEntries(q.options.map((o: { key: string; value: string }) => [o.key, o.value]));
    }
    formOptionCache.set(formId, map);
    return map;
  } catch (err) {
    console.error('form questions fetch failed', formId, err);
    return FALLBACK_OPTIONS[formId] ?? {};
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

// ── Lead parsing ────────────────────────────────────────────────────────────

interface Lead {
  leadgenId: string; name: string; email: string; phone: string;
  business: string; website: string; budget: string; timeline: string; channel: string;
  adName: string; campaign: string; platform: string; createdTime: string; isTest: boolean; formId: string;
  answers: Record<string, string>;
}

// deno-lint-ignore no-explicit-any
function parseLead(leadgenId: string, raw: any, options: OptionMap): Lead {
  const answers: Record<string, string> = {};
  for (const f of raw.field_data ?? []) {
    const v = String(f.values?.[0] ?? '');
    answers[f.name] = options[f.name]?.[v] ?? pretty(v);
  }
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
    formId: String(raw.form_id ?? ''),
    campaign: raw.campaign_name ?? '',
    platform: raw.platform ?? '',
    createdTime: raw.created_time ?? new Date().toISOString(),
    // Leads from Meta's Lead Ads Testing Tool carry dummy values.
    isTest: all.includes('test lead') || all.includes('dummy data'),
    answers,
  };
}

function forEmail(l: Lead): LeadForEmail {
  return {
    name: l.name, email: l.email, phone: l.phone, business: l.business, website: l.website,
    budget: l.budget, timeline: l.timeline, channel: l.channel, adName: l.adName,
    submitted: manilaTime(l.createdTime), websiteLabel: labelsFor(l.formId).website,
  };
}

function inboxMessage(l: Lead): string {
  return [
    `Business: ${l.business}`,
    `${labelsFor(l.formId).website}: ${l.website}`,
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

// Multiple-choice answers that are still raw option keys couldn't be decoded.
const undecoded = (l: Lead) => [l.business, l.budget, l.timeline, l.channel].some((v) => /^o\d+$/.test(v));

async function processLead(leadgenId: string, pageId: string | null, sendAutoReply: boolean, refresh = false) {
  let lead: Lead;
  try {
    const raw = await fetchLead(leadgenId, pageId);
    lead = parseLead(leadgenId, raw, await formOptions(raw.form_id));
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
      service: labelsFor(lead.formId).service,
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
  if (!inserted?.length) {
    if (!refresh) return { leadgenId, ok: true, duplicate: true };
    const { error } = await supabase.from('contact_submissions').update({
      subject: [lead.budget, lead.timeline].filter(Boolean).join(' · '),
      message: inboxMessage(lead),
      meta_payload: { answers: lead.answers, ad_name: lead.adName, campaign_name: lead.campaign, platform: lead.platform, created_time: lead.createdTime, is_test: lead.isTest },
    }).eq('meta_lead_id', leadgenId);
    if (error) throw new Error(`DB: ${error.message}`);
    return { leadgenId, ok: true, refreshed: true, budget: lead.budget, timeline: lead.timeline, channel: lead.channel };
  }
  const submissionId = inserted[0].id;

  // Auto-reply to the lead.
  let replyNote = 'Auto-reply sent.';
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
  if (lead.isTest) replyNote = 'Test lead — no auto-reply sent.';
  else if (!sendAutoReply) replyNote = 'Imported without an auto-reply.';
  else if (!validEmail) replyNote = 'No valid email — no auto-reply sent.';
  else if (undecoded(lead)) replyNote = 'Form answers could not be decoded — no auto-reply sent. Check Leads Center.';
  else {
    try {
      const mail = autoReply(forEmail(lead));
      await sendEmail({ from: FROM_EMAIL, to: [lead.email], reply_to: REPLY_TO, subject: mail.subject, html: mail.html, text: mail.text });
      await supabase.from('contact_submissions').update({ auto_reply_sent_at: new Date().toISOString() }).eq('id', submissionId);
    } catch (err) {
      console.error('auto-reply failed', leadgenId, err);
      replyNote = `Auto-reply FAILED: ${String(err)}`;
    }
  }

  // Team notification.
  const title = `${lead.isTest ? '[TEST] ' : ''}New Meta lead: ${lead.name}${lead.budget ? ` — ${lead.budget}` : ''}${lead.timeline ? `, ${lead.timeline}` : ''}`;
  await sendEmail({
    from: FROM_EMAIL, to: [NOTIFY_EMAIL], reply_to: validEmail ? lead.email : undefined,
    subject: title, html: teamLeadEmail(forEmail(lead), title, replyNote), text: `${inboxMessage(lead)}\n\n${replyNote}`,
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
  // POST {"leadgen_ids": [...], "send_auto_reply": false, "refresh": false} with x-import-key = META_WEBHOOK_VERIFY_TOKEN.
  const importKey = req.headers.get('x-import-key');
  if (importKey) {
    if (!VERIFY_TOKEN || !timingSafeEqual(importKey, VERIFY_TOKEN)) return json({ error: 'Forbidden' }, 403);
    // "refresh": true rewrites already-saved leads' inbox text (no emails).
    const { leadgen_ids = [], send_auto_reply = false, page_id = null, refresh = false } = JSON.parse(raw || '{}');
    const results = [];
    for (const id of leadgen_ids) {
      try { results.push(await processLead(String(id), page_id, !!send_auto_reply, !!refresh)); }
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

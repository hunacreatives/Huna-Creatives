// Called by the public quotation page when a client accepts (or declines).
//
// Deliberately NOT admin-gated: the caller is an anonymous client on a shared
// link. The write itself is authorised by RLS -- "public_accept" limits it to
// rows already out for decision, and the column grants in migration
// 20260824000001 limit it to the acceptance fields. This function does the
// parts the browser must not be trusted with: recording the timestamp
// server-side, and sending mail.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderQuotePdf, computeQuoteTotals, fmtMoney, QuoteRecord } from '../_shared/quotationTemplate.ts';
import { QUESTIONNAIRE_TEMPLATES } from '../_shared/questionnaireTemplates.ts';
import { nextStepsEmail, teamDecisionEmail } from './email.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN') ?? '';
const PDFSHIFT_API_KEY = Deno.env.get('PDFSHIFT_API_KEY') ?? '';
const ADMIN_SLACK_IDS = ['U091BL9PQ77', 'U0838LWSY4E'];
const FROM_EMAIL = 'Huna Creatives <contact@hunacreatives.com>';
const TEAM_EMAIL = 'contact@hunacreatives.com';
const HUB = 'https://hub.hunacreatives.com';
const SITE = 'https://www.hunacreatives.com';
// Fallback project-brief form for the "proposal approved" email when the
// proposal has no intake_template set. Leave blank and the email tells the
// client the form is coming separately.
const PROJECT_FORM_URL = '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

async function htmlToPdf(html: string): Promise<Uint8Array> {
  if (!PDFSHIFT_API_KEY) throw new Error('PDFSHIFT_API_KEY secret is not set');
  const res = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`api:${PDFSHIFT_API_KEY}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source: html, use_print: true }),
  });
  if (!res.ok) throw new Error(`PDFShift conversion failed: ${res.status} ${await res.text()}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function slackDm(userId: string, text: string, blocks?: object[]) {
  if (!SLACK_BOT_TOKEN) return;
  const opened = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ users: userId }),
  });
  const { channel } = await opened.json();
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: channel?.id ?? userId, text, unfurl_links: false, ...(blocks ? { blocks } : {}) }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { slug, accepted_by_name, note, decision = 'accepted' } = await req.json();
    if (!slug) {
      return new Response(JSON.stringify({ error: 'slug is required' }), { status: 400, headers: cors });
    }
    if (decision !== 'accepted' && decision !== 'declined') {
      return new Response(JSON.stringify({ error: 'invalid decision' }), { status: 400, headers: cors });
    }

    const { data: quote, error: readErr } = await supabase
      .from('hub_proposals')
      .select('*')
      .eq('slug', slug)
      .single();

    if (readErr || !quote) {
      return new Response(JSON.stringify({ error: 'Quotation not found' }), { status: 404, headers: cors });
    }

    // Idempotency: a double-tap on a slow connection must not send a second
    // acceptance email or re-stamp the timestamp.
    if (quote.status === 'accepted' || quote.status === 'declined') {
      return new Response(JSON.stringify({ ok: true, already: quote.status }), { headers: cors });
    }
    // Proposals are shared while still "published"; quotations get "sent".
    // Both are fair game once the client is on the link acting on it.
    const OPEN = ['published', 'sent', 'viewed'];
    if (!OPEN.includes(quote.status)) {
      return new Response(JSON.stringify({ error: 'This document is not open for a decision.' }), { status: 409, headers: cors });
    }

    const now = new Date().toISOString();
    const signer = String(accepted_by_name ?? '').trim().slice(0, 120) || quote.client_name;

    const patch = decision === 'accepted'
      ? { status: 'accepted', accepted_at: now, accepted_by_name: signer, accepted_note: note ?? null }
      : { status: 'declined', declined_at: now, accepted_by_name: signer, accepted_note: note ?? null };

    // Guard the transition in the WHERE clause too, so two concurrent accepts
    // can't both pass the status check above and both write.
    const { data: updated, error: updErr } = await supabase
      .from('hub_proposals')
      .update(patch)
      .eq('id', quote.id)
      .in('status', OPEN)
      .select()
      .single();

    if (updErr || !updated) {
      return new Response(JSON.stringify({ error: 'Could not record your response. Please try again.' }), { status: 500, headers: cors });
    }

    const q = { ...quote, ...patch } as unknown as QuoteRecord;
    const currency = q.currency === 'USD' ? 'USD' : 'PHP';
    const totals = computeQuoteTotals(q.line_items, q.discount, q.tax_rate);
    const isProposal = quote.doc_type === 'proposal';
    const Noun = isProposal ? 'Proposal' : 'Quotation';
    const verbA = decision === 'accepted' ? (isProposal ? 'approved' : 'accepted') : 'declined';
    const title = q.project_title || `${Noun} for ${q.client_name}`;
    // A proposal often carries only an indicative figure — don't state it as final.
    const money = totals.total > 0 && !isProposal ? fmtMoney(totals.total, currency) : '';
    const amt = money ? ` — ${money}` : '';
    const accepted = decision === 'accepted';

    // ── Notify the team (the only step Francis actually needs) ──────────
    const slackText = accepted
      ? `✅ *${Noun} ${verbA}*\n*${q.client_name}* ${verbA} *${title}*${amt}.\nRecorded by ${signer}.${note ? `\n\n> ${note}` : ''}\n\nNext: send the agreement.`
      : `⚠️ *${Noun} declined*\n*${q.client_name}* declined *${title}*${amt}.${note ? `\n\n> ${note}` : ''}`;

    const blocks = [
      { type: 'section', text: { type: 'mrkdwn', text: slackText } },
      {
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: 'Open in hub →', emoji: true },
          url: `${HUB}/hub/admin/proposals/${quote.id}`,
          ...(accepted ? { style: 'primary' } : {}),
        }],
      },
    ];
    await Promise.all(ADMIN_SLACK_IDS.map((id) => slackDm(id, slackText, blocks).catch(() => {})));

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TEAM_EMAIL],
        subject: accepted
          ? `${Noun} ${verbA} — ${title}${money ? ` (${money})` : ''}`
          : `${Noun} declined — ${title}`,
        html: teamDecisionEmail({
          noun: Noun, verb: verbA, accepted, isProposal, clientName: q.client_name, title, money,
          signer, note, proposalId: quote.id,
        }),
      }),
    }).catch(console.error);

    // ── A PDF copy of what they approved, attached to the one next-steps
    // email below. Only when there's a real total to render, and best-effort
    // — a PDFShift outage must never surface as a failed acceptance.
    let pdfSent = false;
    let pdfAttachment: { filename: string; content: string } | null = null;
    if (accepted && quote.to_email && totals.total > 0) {
      try {
        const pdfBytes = await htmlToPdf(renderQuotePdf(q));
        let binary = '';
        for (let i = 0; i < pdfBytes.length; i++) binary += String.fromCharCode(pdfBytes[i]);
        const safeTitle = title.replace(/[^a-zA-Z0-9 \-_]/g, '').trim() || (isProposal ? 'Proposal' : 'Quotation');
        pdfAttachment = { filename: `${safeTitle} - Huna Creatives.pdf`, content: btoa(binary) };
      } catch (pdfErr) {
        console.error('PDF generation failed — acceptance still recorded:', pdfErr);
      }
    }

    // ── One next-steps email for every approved doc ─────────────────────
    // Price is fixed on the proposal, so no "formal quotation" follows —
    // just the kickoff form, then the agreement + invoice (sent separately).
    let clientEmailSent = false;
    if (accepted && quote.to_email) {
      const firstName = signer.split(' ')[0];

      // If the proposal names a kickoff template, create the form now and
      // link the email straight to it.
      let intakeUrl = PROJECT_FORM_URL;
      const tplName = String((quote as { intake_template?: string }).intake_template ?? '').trim();
      const tpl = QUESTIONNAIRE_TEMPLATES[tplName];
      if (tpl) {
        const { data: qRow, error: qErr } = await supabase
          .from('hub_questionnaires')
          .insert({
            service_type: tplName,
            client_name: quote.client_name,
            client_email: quote.to_email,
            questions: tpl,
            status: 'sent',
            intro_message: `Thanks for approving ${title}. This kickoff form gives us what we need to set your project up. We'll send the agreement and the deposit invoice separately.`,
          })
          .select('token')
          .single();
        if (qErr) console.error('Kickoff form create failed:', qErr);
        if (qRow?.token) intakeUrl = `${SITE}/q/${qRow.token}`;
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [quote.to_email],
          bcc: [TEAM_EMAIL],
          reply_to: TEAM_EMAIL,
          subject: `${Noun} approved — next steps`,
          ...(pdfAttachment ? { attachments: [pdfAttachment] } : {}),
          html: nextStepsEmail({ firstName, title, noun: Noun, pdfAttached: !!pdfAttachment, intakeUrl }),
        }),
      });
      clientEmailSent = res.ok;
      pdfSent = res.ok && !!pdfAttachment;
      if (!res.ok) console.error('Next-steps email failed:', await res.text());
    }

    return new Response(JSON.stringify({ ok: true, status: patch.status, pdf_sent: pdfSent, client_email_sent: clientEmailSent }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

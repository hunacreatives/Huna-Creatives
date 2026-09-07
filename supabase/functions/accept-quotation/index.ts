// Called by the public quotation page when a client accepts (or declines).
//
// Deliberately NOT admin-gated: the caller is an anonymous client on a shared
// link. The write itself is authorised by RLS -- "public_accept" limits it to
// rows already out for decision, and the column grants in migration
// 20260824000001 limit it to the acceptance fields. This function does the
// parts the browser must not be trusted with: recording the timestamp
// server-side, and sending mail.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderQuotePdf, computeQuoteTotals, fmtMoney, esc, QuoteRecord } from '../_shared/quotationTemplate.ts';
import { QUESTIONNAIRE_TEMPLATES } from '../_shared/questionnaireTemplates.ts';

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
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;padding:32px;margin:0">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#080604;padding:20px 24px">
    <span style="color:#C4873A;font-weight:700;font-size:14px;letter-spacing:0.1em">HUNA CREATIVES</span>
  </div>
  <div style="padding:28px 24px">
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">${Noun} ${accepted ? `${verbA} ✅` : 'declined'}</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6">
      <strong>${esc(q.client_name)}</strong> ${verbA}
      <strong>${esc(title)}</strong>${money ? ` — ${esc(money)}` : ''}.<br>
      Recorded under the name <strong>${esc(signer)}</strong>.
    </p>
    ${note ? `<p style="margin:0 0 16px;padding:12px 14px;background:#f9fafb;border-left:3px solid #C4873A;font-size:13px;color:#374151;line-height:1.6;white-space:pre-wrap">${esc(note)}</p>` : ''}
    ${accepted ? `<p style="margin:0;font-size:14px;color:#6b7280">Next step: send the agreement${isProposal ? ' and the detailed quotation' : ', then the deposit invoice'}.</p>` : ''}
  </div>
  <div style="padding:16px 24px;border-top:1px solid #f3f4f6;font-size:11px;color:#9ca3af">
    <a href="${HUB}/hub/admin/proposals/${quote.id}" style="color:#C4873A;text-decoration:none">Open in hub →</a>
  </div>
</div></body></html>`,
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
      const firstName = esc(signer.split(' ')[0]);

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

      const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";
      const steps: [string, string][] = [
        ['Project Kickoff form', 'A few project details so we can set everything up on our side.'],
        ['Agreement &amp; invoice', "We'll send these separately — the agreement to sign, and the deposit invoice."],
        ['We begin', 'Once the kickoff form is in and the deposit is settled, your project manager gets in touch and work starts.'],
      ];
      const stepsRows = steps.map(([label, desc], i) => `
        <tr>
          <td width="30" valign="top" style="padding:0 14px 20px 0">
            <div style="width:26px;height:26px;border-radius:50%;background:#FF6B35;color:#ffffff;font-family:${SANS};font-size:13px;font-weight:700;text-align:center;line-height:26px">${i + 1}</div>
          </td>
          <td valign="top" style="padding:0 0 20px">
            <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#1a1a1a;font-family:${SANS}">${label}</p>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#5a5a5a;font-family:${SANS}">${desc}</p>
          </td>
        </tr>`).join('');
      const ctaRow = intakeUrl
        ? `<a href="${intakeUrl}" style="display:inline-block;background:#111111;color:#ffffff;font-family:${SANS};font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;padding:15px 34px;border-radius:3px;text-decoration:none">Open the kickoff form &rarr;</a>`
        : `<p style="margin:0;font-size:13px;color:#5a5a5a;font-family:${SANS}">We'll send your kickoff form through shortly.</p>`;

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
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0ede8">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#f0ede8">
  <tr><td align="center" style="padding:40px 16px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
      style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">

      <tr><td style="background:#111111;padding:24px 40px;border-bottom:3px solid #FF6B35">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
          <td><img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives" height="26" style="display:block;height:26px;width:auto;border:0"></td>
          <td align="right"><span style="font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#FF6B35;border:1px solid rgba(255,107,53,0.35);padding:5px 10px">Approved</span></td>
        </tr></table>
      </td></tr>

      <tr><td style="padding:40px 40px 36px">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#FF6B35;font-family:${SANS}">Next steps</p>
        <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;color:#1a1a1a">Thank you, ${firstName}.</h1>
        <p style="margin:0 0 28px;font-size:14px;line-height:1.75;color:#4a4a4a;font-family:${SANS}">
          We've recorded your approval of <strong>${esc(title)}</strong>${pdfAttachment ? ' — a copy is attached for your records' : ''}. Here's how we get moving:
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">${stepsRows}</table>

        <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:8px"><tr><td>${ctaRow}</td></tr></table>

        <p style="margin:28px 0 0;font-size:13px;color:#8a8a8a;line-height:1.7;font-family:${SANS}">
          Questions in the meantime? Just reply to this email.
        </p>
      </td></tr>

      <tr><td align="center" style="background:#111111;padding:22px 40px;font-family:${SANS}">
        <span style="font-size:11px;color:#888888;letter-spacing:0.08em;text-transform:uppercase">Huna Creatives</span>
        <span style="font-size:11px;color:#555555"> &middot; Cebu City, Philippines</span>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`,
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

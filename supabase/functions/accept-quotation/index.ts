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

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN') ?? '';
const PDFSHIFT_API_KEY = Deno.env.get('PDFSHIFT_API_KEY') ?? '';
const ADMIN_SLACK_IDS = ['U091BL9PQ77', 'U0838LWSY4E'];
const FROM_EMAIL = 'Huna Creatives <contact@hunacreatives.com>';
const TEAM_EMAIL = 'contact@hunacreatives.com';
const HUB = 'https://hub.hunacreatives.com';

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
    if (!['sent', 'viewed'].includes(quote.status)) {
      return new Response(JSON.stringify({ error: 'This quotation is not open for a decision.' }), { status: 409, headers: cors });
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
      .in('status', ['sent', 'viewed'])
      .select()
      .single();

    if (updErr || !updated) {
      return new Response(JSON.stringify({ error: 'Could not record your response. Please try again.' }), { status: 500, headers: cors });
    }

    const q = { ...quote, ...patch } as unknown as QuoteRecord;
    const currency = q.currency === 'USD' ? 'USD' : 'PHP';
    const totals = computeQuoteTotals(q.line_items, q.discount, q.tax_rate);
    const title = q.project_title || `Quotation for ${q.client_name}`;
    const money = fmtMoney(totals.total, currency);
    const accepted = decision === 'accepted';

    // ── Notify the team (the only step Francis actually needs) ──────────
    const slackText = accepted
      ? `✅ *Quotation accepted*\n*${q.client_name}* accepted *${title}* — ${money}.\nAccepted by ${signer}.${note ? `\n\n> ${note}` : ''}\n\nNext: send the contract.`
      : `⚠️ *Quotation declined*\n*${q.client_name}* declined *${title}* — ${money}.${note ? `\n\n> ${note}` : ''}`;

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
          ? `Quotation accepted — ${title} (${money})`
          : `Quotation declined — ${title}`,
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;padding:32px;margin:0">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#080604;padding:20px 24px">
    <span style="color:#C4873A;font-weight:700;font-size:14px;letter-spacing:0.1em">HUNA CREATIVES</span>
  </div>
  <div style="padding:28px 24px">
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Quotation ${accepted ? 'accepted ✅' : 'declined'}</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6">
      <strong>${esc(q.client_name)}</strong> ${accepted ? 'accepted' : 'declined'}
      <strong>${esc(title)}</strong> — ${esc(money)}.<br>
      Recorded under the name <strong>${esc(signer)}</strong>.
    </p>
    ${note ? `<p style="margin:0 0 16px;padding:12px 14px;background:#f9fafb;border-left:3px solid #C4873A;font-size:13px;color:#374151;line-height:1.6;white-space:pre-wrap">${esc(note)}</p>` : ''}
    ${accepted ? `<p style="margin:0;font-size:14px;color:#6b7280">Next step: send the contract, then the deposit invoice.</p>` : ''}
  </div>
  <div style="padding:16px 24px;border-top:1px solid #f3f4f6;font-size:11px;color:#9ca3af">
    <a href="${HUB}/hub/admin/proposals/${quote.id}" style="color:#C4873A;text-decoration:none">Open in hub →</a>
  </div>
</div></body></html>`,
      }),
    }).catch(console.error);

    // ── Send the client their PDF copy (accepted only) ──────────────────
    // Best-effort: the acceptance is already recorded and the team already
    // notified. A PDFShift outage must not surface as a failed acceptance.
    let pdfSent = false;
    if (accepted && quote.to_email) {
      try {
        const pdfBytes = await htmlToPdf(renderQuotePdf(q));
        let binary = '';
        for (let i = 0; i < pdfBytes.length; i++) binary += String.fromCharCode(pdfBytes[i]);

        const safeTitle = title.replace(/[^a-zA-Z0-9 \-_]/g, '').trim() || 'Quotation';
        const mailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [quote.to_email],
            bcc: [TEAM_EMAIL],
            reply_to: TEAM_EMAIL,
            subject: `Confirmed — ${title}`,
            attachments: [{ filename: `${safeTitle} - Huna Creatives.pdf`, content: btoa(binary) }],
            html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0ede8">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#f0ede8">
  <tr><td align="center" style="padding:40px 16px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
      style="max-width:560px;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <tr><td style="background:#111;padding:26px 40px">
        <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png"
             alt="Huna Creatives" height="26" style="display:block;height:26px;width:auto;border:0">
      </td></tr>
      <tr><td style="padding:36px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
        <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:25px;font-weight:400;color:#1a1a1a">
          Thank you, ${esc(signer.split(' ')[0])}.
        </h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#4a4a4a">
          We've recorded your acceptance of <strong>${esc(title)}</strong> at <strong>${esc(money)}</strong>.
          A PDF copy is attached for your records.
        </p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#4a4a4a">
          Next, we'll send over the service agreement to sign, followed by the invoice
          for the first payment. Once that's settled, we begin.
        </p>
        <p style="margin:0;font-size:14px;line-height:1.8;color:#4a4a4a">
          Any questions in the meantime, just reply to this email.
        </p>
      </td></tr>
      <tr><td style="background:#111;padding:22px 40px;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif">
        <span style="font-size:11px;color:#888;letter-spacing:0.08em;text-transform:uppercase">Huna Creatives</span>
        <span style="font-size:11px;color:#555"> &middot; Cebu City, Philippines</span>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
          }),
        });
        pdfSent = mailRes.ok;
        if (!mailRes.ok) console.error('Acceptance receipt failed to send:', await mailRes.text());
      } catch (pdfErr) {
        console.error('Acceptance PDF generation failed — acceptance still recorded:', pdfErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, status: patch.status, pdf_sent: pdfSent }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

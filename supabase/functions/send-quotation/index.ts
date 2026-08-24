import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdmin, authErrorResponse, adminClient } from '../_shared/requireCaller.ts';
import {
  renderQuoteSections, renderQuoteTable, computeQuoteTotals,
  fmtMoney, esc, QuoteRecord,
} from '../_shared/quotationTemplate.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'Huna Creatives <contact@hunacreatives.com>';
const REPLY_TO = 'contact@hunacreatives.com';
const SITE = 'https://www.hunacreatives.com';
const CALENDLY = 'https://calendly.com/hunacreatives/30min';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // Sends mail on our domain to an address chosen by the caller. Anyone with
    // the bundled anon key could otherwise send Huna-branded mail to anyone.
    await requireAdmin(req, adminClient());

    const { id, to_email, intro } = await req.json();
    if (!id) {
      return new Response(JSON.stringify({ error: 'id is required' }), { status: 400, headers: cors });
    }

    // Read the quote server-side rather than trusting numbers from the client.
    const { data: quote, error: readErr } = await supabase
      .from('hub_proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (readErr || !quote) {
      return new Response(JSON.stringify({ error: 'Quotation not found' }), { status: 404, headers: cors });
    }

    const recipient = (to_email || quote.to_email || '').trim();
    if (!recipient) {
      return new Response(JSON.stringify({ error: 'No recipient email on this quotation' }), { status: 400, headers: cors });
    }

    const q = quote as unknown as QuoteRecord;
    const accent = /^#[0-9a-f]{3,8}$/i.test(q.accent_color) ? q.accent_color : '#FF6B35';
    const currency = q.currency === 'USD' ? 'USD' : 'PHP';
    const totals = computeQuoteTotals(q.line_items, q.discount, q.tax_rate);
    const title = q.project_title || `Quotation for ${q.client_name}`;
    const quoteUrl = `${SITE}/p/${q.slug}`;
    const acceptUrl = `${quoteUrl}#accept`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <style>
    @media only screen and (max-width:600px){
      .wrap{padding:16px 0!important}
      .body{padding:28px 20px!important}
      .header{padding:22px 20px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f0ede8">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#f0ede8">
    <tr><td align="center" class="wrap" style="padding:40px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
        style="max-width:640px;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">

        <tr>
          <td class="header" style="background:#111111;padding:26px 40px">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
              <td>
                <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png"
                     alt="Huna Creatives" height="26" style="display:block;height:26px;width:auto;border:0">
              </td>
              <td align="right">
                <span style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${accent};border:1px solid ${accent}59;padding:5px 10px">
                  Quotation
                </span>
              </td>
            </tr></table>
          </td>
        </tr>

        <tr><td class="body" style="padding:36px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">

          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a8a8a">
            Prepared for ${esc(q.client_name)}
          </p>
          <h1 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:27px;font-weight:400;line-height:1.25;color:#1a1a1a">
            ${esc(title)}
          </h1>
          ${q.tagline ? `<p style="margin:0;font-size:14px;color:#6b6b6b;line-height:1.6">${esc(q.tagline)}</p>` : ''}

          ${intro ? `<p style="margin:22px 0 0;font-size:14px;line-height:1.8;color:#4a4a4a;white-space:pre-wrap">${esc(intro)}</p>` : ''}

          <div style="margin:32px 0 0">${renderQuoteSections(q)}</div>

          <p style="margin:32px 0 12px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8a8a8a">Investment</p>
          ${renderQuoteTable(q)}

          <!-- Two CTAs, equal weight: decide now, or talk it through first. -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:34px 0 0">
            <tr>
              <td style="padding-right:8px" width="50%">
                <a href="${acceptUrl}" style="display:block;text-align:center;background:${accent};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 18px;border-radius:3px">
                  Accept this quotation
                </a>
              </td>
              <td style="padding-left:8px" width="50%">
                <a href="${CALENDLY}" style="display:block;text-align:center;background:#ffffff;color:#1a1a1a;font-size:14px;font-weight:600;text-decoration:none;padding:13px 18px;border:1px solid #d8d5d0;border-radius:3px">
                  Schedule a call
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:18px 0 0;font-size:12px;color:#8a8a8a;line-height:1.7;text-align:center">
            Or view it online at <a href="${quoteUrl}" style="color:${accent};text-decoration:none">${esc(quoteUrl.replace('https://', ''))}</a><br>
            Questions? Just reply to this email.
          </p>

        </td></tr>

        <tr>
          <td style="background:#111111;padding:22px 40px;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td style="font-size:11px;color:#888888;letter-spacing:0.08em;text-transform:uppercase">Huna Creatives</td>
                <td align="right"><a href="mailto:${REPLY_TO}" style="font-size:11px;color:${accent};text-decoration:none">${REPLY_TO}</a></td>
              </tr>
              <tr><td colspan="2" style="font-size:11px;color:#555555;padding-top:4px">Cebu City, Philippines</td></tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const subject = `Quotation from Huna Creatives — ${title} · ${fmtMoney(totals.total, currency)}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipient],
        bcc: [REPLY_TO],
        reply_to: REPLY_TO,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: await res.text() }), { status: 500, headers: cors });
    }

    // Only flip status once the mail actually went out.
    await supabase
      .from('hub_proposals')
      .update({ status: 'sent', sent_at: new Date().toISOString(), to_email: recipient })
      .eq('id', id);

    return new Response(JSON.stringify({ ok: true, sent_to: recipient }), { headers: cors });
  } catch (err) {
    const authRes = authErrorResponse(err, cors);
    if (authRes) return authRes;
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

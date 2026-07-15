import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL = 'hr@hunacreatives.com';

// Shared Drive folder already used for contract documents (contractors_agreements).
const FOLDER_ID = '1Pvqf6N4ZkBWimTVlbwzn1zKi04cP1jkM';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

async function getGoogleAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: Deno.env.get('GOOGLE_REFRESH_TOKEN')!,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('OAuth failed: ' + JSON.stringify(data));
  return data.access_token;
}

// Renders the certificate HTML to a real PDF via PDFShift (actual Chromium
// rendering — full flex/grid/box-shadow/border-radius/@page support). This
// replaced uploading the HTML to Drive as a Google Doc and exporting that:
// Google Docs' HTML importer only understands a very limited, old-web
// subset and silently dropped all of the template's modern CSS, producing
// a PDF that looked nothing like the source.
async function htmlToPdf(html: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get('PDFSHIFT_API_KEY');
  if (!apiKey) throw new Error('PDFSHIFT_API_KEY secret is not set');
  const res = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source: html, use_print: true }),
  });
  if (!res.ok) throw new Error(`PDFShift conversion failed: ${res.status} ${await res.text()}`);
  return new Uint8Array(await res.arrayBuffer());
}

// Archives the rendered PDF to the same Drive folder used for contract
// documents, for the record-keeping link shown on the Document Requests page.
async function uploadPdfToDrive(filename: string, pdfBytes: Uint8Array): Promise<string> {
  const accessToken = await getGoogleAccessToken();
  const meta = JSON.stringify({ name: filename, parents: [FOLDER_ID], mimeType: 'application/pdf' });
  const boundary = 'hr_certificate_boundary_xyz';
  const enc = new TextEncoder();
  const part1 = enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`);
  const part2 = enc.encode(`--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`);
  const part3 = enc.encode(`\r\n--${boundary}--`);

  const combined = new Uint8Array(part1.length + part2.length + pdfBytes.length + part3.length);
  combined.set(part1, 0);
  combined.set(part2, part1.length);
  combined.set(pdfBytes, part1.length + part2.length);
  combined.set(part3, part1.length + part2.length + pdfBytes.length);

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: combined,
  });
  const result = await uploadRes.json();
  if (!uploadRes.ok) throw new Error('Drive API error: ' + JSON.stringify(result));
  return result.id;
}

function emailHtml(contractorFirstName: string, title: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:28px 36px;">
      <p style="color:#FF6B35;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 6px;">Huna Creatives</p>
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;">${title}</h1>
      <p style="color:#9ca3af;font-size:13px;margin:6px 0 0;">Your requested document is attached to this email.</p>
    </div>
    <div style="padding:32px 36px;border-bottom:1px solid #f3f4f6;">
      <p style="font-size:15px;color:#374151;margin:0 0 16px;">Hi <strong>${contractorFirstName}</strong>,</p>
      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 8px;">
        Please find your <strong>${title}</strong> attached as a PDF. Let us know if you need anything else.
      </p>
    </div>
    <div style="padding:24px 36px;background:#fafafa;">
      <p style="font-size:11px;color:#9ca3af;margin:0 0 4px;">This email is not monitored. For concerns, email <a href="mailto:contact@hunacreatives.com" style="color:#9ca3af;">contact@hunacreatives.com</a></p>
      <p style="font-size:11px;color:#d1d5db;margin:0;">&copy; ${new Date().getFullYear()} Huna Creatives &middot; hr@hunacreatives.com</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { request_id, title, html } = await req.json();
    if (!request_id || !title || !html) {
      return new Response(JSON.stringify({ error: 'request_id, title, and html are required' }), { status: 400, headers: cors });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: docReq, error: reqErr } = await supabase
      .from('hub_doc_requests')
      .select('*, hub_users(full_name, email)')
      .eq('id', request_id)
      .single();

    if (reqErr || !docReq) {
      return new Response(JSON.stringify({ error: 'Document request not found' }), { status: 404, headers: cors });
    }

    const contractor = (docReq as any).hub_users;
    if (!contractor?.email) {
      return new Response(JSON.stringify({ error: 'This employee has no email on file.' }), { status: 400, headers: cors });
    }

    const safeTitle = title.replace(/[^a-zA-Z0-9 _-]/g, '');
    const pdfBytes = await htmlToPdf(html);
    const fileId = await uploadPdfToDrive(`${safeTitle} - ${contractor.full_name}.pdf`, pdfBytes);

    let binary = '';
    for (let i = 0; i < pdfBytes.length; i++) binary += String.fromCharCode(pdfBytes[i]);

    const emailPayload = {
      from: `Huna Creatives HR <${FROM_EMAIL}>`,
      to: contractor.email,
      cc: 'contact@hunacreatives.com',
      subject: `Your ${title}`,
      html: emailHtml(contractor.full_name.split(' ')[0], title),
      attachments: [{ filename: `${safeTitle}.pdf`, content: btoa(binary) }],
    };

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload),
    });
    const emailResult = await emailRes.json();
    if (!emailRes.ok) {
      return new Response(JSON.stringify({ error: `Email send failed: ${JSON.stringify(emailResult)}` }), { status: 502, headers: cors });
    }

    await supabase.from('hub_doc_requests').update({
      status: 'completed',
      file_name: `${safeTitle}.pdf`,
      file_url: `https://drive.google.com/file/d/${fileId}/view`,
      updated_at: new Date().toISOString(),
    }).eq('id', request_id);

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

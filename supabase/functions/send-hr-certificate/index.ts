import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { certificateEmail } from './email.ts';

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
      // Only contact@ is a real mailbox; replies to the sender address would bounce.
      reply_to: 'contact@hunacreatives.com',
      to: contractor.email,
      cc: 'contact@hunacreatives.com',
      subject: `Your ${title}`,
      html: certificateEmail(contractor.full_name.split(' ')[0], title),
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

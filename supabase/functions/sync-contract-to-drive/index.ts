import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function ok(data: unknown) {
  return new Response(JSON.stringify(data), { headers: cors });
}
function fail(msg: string, status = 400) {
  console.error('sync-contract-to-drive error:', msg);
  return new Response(JSON.stringify({ error: msg }), { status, headers: cors });
}

function buildSignedHtml(content: string, signedName: string, signedAt: string): string {
  const dateLabel = new Date(signedAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  let result = content.replace(
    '</head>',
    `<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" rel="stylesheet"></head>`
  );

  result = result
    .replace(
      /<div style="height:44pt;margin-top:16pt;border-bottom:1pt solid #111;"><\/div>\s*<p class="sig-label" style="margin-top:4pt;">Signature<\/p>/,
      `<div style="height:44pt;margin-top:16pt;display:flex;align-items:flex-end;padding-bottom:4pt;">
        <p style="font-family:'Dancing Script',cursive;font-size:26pt;color:#111;margin:0;line-height:1;">${signedName}</p>
       </div>`
    )
    .replace(
      /(<p class="sig-label">)([^<]+ &nbsp;\|&nbsp; Date)(<\/p>)(?![\s\S]*<p class="sig-label">Francis)/,
      `$1${signedName} &nbsp;|&nbsp; ${dateLabel}$3`
    );

  return result;
}

// Renders HTML to a real PDF via PDFShift (actual Chromium rendering).
// Previously, generated contracts were uploaded to Drive as a Google Doc and
// exported from there — but Google Docs' HTML importer only understands a
// very limited, old-web subset and silently dropped ContractGeneratorModal's
// flex/grid/box-shadow/border-radius/@page CSS, producing a mangled PDF.
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

const FOLDER_ID = '1Pvqf6N4ZkBWimTVlbwzn1zKi04cP1jkM'; // contractors_agreements

async function uploadToDrive(filename: string, mimeType: string, fileBytes: Uint8Array): Promise<string> {
  const accessToken = await getGoogleAccessToken();
  const metadata = JSON.stringify({ name: filename, parents: [FOLDER_ID] });

  const boundary = 'contract_boundary_xyz';
  const enc = new TextEncoder();
  const part1 = enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`);
  const part2 = enc.encode(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`);
  const part3 = enc.encode(`\r\n--${boundary}--`);

  const combined = new Uint8Array(part1.length + part2.length + fileBytes.length + part3.length);
  combined.set(part1, 0);
  combined.set(part2, part1.length);
  combined.set(fileBytes, part1.length + part2.length);
  combined.set(part3, part1.length + part2.length + fileBytes.length);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: combined,
    }
  );

  const result = await uploadRes.json();
  if (!uploadRes.ok) throw new Error('Drive API error: ' + JSON.stringify(result));
  return result.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { assignment_id } = await req.json();
    if (!assignment_id) return fail('assignment_id required');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: assignment, error: qErr } = await supabase
      .from('hub_sign_assignments')
      .select('id, status, signed_name, signed_at, contractor_id, hub_sign_documents(id, title, content, file_url, file_name, is_generated), hub_users(full_name)')
      .eq('id', assignment_id)
      .single();

    if (qErr || !assignment) {
      return fail(`Assignment not found: ${qErr?.message ?? 'no data'}`);
    }

    console.log('Assignment status:', assignment.status, 'signed_name:', assignment.signed_name);

    if (assignment.status !== 'signed') return fail('Contract not yet signed');

    const doc = (assignment as any).hub_sign_documents;
    const contractor = (assignment as any).hub_users;

    console.log('Doc title:', doc?.title, 'is_generated:', doc?.is_generated, 'has content:', !!doc?.content, 'file_url:', doc?.file_url);

    const safeName = `${(contractor?.full_name ?? 'Contractor').replace(/[^a-zA-Z0-9 _-]/g, '')} - ${(doc?.title ?? 'Agreement').replace(/[^a-zA-Z0-9 _-]/g, '')}`;

    let fileBytes: Uint8Array;
    let mimeType: string;
    let filename: string;

    if (doc?.is_generated && doc?.content) {
      const signedHtml = buildSignedHtml(doc.content, assignment.signed_name, assignment.signed_at);
      fileBytes = await htmlToPdf(signedHtml);
      mimeType = 'application/pdf';
      filename = `${safeName}.pdf`;
    } else if (doc?.file_url) {
      console.log('Fetching file from URL:', doc.file_url);
      const fileRes = await fetch(doc.file_url);
      if (!fileRes.ok) return fail(`Failed to fetch contract file: ${fileRes.status} ${fileRes.statusText}`);
      const buf = await fileRes.arrayBuffer();
      fileBytes = new Uint8Array(buf);
      mimeType = doc.file_name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
      filename = `${safeName}${doc.file_name ? ' - ' + doc.file_name : '.pdf'}`;
    } else {
      return fail('No content to upload (no generated content and no file_url)');
    }

    console.log(`Uploading "${filename}" (${fileBytes.length} bytes, ${mimeType}) to Drive`);
    const fileId = await uploadToDrive(filename, mimeType, fileBytes);
    console.log('Drive upload success, fileId:', fileId);

    await supabase
      .from('hub_sign_assignments')
      .update({ drive_file_id: fileId })
      .eq('id', assignment_id);

    return ok({ success: true, filename, fileId });
  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

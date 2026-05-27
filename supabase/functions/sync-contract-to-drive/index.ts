import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function buildSignedHtml(content: string, signedName: string, signedAt: string): string {
  const dateLabel = new Date(signedAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const result = content.replace(
    '</head>',
    `<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" rel="stylesheet"></head>`
  );

  return result
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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { assignment_id } = await req.json();
    if (!assignment_id) {
      return new Response(JSON.stringify({ error: 'assignment_id required' }), { status: 400, headers: cors });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: assignment, error } = await supabase
      .from('hub_sign_assignments')
      .select('*, hub_sign_documents(id, title, content, file_url, file_name, is_generated), hub_users!contractor_id(full_name)')
      .eq('id', assignment_id)
      .single();

    if (error || !assignment) {
      return new Response(JSON.stringify({ error: 'Assignment not found' }), { status: 404, headers: cors });
    }

    if (assignment.status !== 'signed') {
      return new Response(JSON.stringify({ error: 'Contract not yet signed' }), { status: 400, headers: cors });
    }

    const doc = (assignment as any).hub_sign_documents;
    const contractor = (assignment as any).hub_users;
    const safeName = `${contractor?.full_name?.replace(/[^a-zA-Z0-9 _-]/g, '') ?? 'Contractor'} - ${doc?.title?.replace(/[^a-zA-Z0-9 _-]/g, '') ?? 'Agreement'}`;
    const year = String(new Date(assignment.signed_at).getFullYear());

    let base64Content: string;
    let mimeType: string;
    let filename: string;

    if (doc?.is_generated && doc?.content) {
      const signedHtml = buildSignedHtml(doc.content, assignment.signed_name, assignment.signed_at);
      base64Content = btoa(unescape(encodeURIComponent(signedHtml)));
      mimeType = 'text/html';
      filename = `${safeName}.html`;
    } else if (doc?.file_url) {
      const fileRes = await fetch(doc.file_url);
      if (!fileRes.ok) throw new Error('Failed to fetch contract file');
      const buf = await fileRes.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      base64Content = btoa(binary);
      mimeType = doc.file_name?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
      filename = doc.file_name ? `${safeName} - ${doc.file_name}` : `${safeName}.pdf`;
    } else {
      return new Response(JSON.stringify({ error: 'No content to upload' }), { status: 400, headers: cors });
    }

    const uploadRes = await supabase.functions.invoke('upload-to-drive', {
      body: { filename, mimeType, base64Content, type: 'contractor_agreement', meta: { year } },
    });

    if (uploadRes.error) throw new Error(String(uploadRes.error));

    return new Response(JSON.stringify({ success: true, filename }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

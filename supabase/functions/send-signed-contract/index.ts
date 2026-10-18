import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { signedCopyEmail } from './email.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL = 'hr@hunacreatives.com';

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

async function run(assignment_id: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch assignment + document + contractor
  const { data: assignment, error: aErr } = await supabase
    .from('hub_sign_assignments')
    .select('*, hub_sign_documents(title, content, file_url, file_name, is_generated), hub_users!contractor_id(full_name, email)')
    .eq('id', assignment_id)
    .single();

  if (aErr || !assignment) {
    console.error('Assignment not found:', aErr);
    return;
  }

  const contractor = (assignment as any).hub_users;
  const doc = (assignment as any).hub_sign_documents;

  if (!contractor?.email) {
    console.error('Contractor has no email');
    return;
  }

  if (!assignment.signed_name || !assignment.signed_at) {
    console.error('Assignment not signed yet');
    return;
  }

  const dateLabel = new Date(assignment.signed_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  // For generated contracts, sync-contract-to-drive renders a real PDF (via
  // PDFShift) and uploads it to Drive directly — download it with the Drive
  // API's file-content endpoint, not /export (which is only for Google-native
  // Docs/Sheets/Slides and would 400 on an actual PDF file).
  let pdfAttachment: Uint8Array | null = null;
  if (doc?.is_generated && doc?.content) {
    try {
      const { data: driveResult } = await supabase.functions.invoke('sync-contract-to-drive', { body: { assignment_id } });
      const fileId = driveResult?.fileId;
      if (fileId) {
        const accessToken = await getGoogleAccessToken();
        const downloadRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (downloadRes.ok) {
          pdfAttachment = new Uint8Array(await downloadRes.arrayBuffer());
        } else {
          console.error('Drive PDF download failed:', downloadRes.status, await downloadRes.text());
        }
      }
    } catch (e) {
      console.error('Drive upload/download error:', e);
    }
  }

  const contractLink = doc?.is_generated ? null : doc?.file_url;

  const emailHtml = signedCopyEmail({
    firstName: contractor.full_name.split(' ')[0], title: doc?.title ?? 'Document', signedName: assignment.signed_name,
    date: dateLabel, pdfAttached: !!pdfAttachment, contractLink,
  });

  const payload: any = {
    from: `Huna Creatives HR <${FROM_EMAIL}>`,
    // Only contact@ is a real mailbox; replies to the sender address would bounce.
    reply_to: 'contact@hunacreatives.com',
    to: contractor.email,
    subject: `Your signed copy — ${doc?.title}`,
    html: emailHtml,
  };

  if (pdfAttachment) {
    let binary = '';
    for (let i = 0; i < pdfAttachment.length; i++) binary += String.fromCharCode(pdfAttachment[i]);
    payload.attachments = [{
      filename: `${doc.title.replace(/[^a-zA-Z0-9 _-]/g, '')}.pdf`,
      content: btoa(binary),
    }];
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!res.ok) {
    console.error('Resend error:', JSON.stringify(result));
  } else {
    console.log('Signed contract email sent:', result.id, '→', contractor.email);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { assignment_id } = await req.json();
    if (!assignment_id) return new Response(JSON.stringify({ error: 'assignment_id required' }), { status: 400, headers: cors });

    // @ts-ignore
    EdgeRuntime.waitUntil(run(assignment_id));

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

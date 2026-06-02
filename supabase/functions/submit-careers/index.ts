import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import postgres from 'https://deno.land/x/postgresjs@v3.4.4/mod.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_DB_URL = Deno.env.get('SUPABASE_DB_URL')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const GOOGLE_REFRESH_TOKEN = Deno.env.get('GOOGLE_REFRESH_TOKEN')!;
const DRIVE_ROOT = '1XQzc0U_pQrhCtivjR4SsgE_WTG9DpvYd';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Failed to get Google access token: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function createOrGetFolder(name: string, parentId: string, accessToken: string): Promise<string> {
  const safeName = name.replace(/['"\\]/g, '');
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${safeName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const searchData = await searchRes.json();
  if (searchData.files?.length > 0) return searchData.files[0].id;

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: safeName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  const createData = await createRes.json();
  if (!createData.id) throw new Error(`Failed to create folder "${safeName}": ${JSON.stringify(createData)}`);
  return createData.id;
}

async function ensureReadablePreview(fileId: string, accessToken: string) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  });

  if (!res.ok) {
    const data = await res.text();
    throw new Error(`Failed to set Drive permissions: ${data}`);
  }
}

async function uploadResumeToDrive(
  filename: string,
  mimeType: string | undefined,
  base64Content: string,
): Promise<{ url: string; fileId?: string }> {
  const accessToken = await getAccessToken();
  const careersFolder = await createOrGetFolder('Careers', DRIVE_ROOT, accessToken);
  const yearFolder = await createOrGetFolder(String(new Date().getFullYear()), careersFolder, accessToken);

  const metadata = JSON.stringify({
    name: filename,
    parents: [yearFolder],
  });
  const fileBytes = Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));
  const boundary = 'careers_upload_boundary';
  const part1 = new TextEncoder().encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`);
  const part2 = new TextEncoder().encode(`--${boundary}\r\nContent-Type: ${mimeType || 'application/pdf'}\r\n\r\n`);
  const part3 = new TextEncoder().encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(part1.length + part2.length + fileBytes.length + part3.length);
  body.set(part1, 0);
  body.set(part2, part1.length);
  body.set(fileBytes, part1.length + part2.length);
  body.set(part3, part1.length + part2.length + fileBytes.length);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) throw new Error(`Resume upload failed (${res.status}): ${JSON.stringify(data)}`);
  await ensureReadablePreview(data.id, accessToken);
  return { url: `https://drive.google.com/file/d/${data.id}/view`, fileId: data.id };
}

async function notifyAdmins(
  supabase: ReturnType<typeof createClient>,
  applicantName: string,
  role: string,
) {
  const { data: admins } = await supabase
    .from('hub_users')
    .select('id')
    .in('role', ['admin', 'owner', 'hr'])
    .eq('status', 'active');

  if (!admins?.length) return;

  await supabase.from('hub_notifications').insert(
    admins.map((admin: { id: string }) => ({
      user_id: admin.id,
      type: 'job_application',
      title: 'New job application',
      body: `${applicantName} applied for ${role}.`,
      link: '/hub/admin/applications',
    })),
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const {
      name, email, role, job_id, expected_rate,
      portfolio_link, resume_link,
      resume_filename, resume_base64, resume_mime,
      message,
    } = await req.json();

    if (!name || !email || !role || !expected_rate || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: cors });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const sql = postgres(SUPABASE_DB_URL, { ssl: 'require' });
    let finalResumeLink = resume_link || null;
    let driveFileId: string | null = null;

    if (resume_base64 && resume_filename) {
      const driveUpload = await uploadResumeToDrive(resume_filename, resume_mime, resume_base64);
      finalResumeLink = driveUpload.url;
      driveFileId = driveUpload.fileId ?? null;
    }

    try {
      await sql`
        insert into hub_job_applications (
          job_id,
          role,
          name,
          email,
          expected_rate,
          portfolio_link,
          resume_link,
          resume_filename,
          resume_drive_file_id,
          message,
          source
        ) values (
          ${job_id || null},
          ${role.trim()},
          ${name.trim()},
          ${email.trim().toLowerCase()},
          ${expected_rate.trim()},
          ${portfolio_link?.trim() || null},
          ${finalResumeLink},
          ${resume_filename || null},
          ${driveFileId},
          ${message.trim()},
          ${'careers_site'}
        )
      `;
    } catch (insertError) {
      await sql.end({ timeout: 1 }).catch(() => {});
      return new Response(JSON.stringify({ error: String(insertError) }), { status: 500, headers: cors });
    }

    await notifyAdmins(supabase, name.trim(), role.trim());
    await sql.end({ timeout: 1 }).catch(() => {});

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

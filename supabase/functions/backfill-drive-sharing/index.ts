import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SENTRO_ROOT = '1XQzc0U_pQrhCtivjR4SsgE_WTG9DpvYd';

async function getAccessToken(): Promise<string> {
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

async function createOrGetFolder(name: string, parentId: string, token: string): Promise<string> {
  const safe = name.replace(/['"\\]/g, '').trim();
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(safe)}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const { files } = await search.json();
  if (files?.length > 0) return files[0].id;

  const create = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: safe, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  });
  const created = await create.json();
  if (!created.id) throw new Error(`Folder create failed: ${JSON.stringify(created)}`);
  return created.id;
}

// Ensures a folder's "anyone with the link" permission exists and is set to
// `role`. Drive only allows one `type: 'anyone'` permission per file, so an
// existing one must be PATCHed rather than re-POSTed (a second POST just
// fails with "you can only have one link-sharing permission").
async function ensureAnyonePermission(fileId: string, role: 'reader' | 'writer', token: string): Promise<void> {
  const list = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?fields=permissions(id,type,role)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const { permissions } = await list.json();
  const existing = permissions?.find((p: any) => p.type === 'anyone');

  if (existing) {
    if (existing.role === role) return; // already correct, nothing to do
    const patch = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions/${existing.id}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      },
    );
    if (!patch.ok) throw new Error(`Patch permission failed: ${await patch.text()}`);
  } else {
    const create = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, type: 'anyone' }),
      },
    );
    if (!create.ok) throw new Error(`Create permission failed: ${await create.text()}`);
  }
}

// Backfill: for every project, create a Drive folder if it doesn't have one
// yet, then make sure "anyone with the link" is set to `writer` (editable) —
// upgrading any older folders that were shared as view-only.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const token = await getAccessToken();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: projects, error } = await supabase
      .from('hub_projects')
      .select('id, project_name, client_name, drive_url');
    if (error) throw error;

    const results: { project: string; action: string; folder_id?: string; ok: boolean; detail?: string }[] = [];

    for (const p of projects ?? []) {
      try {
        let folderId = p.drive_url?.match(/folders\/([a-zA-Z0-9_-]+)/)?.[1];
        let action = 'updated-permission';

        if (!folderId) {
          const projectsRootId = await createOrGetFolder('Projects', SENTRO_ROOT, token);
          const clientFolderId = p.client_name
            ? await createOrGetFolder(p.client_name, projectsRootId, token)
            : projectsRootId;
          folderId = await createOrGetFolder(p.project_name, clientFolderId, token);
          const drive_url = `https://drive.google.com/drive/folders/${folderId}`;
          await supabase.from('hub_projects').update({ drive_url }).eq('id', p.id);
          action = 'created-folder';
        }

        await ensureAnyonePermission(folderId, 'writer', token);
        results.push({ project: p.project_name, action, folder_id: folderId, ok: true });
      } catch (err) {
        results.push({ project: p.project_name, action: 'error', ok: false, detail: String(err) });
      }
    }

    return new Response(JSON.stringify({ total: results.length, results }, null, 2), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});

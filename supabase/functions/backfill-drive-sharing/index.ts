import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// One-time backfill: set "anyone with link = reader" on every project Drive
// folder so the in-hub embeddedfolderview iframe renders without a sign-in.
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
      .select('id, project_name, drive_url')
      .not('drive_url', 'is', null);
    if (error) throw error;

    const results: { project: string; folder_id: string; ok: boolean; detail?: string }[] = [];

    for (const p of projects ?? []) {
      const folderId = p.drive_url?.match(/folders\/([a-zA-Z0-9_-]+)/)?.[1];
      if (!folderId) continue;

      const perm = await fetch(
        `https://www.googleapis.com/drive/v3/files/${folderId}/permissions`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'reader', type: 'anyone' }),
        },
      );
      results.push({
        project: p.project_name,
        folder_id: folderId,
        ok: perm.ok,
        detail: perm.ok ? undefined : await perm.text(),
      });
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

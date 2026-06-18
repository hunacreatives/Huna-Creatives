import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_SECRET = Deno.env.get('PROPOSAL_ADMIN_SECRET')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
  }

  try {
    const body = await req.json();
    const {
      client_name,
      to_email = '',
      project_title = '',
      tagline = '',
      accent_color = '#FF6B35',
      sections = [],
      slug: customSlug,
      submission_id = null,
    } = body;

    if (!client_name) {
      return new Response(JSON.stringify({ error: 'client_name is required' }), { status: 400, headers: cors });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Generate slug from client name + random suffix
    const base = (customSlug || client_name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const rand = Math.random().toString(36).slice(2, 6);
    const slug = `${base}-${rand}`;

    const { data, error } = await supabase
      .from('hub_proposals')
      .insert({
        slug,
        client_name,
        to_email,
        project_title,
        tagline,
        accent_color,
        sections,
        submission_id,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
    }

    return new Response(JSON.stringify({
      ok: true,
      id: data.id,
      slug: data.slug,
      preview_url: `https://hunacreatives.com/p/${data.slug}`,
      admin_url: `https://hub.hunacreatives.com/hub/admin/proposals/${data.id}`,
    }), { headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});

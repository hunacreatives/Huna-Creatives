import type { VercelRequest, VercelResponse } from '@vercel/node';

// Shared SOP links (/hub/sop/:id) are rewritten here (see vercel.json) so chat
// apps unfurl them with the SOP's title instead of the site-wide Huna Creatives
// card. Serves the normal app shell with the head meta swapped, so people who
// click the link get the hub as usual.
// Titles come from sop_link_preview(), which only returns published SOPs that
// aren't Admin only; anything else gets a generic "SOP Library" title.

const SUPABASE_URL = process.env.VITE_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function lookup(id: number): Promise<{ title: string; category: string } | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sop_link_preview`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_id: id }),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows[0]?.title ? rows[0] : null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Number(req.query.id);
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'www.hunacreatives.com';
  const origin = `https://${host}`;
  const fallback = () => res.redirect(302, `/hub/sop/${Number.isInteger(id) ? id : ''}?spa=1`);

  if (!Number.isInteger(id) || id <= 0) return fallback();

  const [sop, shell] = await Promise.all([
    lookup(id),
    fetch(`${origin}/index.html`).then(r => (r.ok ? r.text() : null)).catch(() => null),
  ]);
  if (!shell) return fallback();

  const title = sop ? sop.title : 'SOP Library';
  const description = sop ? `${sop.category} SOP · Huna Creatives Hub` : 'Huna Creatives Hub';
  const url = `${origin}/hub/sop/${id}`;
  const meta = [
    `<title>${esc(title)} · Huna Creatives</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="robots" content="noindex, nofollow" />`,
    `<meta property="og:site_name" content="Huna Creatives Hub" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
  ].join('\n    ');

  const html = shell
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+(?:property="og:[^"]*"|name="(?:twitter:[^"]*|description|robots)")[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/i, '')
    .replace(/<\/head>/i, `    ${meta}\n  </head>`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(html);
}

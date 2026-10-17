// Build step after `vite build` + `vite build --ssr src/entry-server.tsx`:
// renders every public route to static HTML so crawlers that don't run
// JavaScript (ChatGPT, Perplexity, link previews) get real content, then
// writes sitemap.xml and llms.txt from the same route list.
//
//   node scripts/prerender.mjs [clientOutDir=out] [ssrOutDir=out-ssr]
//
// Never fails the build over a page: a route that errors or looks wrong is
// skipped with a warning, and Vercel falls back to the plain app shell for it
// (what every route got before this script existed).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SITE = 'https://www.hunacreatives.com';
const clientDir = resolve(process.argv[2] || 'out');
const ssrDir = resolve(process.argv[3] || 'out-ssr');

const shellPath = join(clientDir, 'app.html');
if (!existsSync(shellPath)) {
  console.error(`[prerender] ${shellPath} missing — run vite build first. Skipping prerender.`);
  process.exit(0);
}
const shell = readFileSync(shellPath, 'utf8');

const ssr = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// JSON-LD inside <script>: a "</script>" in any string would end the tag.
const jsonForScript = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

// Same rule as PageTransitionWrapper in App.tsx, so the first paint already
// has the page's background (no dark flash before React takes over).
const LIGHT_BG_ROUTES = ['/about', '/privacy', '/terms'];
const bodyBg = (route) => (LIGHT_BG_ROUTES.some((r) => route.startsWith(r)) ? '#ffffff' : '#0a0a0a');

function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*/?>`);
  const tag = `<meta ${attr}="${key}" content="${esc(value)}" />`;
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

function buildPage(route, body, seo) {
  let html = shell;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(seo.title)}</title>`);
  html = setMeta(html, 'name', 'description', seo.description);
  html = setMeta(html, 'name', 'robots', seo.noIndex ? 'noindex, nofollow' : 'index, follow');
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${esc(seo.canonical)}" />`);
  html = setMeta(html, 'property', 'og:title', seo.title);
  html = setMeta(html, 'property', 'og:description', seo.description);
  html = setMeta(html, 'property', 'og:url', seo.canonical);
  html = setMeta(html, 'property', 'og:type', seo.ogType);
  html = setMeta(html, 'property', 'og:image', seo.ogImage);
  html = setMeta(html, 'name', 'twitter:title', seo.title);
  html = setMeta(html, 'name', 'twitter:description', seo.description);
  html = setMeta(html, 'name', 'twitter:image', seo.ogImage);
  if (seo.schema) {
    html = html.replace('</head>', `    <script type="application/ld+json" data-huna-schema>${jsonForScript(seo.schema)}</script>\n  </head>`);
  }
  html = html.replace(/<body style="background-color:[^"]*">/, `<body style="background-color:${bodyBg(route)}">`);
  html = html.replace('<div id="root"></div>', `<div id="root" data-prerendered="${esc(route)}">${body}</div>`);
  return html;
}

const textOf = (html) => html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

const routes = ssr.publicRoutes();
const written = [];
const seenTitles = new Map();
const started = Date.now();

for (const route of routes) {
  try {
    const { html: body, seo } = await ssr.render(route);
    const text = textOf(body);
    const words = text.split(' ').length;
    const problem =
      !seo ? 'page did not call useSEO'
      : /\b(not found|something went wrong)\b/i.test(text.slice(0, 2000)) ? 'rendered a not-found/error state'
      : words < 150 ? `only ${words} words`
      : seenTitles.has(seo.title) ? `same title as ${seenTitles.get(seo.title)}`
      : null;
    if (problem) {
      console.warn(`[prerender] SKIP ${route}: ${problem}`);
      continue;
    }
    seenTitles.set(seo.title, route);
    const file = route === '/' ? join(clientDir, 'index.html') : join(clientDir, route.slice(1), 'index.html');
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, buildPage(route, body, seo));
    written.push({ route, seo, words });
  } catch (err) {
    console.warn(`[prerender] SKIP ${route}: ${String(err?.stack || err).split('\n').slice(0, 3).join(' | ')}`);
  }
}

// ── sitemap.xml ── only pages that were actually prerendered (and so are
// confirmed to render real content). lastmod only where we know it.
const articles = ssr.blogArticles;
const lastmodFor = (route) => {
  if (route.startsWith('/blog/')) {
    const a = articles.find((x) => `/blog/${x.slug}` === route);
    return a ? a.updatedIsoDate || a.isoDate : null;
  }
  if (route === '/blog') return articles.map((a) => a.updatedIsoDate || a.isoDate).sort().pop() || null;
  return null;
};
const priority = (route) => (route === '/' ? '1.0' : ['/services', '/contact', '/sentro'].includes(route) ? '0.9' : route.split('/').length > 2 ? '0.7' : '0.8');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${written.filter(({ seo }) => !seo.noIndex).map(({ route }) => {
  const lastmod = lastmodFor(route);
  return `  <url>\n    <loc>${SITE}${route === '/' ? '/' : route}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}    <priority>${priority(route)}</priority>\n  </url>`;
}).join('\n')}
</urlset>
`;
writeFileSync(join(clientDir, 'sitemap.xml'), sitemap);

// ── llms.txt ── a plain-text map of the site for AI tools (llmstxt.org).
const pageLine = (route) => {
  const w = written.find((x) => x.route === route);
  return w ? `- [${w.seo.title.replace(/ \| Huna Creatives$/, '')}](${SITE}${route}): ${w.seo.description}` : null;
};
const services = ssr.services || [];
const llms = [
  '# Huna Creatives',
  '',
  '> Huna Creatives is a small custom design studio in Cebu, Philippines. It builds brand identities, websites, social media content, print and packaging, and Sentro OS (an HR and operations hub for Philippine employers). Every project is custom-built; the studio does not resell templates or themes. Clients are Philippine businesses and overseas companies.',
  '',
  ...(services.length ? [
    '## Services and starting prices',
    '',
    'Starting prices from the services page. Final prices are quoted per project, usually within 24 hours.',
    '',
    ...services.map((s) => `- ${s.title}: from ${s.startingFromPH} (Philippines) / ${s.startingFrom} (international). ${s.description}`),
    '',
  ] : []),
  '## Main pages',
  '',
  ...['/services', '/portfolio', '/sentro', '/about', '/contact'].map(pageLine).filter(Boolean),
  '',
  '## Case studies and guides',
  '',
  ...articles.map((a) => pageLine(`/blog/${a.slug}`)).filter(Boolean),
  '',
  '## Portfolio',
  '',
  ...written.filter((w) => w.route.startsWith('/portfolio/')).map((w) => pageLine(w.route)),
  '',
  '## Contact',
  '',
  `- Start a project or ask for a quote: ${SITE}/contact`,
  '- Email: contact@hunacreatives.com',
  '',
].join('\n');
writeFileSync(join(clientDir, 'llms.txt'), llms);

const skipped = routes.length - written.length;
console.log(`[prerender] ${written.length}/${routes.length} routes prerendered in ${((Date.now() - started) / 1000).toFixed(1)}s${skipped ? ` — ${skipped} skipped (see warnings)` : ''}; sitemap.xml + llms.txt written`);

// The Supabase client keeps a refresh timer alive; don't let it hang the build.
process.exit(0);

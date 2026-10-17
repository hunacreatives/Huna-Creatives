// Build-time prerender entry (not shipped to the browser). scripts/prerender.mjs
// builds this with `vite build --ssr`, renders each public route to HTML, and
// writes it into out/<route>/index.html so crawlers that don't run JavaScript
// (ChatGPT, Perplexity, link previews) see the real page.
import { StrictMode } from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { StaticRouter } from 'react-router-dom';
import App from './App';
import { prerenderSEO, type ResolvedSEO } from './hooks/useSEO';
import { blogArticles } from './pages/blog/data';
import { projectDataMap } from './pages/portfolio/project/data';
import { services } from './pages/services/page';

export { blogArticles, projectDataMap, services };

/** Public, indexable routes. Hub, proposals, payment and token pages are never prerendered. */
export const PORTFOLIO_CATEGORIES = ['branding', 'graphic-design', 'social-media', 'email-marketing', 'web-design'];

export function publicRoutes(): string[] {
  return [
    '/',
    '/about',
    '/services',
    '/portfolio',
    ...PORTFOLIO_CATEGORIES.map((c) => `/portfolio/${c}`),
    ...Object.keys(projectDataMap).map((s) => `/portfolio/project/${s}`),
    '/blog',
    ...blogArticles.map((a) => `/blog/${a.slug}`),
    '/sentro',
    '/careers',
    '/contact',
    '/privacy',
    '/terms',
  ];
}

export async function render(url: string): Promise<{ html: string; seo: ResolvedSEO | null }> {
  prerenderSEO.current = null;
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );
  let html = '';
  for await (const chunk of prelude) html += chunk;
  return { html, seo: prerenderSEO.current };
}

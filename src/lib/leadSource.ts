// Where a website lead came from, so the contact inbox can show it (e.g. a
// visitor ChatGPT sent to a blog post). First touch per tab session: the
// referrer, landing page and any utm_* params from the first page load, plus
// the last blog post read before the form was sent.
//
// sessionStorage can throw (private mode, blocked storage) — every access is
// guarded, and a lead without attribution still submits normally.

const KEY = 'huna-lead-source';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

export interface LeadAttribution {
  referrer?: string;
  landing_page?: string;
  utm?: Record<string, string>;
  last_article?: string;
}

function read(): LeadAttribution {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function write(a: LeadAttribution) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(a));
  } catch { /* storage blocked — attribution is best-effort */ }
}

/** Call once on app start. Only the first page load of the session is kept. */
export function captureLanding() {
  const current = read();
  if (current.landing_page) return;

  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) utm[k] = v.slice(0, 200);
  }

  // Internal navigations aren't a source; only keep an external referrer.
  let referrer = '';
  try {
    if (document.referrer && new URL(document.referrer).host !== window.location.host) {
      referrer = document.referrer.slice(0, 500);
    }
  } catch { /* malformed referrer — ignore */ }

  write({
    ...current,
    landing_page: window.location.pathname,
    ...(referrer ? { referrer } : {}),
    ...(Object.keys(utm).length ? { utm } : {}),
  });
}

/** Remember the blog post being read, so a lead can be tied back to it. */
export function noteArticle(slug: string) {
  write({ ...read(), last_article: slug });
}

export function getAttribution(): LeadAttribution {
  return read();
}

/** One short line for the inbox: "chatgpt.com → /blog/…", "Direct", etc. */
export function describeAttribution(a: LeadAttribution | null | undefined): string | null {
  if (!a || !a.landing_page) return null;
  let from = 'Direct';
  if (a.utm?.utm_source) from = a.utm.utm_source;
  else if (a.referrer) {
    try { from = new URL(a.referrer).host.replace(/^www\./, ''); } catch { from = a.referrer; }
  }
  const parts = [`${from} → ${a.landing_page}`];
  if (a.last_article && `/blog/${a.last_article}` !== a.landing_page) parts.push(`read /blog/${a.last_article}`);
  return parts.join(' · ');
}

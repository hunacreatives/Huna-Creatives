// Meta Pixel for the public marketing site. It loads only after the visitor
// accepts cookies (same banner as Google Analytics) and never on the hub or on
// private client links (dashboards, proposals, payment, contracts).

const PIXEL_ID = '1586194019912243';
const CONSENT_KEY = 'huna_cookie_consent';
export const CONSENT_EVENT = 'huna-cookie-consent';

const PRIVATE_PATHS = [/^\/hub(\/|$)/, /^\/smartgrid-dashboard/, /^\/p\//, /^\/pay\//, /^\/c\//, /^\/q\//, /^\/status\//];

export const isPrivatePath = (path: string) => PRIVATE_PATHS.some(r => r.test(path));

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
    _fbq?: unknown;
  }
}

const hasConsent = () => {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
};

function loadPixel() {
  if (window.fbq) return;
  // Meta's standard base code, loaded on demand instead of in index.html
  const n: any = function (...args: unknown[]) {
    n.callMethod ? n.callMethod(...args) : n.queue.push(args);
  };
  window.fbq = n;
  if (!window._fbq) window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  window.fbq('init', PIXEL_ID);
}

const allowed = () => hasConsent() && !isPrivatePath(window.location.pathname);

export function trackPageView() {
  if (!allowed()) return;
  loadPixel();
  window.fbq?.('track', 'PageView');
}

export function trackLead(service?: string) {
  if (!allowed()) return;
  loadPixel();
  window.fbq?.('track', 'Lead', service ? { content_name: service } : {});
}

import { StrictMode } from 'react'
import './i18n'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Auto-reload when Vercel deploys a new build and old chunk files are gone.
// Session flag guards against a reload loop if the failure is persistent.
const isStaleChunkError = (msg: string) =>
  msg.includes('Failed to fetch dynamically imported module') ||
  msg.includes('Importing a module script failed') ||
  msg.includes('error loading dynamically imported module');
const reloadOnStaleChunk = () => {
  if (sessionStorage.getItem('chunk-reloaded')) return;
  sessionStorage.setItem('chunk-reloaded', '1');
  window.location.reload();
};
window.addEventListener('error', (e) => {
  if (isStaleChunkError(e.message ?? '')) reloadOnStaleChunk();
}, true);
// Failed dynamic import() surfaces as an unhandled rejection, not an error event
window.addEventListener('unhandledrejection', (e) => {
  if (isStaleChunkError(String((e.reason as Error | undefined)?.message ?? e.reason ?? ''))) {
    e.preventDefault();
    reloadOnStaleChunk();
  }
});

// When a new service worker takes over an already-controlled page (deploy
// mid-session), the old build's chunks are gone from cache — refresh once so
// the page runs the new build instead of dying on the next lazy import.
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  let refreshed = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshed) return;
    refreshed = true;
    window.location.reload();
  });
}

// A new build is waiting: offer it instead of silently sitting on the old one
// until every tab closes. Clicking posts SKIP_WAITING, the new SW activates,
// and the controllerchange handler above reloads the page.
if ('serviceWorker' in navigator) {
  const offerUpdate = (waiting: ServiceWorker) => {
    if (document.getElementById('sw-update-toast')) return;
    const bar = document.createElement('div');
    bar.id = 'sw-update-toast';
    bar.setAttribute('role', 'status');
    bar.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:24px', 'transform:translateX(-50%)',
      'z-index:2147483647', 'display:flex', 'align-items:center', 'gap:12px',
      'padding:10px 12px 10px 16px', 'border-radius:9999px',
      'background:#243037', 'color:#fff', 'font:500 13px/1.2 system-ui,sans-serif',
      'box-shadow:0 8px 28px rgba(0,0,0,0.28)',
    ].join(';');
    bar.innerHTML =
      '<span>A new version is available</span>' +
      '<button type="button" style="border:0;border-radius:9999px;padding:7px 14px;' +
      'background:#FF5B05;color:#fff;font:600 13px/1 system-ui,sans-serif;cursor:pointer">Reload</button>';
    bar.querySelector('button')!.addEventListener('click', () => {
      waiting.postMessage({ type: 'SKIP_WAITING' });
    });
    document.body.appendChild(bar);
  };

  navigator.serviceWorker.ready.then((reg) => {
    if (reg.waiting) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        // 'installed' with an existing controller means an update is waiting
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          offerUpdate(installing);
        }
      });
    });
    // Catch a build shipped while the tab sat idle
    setInterval(() => { reg.update().catch(() => {}); }, 60_000);
  }).catch(() => {});
}

// Deep-link handoff from the service worker: when a push notification is
// clicked and the SW can't navigate the window itself (uncontrolled client),
// it posts the target URL here instead.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'push-navigate' && typeof e.data.url === 'string') {
      try {
        const url = new URL(e.data.url, window.location.origin);
        if (url.origin === window.location.origin && url.pathname.startsWith('/hub')) {
          window.location.assign(url.pathname + url.search + url.hash);
        }
      } catch { /* malformed URL — ignore */ }
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

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

// A new build is waiting: apply it silently, but NEVER while the tab is in
// use. Posting SKIP_WAITING fires controllerchange -> a full reload (see
// handler above), which wipes any in-progress form / scroll / edit. So we
// just hold the waiting worker and promote it the moment the tab is hidden.
// Next time it's opened, it's already the new build — no reload on screen,
// no background polling, no prompt. The stale-chunk guard at the top covers
// the rare case of a lazy import 404ing before the swap.
if ('serviceWorker' in navigator) {
  let pending: ServiceWorker | null = null;

  const flushIfHidden = () => {
    if (!pending || document.visibilityState !== 'hidden') return;
    if (!navigator.serviceWorker.controller) return;
    pending.postMessage({ type: 'SKIP_WAITING' });
    pending = null;
  };
  const holdUpdate = (worker: ServiceWorker) => {
    // First-ever install (no controller yet) activates on its own — ignore.
    if (!navigator.serviceWorker.controller) return;
    pending = worker;
    flushIfHidden();
  };

  document.addEventListener('visibilitychange', flushIfHidden);

  navigator.serviceWorker.ready.then((reg) => {
    if (reg.waiting) holdUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        // 'installed' with an existing controller means an update is waiting
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          holdUpdate(installing);
        }
      });
    });
    // Check for a new build only when the tab is reopened after being hidden.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
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

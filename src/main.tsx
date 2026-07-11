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

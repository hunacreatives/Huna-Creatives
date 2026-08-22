/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST ?? []);

// Serve all navigations from the precached app shell — the installed app
// opens instantly instead of refetching index.html over the network.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// Deliberately NO skipWaiting: an updated SW waits until every tab from the
// old build closes before activating. Activating mid-session deleted the old
// build's precache (cleanupOutdatedCaches) while open pages still needed its
// lazy chunks — black screen until reload. The new build now applies on the
// next cold visit instead.
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// ...but let the page ask for it on demand. Without this, a waiting SW only
// activates once every tab from the old build is CLOSED -- reloading is not
// enough, because navigations are served from the precached shell above. That
// made new deploys invisible for anyone who kept a tab open.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; url?: string } = {};
  try { payload = event.data.json(); } catch { payload = { body: event.data.text() }; }

  const title = payload.title ?? 'Sentro Hub';
  const options: NotificationOptions = {
    body: payload.body ?? '',
    icon: '/apple-touch-icon.png',
    badge: '/favicon-32x32.png',
    data: { url: payload.url ?? '/hub' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = (event.notification.data?.url as string) ?? '/hub';
  // Push payloads may carry absolute URLs (sometimes on the www. subdomain).
  // Normalize onto this worker's origin — concatenating origin + raw produced
  // garbage URLs for absolute links, and a www./apex mismatch kicks the click
  // out of the installed app's scope.
  let target: URL;
  try {
    target = new URL(raw, self.location.origin);
  } catch {
    target = new URL('/hub', self.location.origin);
  }
  const absoluteUrl = `${self.location.origin}${target.pathname}${target.search}${target.hash}`;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const existing = clients.find((c) => c.url.startsWith(self.location.origin + '/hub'))
        ?? clients.find((c) => c.url.startsWith(self.location.origin));
      if (existing) {
        const focused = await existing.focus().catch(() => existing);
        try {
          await (focused ?? existing).navigate(absoluteUrl);
        } catch {
          // Uncontrolled clients can't be navigated from the SW —
          // hand the URL to the app and let it route itself.
          (focused ?? existing).postMessage({ type: 'push-navigate', url: absoluteUrl });
        }
        return;
      }
      await self.clients.openWindow(absoluteUrl);
    }),
  );
});

/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST ?? []);

// Skip waiting so new service worker activates immediately on next load
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

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
  const path = (event.notification.data?.url as string) ?? '/hub';
  const absoluteUrl = self.location.origin + path;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.startsWith(self.location.origin + '/hub'));
      if (existing) {
        return existing.focus().then((c) => c.navigate(absoluteUrl)).catch(() => existing.focus());
      }
      return self.clients.openWindow(absoluteUrl);
    }),
  );
});

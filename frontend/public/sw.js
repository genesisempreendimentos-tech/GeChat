// GêChat — minimal service worker for OS-level notifications.
// Does NOT intercept fetches or cache anything.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const conversationId = event.notification.data?.conversationId;
  const path = conversationId ? '/c/' + conversationId : '/';
  const target = self.location.origin + path;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Try to focus an existing GêChat window and navigate inside it
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.postMessage({ type: 'gechat:navigate', path });
            return client.focus();
          }
        }
        // No window open — open a new one
        return clients.openWindow(target);
      }),
  );
});

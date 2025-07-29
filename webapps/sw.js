const CACHE_NAME = 'activity-tracker-cache-v1';
const URLS_TO_CACHE = [
  './activity_tracker.html',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const action = event.action;
  const reply = event.reply;

  notification.close();

  if (action === 'reply') {
    if (reply) {
      const entry = {
        id: Date.now().toString(),
        activity: reply,
        description: 'Logged from notification',
        timestamp: new Date().toISOString(),
        created: new Date().toISOString()
      };

      // This is a bit of a hack, but we can't directly add to localStorage from the service worker.
      // We can send a message to the client to add the entry.
      event.waitUntil(
        clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'add-entry',
              entry: entry
            });
          });
        })
      );
    }
  } else {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientsArr => {
        const hadWindowToFocus = clientsArr.some(windowClient => {
          if (windowClient.url.endsWith('activity_tracker.html')) {
            windowClient.focus();
            return true;
          }
          return false;
        });

        if (!hadWindowToFocus) {
          clients.openWindow('activity_tracker.html').then(windowClient => {
            // windowClient is the newly opened window
          });
        }
      })
    );
  }
});

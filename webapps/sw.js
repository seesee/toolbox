const CACHE_NAME = 'activity-tracker-cache-v1';
const URLS_TO_CACHE = [
  './activity_tracker.html',
  './favicon.ico'
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

  if (action === 'reply' && reply) {
    const entry = {
      id: Date.now().toString(),
      activity: reply,
      description: 'Logged from notification',
      timestamp: new Date().toISOString(),
      created: new Date().toISOString()
    };

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
        clientsArr.forEach(client => {
          client.postMessage({
            type: 'add-entry',
            entry: entry
          });
        });
      })
    );
  } else {
    const urlToOpen = new URL('activity_tracker.html', self.location.href).href;

    const promiseChain = clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      let matchingClient = null;

      for (let i = 0; i < windowClients.length; i++) {
        const windowClient = windowClients[i];
        if (windowClient.url.split('#')[0] === urlToOpen) {
          matchingClient = windowClient;
          break;
        }
      }

      if (matchingClient) {
        matchingClient.postMessage({ type: 'navigate-to-tracker' });
        return matchingClient.focus();
      } else {
        return clients.openWindow(urlToOpen + '#tracker');
      }
    });

    event.waitUntil(promiseChain);
  }
});

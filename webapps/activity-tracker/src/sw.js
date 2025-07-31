/**
 * Service Worker for Activity Tracker
 * Handles notifications, notification actions, and offline functionality
 */

const CACHE_NAME = 'activity-tracker-v1';
const urlsToCache = [
    './',
    './index.html',
    './activity_tracker.html'
];

/**
 * Service Worker installation
 */
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Opened cache');
                // Try to cache files individually with error handling
                return Promise.allSettled(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(error => {
                            console.warn(`⚠️ Failed to cache ${url}:`, error.message);
                            // Don't let individual cache failures break the whole install
                            return null;
                        });
                    })
                ).then(results => {
                    const successful = results.filter(result => result.status === 'fulfilled').length;
                    const failed = results.filter(result => result.status === 'rejected').length;
                    console.log(`📦 Cache results: ${successful} successful, ${failed} failed`);
                });
            })
            .catch(error => {
                console.error('❌ Cache installation failed:', error);
                // Continue with SW installation even if caching fails
            })
    );
    
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

/**
 * Service Worker activation
 */
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker activated');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Claim all clients immediately
    return self.clients.claim();
});

/**
 * Fetch event handler for offline functionality
 */
self.addEventListener('fetch', (event) => {
    // Only handle http/https requests, skip file:// protocol
    if (event.request.url.startsWith('http')) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // Return cached version or fetch from network
                    if (response) {
                        return response;
                    }
                    
                    return fetch(event.request).catch(error => {
                        console.warn('⚠️ Fetch failed for:', event.request.url, error.message);
                        // Return a basic offline response for navigation requests
                        if (event.request.mode === 'navigate') {
                            return new Response('App offline', { 
                                status: 200, 
                                statusText: 'OK',
                                headers: { 'Content-Type': 'text/html' }
                            });
                        }
                        throw error;
                    });
                })
                .catch(error => {
                    console.warn('⚠️ Cache match failed for:', event.request.url, error.message);
                    return fetch(event.request);
                })
        );
    }
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Notification clicked:', event.notification.tag);
    
    event.notification.close();
    
    // Handle different types of notifications
    if (event.notification.tag === 'activity-reminder' || event.notification.tag === 'test-notification') {
        // Open the app and focus on tracker section
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes('activity-tracker') || 
                        client.url.includes('index.html') || 
                        client.url.includes('activity_tracker.html')) {
                        client.focus();
                        client.postMessage({ type: 'navigate-to-tracker' });
                        return;
                    }
                }
                
                // If app is not open, open it
                if (clients.openWindow) {
                    return clients.openWindow(getAppUrl() + '#tracker');
                }
            })
        );
    }
});

/**
 * Notification action handler (for inline replies)
 */
self.addEventListener('notificationactionclick', (event) => {
    console.log('🔔 Notification action clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'reply') {
        const reply = event.reply;
        console.log('📝 User replied:', reply);
        
        if (reply && reply.trim()) {
            // Create a new activity entry from the notification reply
            const entry = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                activity: reply.trim(),
                description: 'Added via notification',
                timestamp: new Date().toISOString(),
                created: new Date().toISOString()
            };
            
            // Send the entry to the main app
            event.waitUntil(
                clients.matchAll({ type: 'window' }).then((clientList) => {
                    let messageSent = false;
                    
                    // Send to existing clients
                    for (const client of clientList) {
                        if (client.url.includes('activity-tracker') || 
                            client.url.includes('index.html') || 
                            client.url.includes('activity_tracker.html')) {
                            client.postMessage({ 
                                type: 'add-entry', 
                                entry: entry 
                            });
                            messageSent = true;
                        }
                    }
                    
                    // If no existing client, store in indexedDB or localStorage via a new window
                    if (!messageSent) {
                        return clients.openWindow(getAppUrl()).then((client) => {
                            // Wait a bit for the page to load, then send the message
                            setTimeout(() => {
                                client.postMessage({ 
                                    type: 'add-entry', 
                                    entry: entry 
                                });
                            }, 2000);
                        });
                    }
                })
            );
        }
    }
});

/**
 * Push notification handler (for future web push functionality)
 */
self.addEventListener('push', (event) => {
    console.log('📬 Push message received');
    
    let data = {};
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'Activity Tracker', body: event.data.text() };
        }
    }
    
    const options = {
        body: data.body || 'New notification from Activity Tracker',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23667eea"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23667eea"><circle cx="12" cy="12" r="10"/></svg>',
        tag: data.tag || 'push-notification',
        requireInteraction: true,
        actions: [
            {
                action: 'reply',
                type: 'text',
                title: 'Log Activity',
                placeholder: 'What are you working on?'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ],
        data: data
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Activity Tracker', options)
    );
});

/**
 * Background sync handler (for future offline sync functionality)
 */
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync triggered:', event.tag);
    
    if (event.tag === 'sync-activities') {
        event.waitUntil(
            // Here you would implement syncing logic
            // For example, upload offline entries to a server
            Promise.resolve().then(() => {
                console.log('📤 Activities synced');
            })
        );
    }
});

/**
 * Message handler for communication with main app
 */
self.addEventListener('message', (event) => {
    console.log('💬 Message received in SW:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

/**
 * Error handler
 */
self.addEventListener('error', (event) => {
    console.error('❌ Service Worker error:', event.error);
});

/**
 * Unhandled rejection handler
 */
self.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Service Worker unhandled rejection:', event.reason);
});

/**
 * Utility function to broadcast message to all clients
 * @param {Object} message - Message to broadcast
 */
function broadcastMessage(message) {
    return clients.matchAll({ type: 'window' }).then((clientList) => {
        clientList.forEach((client) => {
            client.postMessage(message);
        });
    });
}

/**
 * Utility function to check if app is already open
 * @returns {Promise<boolean>} True if app is open
 */
function isAppOpen() {
    return clients.matchAll({ type: 'window' }).then((clientList) => {
        return clientList.some((client) => 
            client.url.includes('activity-tracker') || 
            client.url.includes('index.html') ||
            client.url.includes('activity_tracker.html')
        );
    });
}

/**
 * Utility function to determine the correct app URL based on current context
 * @returns {string} The appropriate app URL
 */
function getAppUrl() {
    // Try to determine the correct filename based on the service worker location
    const swUrl = self.location.href;
    const basePath = swUrl.substring(0, swUrl.lastIndexOf('/') + 1);
    
    // Check if we're in a subdirectory or root deployment
    if (swUrl.includes('/activity-tracker/') || swUrl.includes('/dist/')) {
        return './index.html';
    } else {
        // Likely deployed at root level, use activity_tracker.html
        return './activity_tracker.html';
    }
}

console.log('🔧 Service Worker loaded');

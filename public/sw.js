const CACHE_NAME = 'zerobarrier-v1';
const urlsToCache = [
'/',
'/index.html',
];

// Install service worker
self.addEventListener('install', event => {
event.waitUntil(
caches.open(CACHE_NAME).then(cache => {
return cache.addAll(urlsToCache);
})
);
self.skipWaiting();
});

// Activate and clean old caches
self.addEventListener('activate', event => {
event.waitUntil(
caches.keys().then(cacheNames => {
return Promise.all(
cacheNames.filter(name => name !== CACHE_NAME)
.map(name => caches.delete(name))
);
})
);
self.clients.claim();
});

// Fetch from cache or network
self.addEventListener('fetch', event => {
event.respondWith(
caches.match(event.request).then(response => {
return response || fetch(event.request);
})
);
});

// Push notifications
self.addEventListener('push', event => {
const data = event.data?.json() || {};
const title = data.title || 'ZeroBarrier';
const options = {
body: data.body || 'New message received!',
icon: '/icon-192.png',
badge: '/icon-192.png',
vibrate: [200, 100, 200],
data: { url: data.url || '/' }
};
event.waitUntil(
self.registration.showNotification(title, options)
);
});

// Notification click
self.addEventListener('notificationclick', event => {
event.notification.close();
event.waitUntil(
clients.openWindow(event.notification.data.url || '/')
);
});

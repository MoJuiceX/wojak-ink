/**
 * Service Worker for Wojak Games PWA
 *
 * Handles:
 * - Asset caching for offline support
 * - IPFS NFT image caching (cross-origin, cache-first)
 * - Push notifications
 * - Background sync
 */

const CACHE_NAME = 'wojak-games-v3';
const STATIC_CACHE = 'wojak-static-v3';
const DYNAMIC_CACHE = 'wojak-dynamic-v5';
const LAYER_CACHE = 'wojak-layers-v1';
const NFT_IMAGE_CACHE = 'wojak-nft-images-v1';
const NFT_CACHE_MAX = 500;
const LAYER_CACHE_MAX = 600;

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  const KEEP_CACHES = [STATIC_CACHE, DYNAMIC_CACHE, LAYER_CACHE, NFT_IMAGE_CACHE];

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !KEEP_CACHES.includes(name))
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activate complete');
        return self.clients.claim();
      })
  );
});

// IPFS NFT image handler — cache-first with LRU eviction
async function handleIPFSImage(request) {
  const cache = await caches.open(NFT_IMAGE_CACHE);

  // Check cache first (IPFS images are immutable)
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  // Cache miss — fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      // Store in cache, then evict if over limit
      cache.put(request, clone).then(async () => {
        const keys = await cache.keys();
        if (keys.length > NFT_CACHE_MAX) {
          // Delete oldest entries (first in list) until under limit
          const toDelete = keys.length - NFT_CACHE_MAX;
          for (let i = 0; i < toDelete; i++) {
            await cache.delete(keys[i]);
          }
        }
      });
    }
    return response;
  } catch (error) {
    // Network failed, no cache — return error
    return new Response('Image unavailable offline', { status: 503 });
  }
}

// R2 layer image handler — cache-first with LRU eviction (immutable assets)
async function handleLayerImage(request) {
  const cache = await caches.open(LAYER_CACHE);

  // Check cache first (layer images are immutable — filename changes when content changes)
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  // Cache miss — fetch with CORS mode
  try {
    const response = await fetch(request, { mode: 'cors' });
    if (response.ok) {
      const clone = response.clone();
      cache.put(request, clone).then(async () => {
        const keys = await cache.keys();
        if (keys.length > LAYER_CACHE_MAX) {
          const toDelete = keys.length - LAYER_CACHE_MAX;
          for (let i = 0; i < toDelete; i++) {
            await cache.delete(keys[i]);
          }
        }
      });
    }
    return response;
  } catch (error) {
    return new Response('Layer image unavailable offline', { status: 503 });
  }
}

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle IPFS NFT images (cross-origin) with dedicated cache
  if (url.hostname.endsWith('.ipfs.w3s.link')) {
    event.respondWith(handleIPFSImage(request));
    return;
  }

  // Handle R2 layer images (cross-origin) with dedicated cache — cache-first (immutable content-addressed)
  if (url.hostname === 'layers.wojak.ink') {
    event.respondWith(handleLayerImage(request));
    return;
  }

  // Skip other cross-origin requests
  if (url.origin !== location.origin) return;

  // Skip API requests (don't cache API responses)
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/mintgarden-api/') ||
      url.pathname.startsWith('/dexie-api/') ||
      url.pathname.startsWith('/spacescan-api/') ||
      url.pathname.startsWith('/coingecko-api/')) return;

  // Hashed assets (e.g. /assets/index-AbCd1234.js) — network-first
  // These filenames change per build, so stale cache hits cause version mismatches
  if (url.pathname.startsWith('/assets/') && /\-[a-zA-Z0-9]{8,}\.(js|css)$/.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request).then((cached) => cached || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Navigation requests (HTML pages) — network-first so deploys take effect immediately
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Manifest files — network-first (updated frequently with new traits/fields)
  if (url.pathname.endsWith('/manifest.json') && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request).then((cached) => cached || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Other same-origin assets — cache-first with network fallback
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok && networkResponse.status !== 206) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return networkResponse;
          })
          .catch(() => {
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  // Default notification payload
  let payload = {
    title: 'Wojak Games',
    body: 'You have a new notification!',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge.png',
  };

  // Parse the push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      payload = { ...payload, ...data };
    } catch (e) {
      // If not JSON, use as plain text body
      payload.body = event.data.text();
    }
  }

  // Notification options
  const options = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/badge.png',
    image: payload.image,
    tag: payload.tag || 'default',
    data: payload.data || {},
    actions: payload.actions || [],
    vibrate: [100, 50, 100],
    requireInteraction: false,
    renotify: payload.tag ? true : false,
  };

  // Show the notification
  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  // Close the notification
  event.notification.close();

  // Get the URL to open
  const urlToOpen = event.notification.data?.url || '/';
  const notificationType = event.notification.data?.type;

  // Handle specific actions
  let targetUrl = urlToOpen;

  if (event.action === 'play') {
    targetUrl = '/media';
  } else if (event.action === 'view') {
    if (notificationType === 'high_score_beaten') {
      targetUrl = '/leaderboard';
    } else if (notificationType === 'guild_invite') {
      targetUrl = '/guild';
    }
  } else if (event.action === 'dismiss') {
    return;
  }

  // Open or focus the app window
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');

  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
      })
      .then((subscription) => {
        return fetch('/api/notifications/resubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            oldEndpoint: event.oldSubscription?.endpoint,
            newSubscription: subscription.toJSON(),
          }),
        });
      })
  );
});

// Message handler for communication with the app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync (for future use)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-scores') {
    event.waitUntil(syncScores());
  }
});

async function syncScores() {
  console.log('[SW] Syncing offline scores...');
  // Future: sync any offline scores
}

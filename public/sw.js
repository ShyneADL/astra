// Minimal self-unregistering Service Worker to disable PWA caching
self.addEventListener("install", (event) => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Take control of open clients
      await self.clients.claim();

      // Clear all caches
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }

      // Unregister this service worker
      try {
        const reg = await self.registration.unregister();
        // Force all clients to reload so they stop being controlled by SW
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        for (const client of clients) {
          client.navigate(client.url);
        }
      } catch (_) {
        // no-op
      }
    })()
  );
});

// Do not intercept any requests
// No 'fetch' handler means the browser will bypass the SW and hit the network

// GYMIA service worker — cache-first para shell, network-first para datos.
// Bump de versión para invalidar caches viejos.
const VERSION = "gymia-v1";
const SHELL = [
  "/",
  "/hoy",
  "/rutina",
  "/ejercicios",
  "/cuenta",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      // Pre-cache best-effort: ignorar errores por si falla la red al instalar
      try {
        await cache.addAll(SHELL);
      } catch {
        /* ignore */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Evitar APIs y Supabase
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase")
  ) {
    return;
  }

  // Imágenes/estáticos → cache-first
  if (/\.(?:png|jpg|jpeg|webp|avif|gif|svg|woff2?|css|js|ico)$/.test(url.pathname) ||
      url.hostname.includes("raw.githubusercontent.com")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res.ok) {
            const cache = await caches.open(VERSION);
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Páginas: network-first con fallback a cache
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(VERSION);
          cache.put(req, res.clone());
          return res;
        } catch {
          const cached = await caches.match(req);
          return cached ?? caches.match("/hoy") ?? Response.error();
        }
      })(),
    );
  }
});

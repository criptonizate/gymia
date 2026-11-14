// GYMIA service worker.
// Bump de versión para invalidar caches viejos.
// IMPORTANTE: bumpear este número manualmente cuando cambie este archivo
// o querés invalidar los caches. (TODO: automatizar con build hash.)
const VERSION = "gymia-v3";
const SHELL = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
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

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.hostname.includes("supabase")
  ) {
    return;
  }

  // Imágenes/estáticos: cache-first
  if (
    /\.(?:png|jpg|jpeg|webp|avif|gif|svg|woff2?|css|js|ico)$/.test(url.pathname) ||
    url.hostname.includes("raw.githubusercontent.com")
  ) {
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

  // Páginas de app: NO se cachea porque el HTML trae datos del usuario
  // logeado. Caerle con offline-first filtraría datos a otro user del mismo
  // dispositivo. Dejamos que la red/CDN de Vercel maneje el caché privado.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          // Fallback mínimo: una página en blanco con un mensaje. No tocamos
          // caches.match() para no servir datos de otro user.
          return new Response(
            `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión · GYMIA</title><body style="background:#0a0a0b;color:#f2f4f7;font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:1.5rem;text-align:center"><div><h1 style="color:#38bdf8;margin:0 0 .5rem">Sin conexión</h1><p style="opacity:.7">Volvé a intentarlo cuando tengas internet.</p></div>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
  }
});

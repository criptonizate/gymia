// GYMIA service worker.
// Bump de versión para invalidar caches viejos.
// IMPORTANTE: bumpear este número manualmente cuando cambie este archivo
// o querés invalidar los caches. (TODO: automatizar con build hash.)
const VERSION = "gymia-v5";
const SHELL = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-maskable.svg",
];
const PAGES_CACHE = VERSION + "-pages";
const STATIC_CACHE = VERSION + "-static";
// Timeout para el fetch de red en navegaciones: después cae al cache
// (si está) o al HTML de fallback. Antes podíamos esperar >30s en 4G
// malo antes de responder.
const NAVIGATE_TIMEOUT_MS = 3000;
// Cap LRU para el cache de imágenes/estáticos: iOS evacuá PWAs si pasan
// de ~50MB o 7-30 días sin uso. Mantenemos el cache acotado.
const STATIC_CACHE_MAX = 200;

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
        keys
          .filter((k) => k !== VERSION && k !== PAGES_CACHE && k !== STATIC_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

async function trimCache(name, max) {
  try {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    if (keys.length <= max) return;
    // LRU aproximado: borramos los primeros N (orden FIFO de inserción).
    const toDelete = keys.length - max;
    for (let i = 0; i < toDelete; i++) await cache.delete(keys[i]);
  } catch {
    /* ignore */
  }
}

function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("sw-timeout")), ms);
    fetch(req).then(
      (r) => {
        clearTimeout(t);
        resolve(r);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  const esSupabaseStorage =
    url.hostname.includes("supabase") && url.pathname.includes("/storage/");
  if (url.hostname.includes("supabase") && !esSupabaseStorage) return;

  // Imágenes/estáticos: cache-first con cap LRU.
  if (
    esSupabaseStorage ||
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
            const cache = await caches.open(STATIC_CACHE);
            cache.put(req, res.clone());
            // Trim en background, no bloquea la respuesta.
            trimCache(STATIC_CACHE, STATIC_CACHE_MAX);
          }
          return res;
        } catch {
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Páginas de app: network-first con TIMEOUT corto. Si la red tarda
  // más que NAVIGATE_TIMEOUT_MS y hay cache, servimos cache; si no,
  // esperamos el fetch. Fallback a HTML mínimo si todo falla.
  if (req.mode === "navigate") {
    const cacheable =
      url.pathname === "/hoy" || url.pathname.startsWith("/sesion/");
    event.respondWith(
      (async () => {
        try {
          const res = await fetchWithTimeout(req, NAVIGATE_TIMEOUT_MS);
          if (cacheable && res && res.ok) {
            const cache = await caches.open(PAGES_CACHE);
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          if (cacheable) {
            const cached = await caches.match(req);
            if (cached) return cached;
          }
          // Fallback offline con 100dvh (en vez de 100vh, que en iOS
          // mete las barras adentro).
          return new Response(
            `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión · GYMIA</title><body style="background:#09090b;color:#fafafa;font-family:system-ui;display:flex;min-height:100dvh;align-items:center;justify-content:center;padding:1.5rem;text-align:center"><div><h1 style="color:#d4ff00;margin:0 0 .5rem">Sin conexión</h1><p style="opacity:.7;margin-bottom:1rem">Volvé a intentarlo cuando tengas internet.</p><p><a href="/hoy" style="color:#d4ff00">Ir a Hoy</a></p></div>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
  }
});

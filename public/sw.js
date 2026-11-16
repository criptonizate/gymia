// GYMIA service worker.
// Bump de versión para invalidar caches viejos.
// IMPORTANTE: bumpear este número manualmente cuando cambie este archivo
// o querés invalidar los caches. (TODO: automatizar con build hash.)
const VERSION = "gymia-v4";
const SHELL = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-maskable.svg",
];
const PAGES_CACHE = VERSION + "-pages";

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
          .filter((k) => k !== VERSION && k !== PAGES_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Nunca interceptar auth ni el endpoint /api (los /api son data del user).
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Supabase Storage sirve las imágenes de ejercicios (raw.*supabase*/...).
  // Antes las excluíamos del cache; ahora las tratamos como estáticos para
  // que el pre-fetch de media_frames en session-view quede cacheado y la
  // sesión abierta offline muestre las imágenes.
  const esSupabaseStorage =
    url.hostname.includes("supabase") && url.pathname.includes("/storage/");
  // Resto de llamadas directas a supabase (auth, postgrest, etc.) siguen
  // pasando sin interceptar.
  if (url.hostname.includes("supabase") && !esSupabaseStorage) return;

  // Imágenes/estáticos: cache-first
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

  // Páginas de app. Para /sesion/* y /hoy guardamos la última respuesta
  // fresca en PAGES_CACHE y la servimos si la red falla. El HTML trae
  // datos del user, así que SOLO devolvemos cache cuando el request es
  // navigate (reload de la misma pantalla) y la URL es una ruta donde la
  // ventaja de poder abrir offline supera el riesgo (apps single-user).
  if (req.mode === "navigate") {
    const cacheable =
      url.pathname === "/hoy" ||
      url.pathname.startsWith("/sesion/");
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
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
          // Fallback: página mínima con las variables del tema nuevo.
          return new Response(
            `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión · GYMIA</title><body style="background:#09090b;color:#fafafa;font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:1.5rem;text-align:center"><div><h1 style="color:#d4ff00;margin:0 0 .5rem">Sin conexión</h1><p style="opacity:.7;margin-bottom:1rem">Volvé a intentarlo cuando tengas internet.</p><p><a href="/hoy" style="color:#d4ff00">Ir a Hoy</a></p></div>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
  }
});

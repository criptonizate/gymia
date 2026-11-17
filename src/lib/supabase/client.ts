import { createBrowserClient } from "@supabase/ssr";

/**
 * Fetch con timeout — en redes móviles degradadas (4G intermitente) un
 * request puede colgar >30s antes de que el navegador lo aborte. Con
 * AbortSignal.timeout cae en ~8s y el llamador puede clasificar el error
 * como "red" y encolar en IndexedDB.
 */
const REQUEST_TIMEOUT_MS = 8000;

function timeoutFetch(input: RequestInfo | URL, init?: RequestInit) {
  const signals: AbortSignal[] = [AbortSignal.timeout(REQUEST_TIMEOUT_MS)];
  if (init?.signal) signals.push(init.signal);
  // AbortSignal.any no existe en todos los browsers viejos — fallback simple.
  const signal =
    "any" in AbortSignal
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (AbortSignal as any).any(signals)
      : signals[0];
  return fetch(input, { ...init, signal });
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: timeoutFetch },
    },
  );
}

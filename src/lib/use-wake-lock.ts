"use client";

import { useEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SentinelLike = { release: () => Promise<void> } & any;

/**
 * Mantiene la pantalla encendida mientras el componente esté montado y
 * `active` sea true. Re-adquiere automáticamente al volver a foreground
 * (iOS libera el wakeLock al bloquear pantalla). Fail-silent si el
 * navegador no lo soporta o el user rechaza.
 */
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<SentinelLike | null>(null);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    async function acquire() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wl = (navigator as any).wakeLock;
        if (!wl) return;
        const s = await wl.request("screen");
        if (cancelled) {
          s.release?.().catch(() => undefined);
          return;
        }
        sentinelRef.current = s;
      } catch {
        // permiso denegado o unsupported; ignorar
      }
    }
    const onVis = () => {
      if (document.visibilityState === "visible") acquire();
    };
    acquire();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      sentinelRef.current?.release?.().catch(() => undefined);
      sentinelRef.current = null;
    };
  }, [active]);
}

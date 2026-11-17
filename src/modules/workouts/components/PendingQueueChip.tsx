"use client";

import { useEffect, useState } from "react";
import { CloudUpload } from "lucide-react";
import { countPending, drainQueue } from "@/modules/workouts/offline-queue";

/**
 * Chip que indica cuántos sets quedaron en IndexedDB esperando sync.
 * Se refresca al montar, cada 5s, y cuando vuelve la tab al foreground.
 * Al tocarlo intenta drenar la cola ahora.
 */
export function PendingQueueChip() {
  const [n, setN] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const c = await countPending();
      if (!cancelled) setN(c);
    }
    refresh();
    const t = window.setInterval(refresh, 5000);
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onOnline = () => {
      setOnline(true);
      refresh();
    };
    const onOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelled = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (n === 0 && online) return null;

  return (
    <button
      type="button"
      onClick={() => void drainQueue()}
      aria-label={
        !online
          ? "Sin conexión. Toca para reintentar."
          : `${n} serie${n === 1 ? "" : "s"} pendientes de sincronizar. Toca para reintentar.`
      }
      className="flex items-center gap-1.5 rounded-full border border-warning/40 bg-[var(--warning-soft)] px-2.5 py-1 text-[11px] font-semibold text-warning"
    >
      <CloudUpload className="h-3.5 w-3.5" />
      {!online ? "Offline" : `${n} pendiente${n === 1 ? "" : "s"}`}
    </button>
  );
}

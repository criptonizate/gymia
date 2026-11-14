"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBadge() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[60] mx-auto flex max-w-md items-center justify-center gap-2 bg-warning px-3 py-1 text-xs font-medium text-black"
      style={{ paddingTop: "calc(0.25rem + env(safe-area-inset-top, 0px))" }}
    >
      <WifiOff className="h-3.5 w-3.5" />
      Sin conexión · tus cambios se sincronizan cuando vuelva
    </div>
  );
}

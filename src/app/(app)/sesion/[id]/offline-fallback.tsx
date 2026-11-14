"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";
import { readSessionCache } from "@/modules/workouts/offline-session";
import { SessionView } from "./session-view";

export function OfflineSessionFallback({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "found"; data: Awaited<ReturnType<typeof readSessionCache>> }
    | { kind: "empty" }
  >({ kind: "loading" });

  useEffect(() => {
    readSessionCache(sessionId).then((data) => {
      if (data) setState({ kind: "found", data });
      else setState({ kind: "empty" });
    });
    // Si vuelve la red, recargar para traer el estado real del server
    const onOnline = () => router.refresh();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [sessionId, router]);

  if (state.kind === "loading") {
    return (
      <main className="flex min-h-[60dvh] items-center justify-center p-6 text-sm text-muted-foreground">
        Buscando sesión guardada…
      </main>
    );
  }

  if (state.kind === "empty" || !state.data) {
    return (
      <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
        <WifiOff className="h-8 w-8 text-warning" />
        <h1 className="text-lg font-semibold">Sin conexión</h1>
        <p className="text-sm text-muted-foreground">
          No pude cargar la sesión y tampoco tengo una copia guardada.
          Volvé cuando tengas internet.
        </p>
      </main>
    );
  }

  const c = state.data;
  return (
    <SessionView
      sessionId={c.session_id}
      startedAt={c.startedAt}
      dayNombre={c.dayNombre}
      ejercicios={c.ejercicios}
      logs={c.logs}
      lastLogsByExercise={c.lastLogsByExercise}
      substitutes={c.substitutes}
    />
  );
}

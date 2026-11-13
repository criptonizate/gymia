"use client";

import { AlertTriangle } from "lucide-react";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="h-10 w-10 text-warning" />
      <h1 className="text-xl font-semibold">Algo no salió bien</h1>
      <p className="text-sm text-muted-foreground">
        Probá de nuevo. Si vuelve a pasar, cerrá sesión y entrá otra vez.
      </p>
      <button
        onClick={reset}
        className="min-h-12 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground"
      >
        Reintentar
      </button>
    </main>
  );
}

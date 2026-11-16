"use client";

import { Download } from "lucide-react";

export function ExportCard() {
  return (
    <section className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[var(--primary-soft)] text-primary">
        <Download className="h-5 w-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-sm font-semibold">Exportar historial</span>
        <span className="text-xs text-muted-foreground">
          CSV con todas tus series (fecha, ejercicio, peso, reps, RIR).
        </span>
      </div>
      <a
        href="/api/export/historial"
        download
        className="flex min-h-11 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground"
      >
        Descargar
      </a>
    </section>
  );
}

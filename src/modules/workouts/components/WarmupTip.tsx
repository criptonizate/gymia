"use client";

import { useState } from "react";
import { ChevronDown, Flame } from "lucide-react";

type Props = {
  primerEjercicio?: string;
};

/** Sugerencia de calentamiento colapsable antes de la 1ra serie. */
export function WarmupTip({ primerEjercicio }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center justify-between px-4"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Flame className="h-4 w-4 text-primary" />
          Calentamiento (5-10 min)
        </span>
        <ChevronDown
          className={"h-4 w-4 text-muted-foreground " + (open ? "rotate-180" : "")}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-2 p-4 pt-0 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">1.</strong> 3-5 min de cardio
            suave (bici, cinta, saltos).
          </p>
          <p>
            <strong className="text-foreground">2.</strong> Movilidad articular:
            cadera, hombros, columna según el día.
          </p>
          {primerEjercicio && (
            <p>
              <strong className="text-foreground">3.</strong> 2 series livianas
              de <em>{primerEjercicio}</em> con ~50% del peso objetivo.
            </p>
          )}
          <p>
            Objetivo: elevar temperatura, lubricar articulaciones y preparar al
            sistema nervioso. No llegar a la fatiga.
          </p>
        </div>
      )}
    </section>
  );
}

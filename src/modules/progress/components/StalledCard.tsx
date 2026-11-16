import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { StalledExercise } from "@/modules/progress/queries";

export function StalledCard({ items }: { items: StalledExercise[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-warning/50 bg-[var(--warning-soft)] p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <span className="text-sm font-semibold">
          {items.length} ejercicio{items.length === 1 ? "" : "s"} en pausa
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        No subiste el peso en las últimas 3 sesiones. Tres opciones:
      </p>
      <ul className="flex list-disc flex-col gap-0.5 pl-5 text-xs text-muted-foreground">
        <li>Bajá un poco el RIR (ej. de 2 a 1) para empujar más.</li>
        <li>Hacé una semana de descarga: mismo peso, menos series.</li>
        <li>Cambiá el ejercicio por una variante que active distinto.</li>
      </ul>
      <ul className="flex flex-col gap-1">
        {items.slice(0, 5).map((it) => (
          <li key={it.exercise_id}>
            <Link
              href={`/ejercicios/${it.slug}`}
              className="flex items-center justify-between text-sm"
            >
              <span className="truncate">{it.nombre}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {it.peso_max_actual} kg
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

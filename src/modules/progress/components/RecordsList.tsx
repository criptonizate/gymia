import Link from "next/link";
import type { ExerciseRecord } from "@/modules/progress/queries";

export function RecordsList({ records }: { records: ExerciseRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Todavía no hay récords. Entrená y vuelvo.
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {records.slice(0, 10).map((r) => (
        <li key={r.exercise_id}>
          <Link
            href={`/ejercicios/${r.slug}`}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-3 hover:border-primary/50"
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{r.nombre}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {r.peso_max} kg × {r.reps_en_max}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-bold text-primary tabular-nums">
                {r.rm_epley} kg
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                1RM est.
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

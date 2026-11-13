import type { TrainingDay } from "@/modules/progress/queries";

const COLS = 17; // ~4 meses
const ROWS = 7;

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  // lunes como primer día
  const nd = new Date(d);
  const wd = (nd.getDay() + 6) % 7;
  nd.setDate(nd.getDate() - wd);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

export function Heatmap({ days }: { days: TrainingDay[] }) {
  const map = new Map(days.map((d) => [d.dia, d.sesiones]));
  const today = new Date();
  const start = startOfWeek(new Date(today));
  // tomar 17 semanas atrás
  start.setDate(start.getDate() - (COLS - 1) * 7);

  const grid: (string | null)[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null),
  );
  for (let c = 0; c < COLS; c++) {
    const col = new Date(start);
    col.setDate(start.getDate() + c * 7);
    for (let r = 0; r < ROWS; r++) {
      const d = new Date(col);
      d.setDate(col.getDate() + r);
      grid[r][c] = toKey(d);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 text-xs text-muted-foreground">
        Días entrenados
      </div>
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, i) => {
          const c = i % COLS;
          const r = Math.floor(i / COLS);
          const key = grid[r][c];
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const cellDate = key ? new Date(key) : null;
          const future = cellDate ? cellDate > now : false;
          const n = key ? (map.get(key) ?? 0) : 0;
          const bg =
            future
              ? "bg-transparent"
              : n >= 2
                ? "bg-primary"
                : n === 1
                  ? "bg-[var(--primary-soft)]"
                  : "bg-muted";
          return (
            <div
              key={`${r}-${c}`}
              title={key ? `${key}: ${n} sesión${n === 1 ? "" : "es"}` : ""}
              className={`aspect-square rounded-sm ${bg}`}
            />
          );
        })}
      </div>
    </div>
  );
}

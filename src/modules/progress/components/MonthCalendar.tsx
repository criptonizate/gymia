import type { TrainingDay } from "@/modules/progress/queries";

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

export function MonthCalendar({ days }: { days: TrainingDay[] }) {
  const trained = new Set(days.map((d) => d.dia));
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstWeekday = (first.getDay() + 6) % 7; // lunes = 0
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = today.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  function key(d: number): string {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Este mes</span>
        <span className="text-sm font-medium capitalize">{monthLabel}</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
        {DAY_LABELS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d == null) return <div key={i} />;
          const isToday = d === today.getDate();
          const t = trained.has(key(d));
          return (
            <div
              key={i}
              className={[
                "flex aspect-square items-center justify-center rounded-md text-xs tabular-nums",
                t
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted text-muted-foreground",
                isToday && !t ? "ring-1 ring-primary" : "",
              ].join(" ")}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

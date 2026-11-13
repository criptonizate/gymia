import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { WeekCompare } from "@/modules/progress/queries";

export function WeekCompareCard({ data }: { data: WeekCompare }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">
          Esta semana vs. la anterior
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Metric
          label="Sesiones"
          actual={data.sesiones_actual}
          prev={data.sesiones_prev}
        />
        <Metric
          label="Series"
          actual={data.series_actual}
          prev={data.series_prev}
        />
        <Metric
          label="Volumen"
          actual={data.volumen_actual}
          prev={data.volumen_prev}
          suffix="kg"
          thousand
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  actual,
  prev,
  suffix,
  thousand,
}: {
  label: string;
  actual: number;
  prev: number;
  suffix?: string;
  thousand?: boolean;
}) {
  const sinBase = prev === 0;
  const delta = actual - prev;
  const pct = sinBase ? 0 : Math.round(((actual - prev) / prev) * 100);
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown;
  const color =
    delta === 0
      ? "text-muted-foreground"
      : delta > 0
        ? "text-primary"
        : "text-warning";
  const value = thousand ? actual.toLocaleString("es-AR") : String(actual);
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-background p-3">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-lg font-bold tabular-nums">
        {value}
        {suffix ? ` ${suffix}` : ""}
      </span>
      {sinBase ? (
        <span className="text-[11px] text-muted-foreground">sin base previa</span>
      ) : (
        <span className={`flex items-center gap-0.5 text-[11px] ${color}`}>
          <Icon className="h-3 w-3" />
          {Math.abs(pct)}%
        </span>
      )}
    </div>
  );
}

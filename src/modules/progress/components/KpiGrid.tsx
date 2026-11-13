import { Dumbbell, Flame, Target, TrendingUp } from "lucide-react";
import type { KpiData } from "@/modules/progress/queries";

export function KpiGrid({ data }: { data: KpiData }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card
        Icon={Dumbbell}
        label="Entrenamientos del mes"
        value={String(data.entrenamientos_mes)}
      />
      <Card
        Icon={Target}
        label="Cumplimiento semanal"
        value={`${data.cumplimiento_semana}%`}
        hint={
          data.planificadas_semana > 0
            ? `${data.hechas_semana}/${data.planificadas_semana}`
            : "sin plan"
        }
      />
      <Card
        Icon={Flame}
        label="Racha de semanas"
        value={String(data.racha_semanas)}
      />
      <Card
        Icon={TrendingUp}
        label="Volumen total"
        value={formatKg(data.volumen_total_kg)}
      />
    </div>
  );
}

function Card({
  Icon,
  label,
  value,
  hint,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-3">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-bold tabular-nums">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function formatKg(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)} t`;
  return `${Math.round(n)} kg`;
}

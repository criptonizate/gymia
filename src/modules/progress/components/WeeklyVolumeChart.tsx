"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeeklyVolume } from "@/modules/progress/queries";

function formatWeek(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

type Row = { week: string; actual: number; previa: number };

export function WeeklyVolumeChart({ data }: { data: WeeklyVolume[] }) {
  const sorted = data.slice().sort((a, b) => a.week_start.localeCompare(b.week_start));
  const rows: Row[] = sorted.map((d, i) => ({
    week: formatWeek(d.week_start),
    actual: Math.round(d.volumen),
    previa: i > 0 ? Math.round(sorted[i - 1].volumen) : 0,
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 px-1 text-xs text-muted-foreground">
        Volumen semanal (últimas 12 semanas)
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ fill: "var(--primary-soft)" }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--foreground)",
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(v, k) => [
                `${Number(v ?? 0).toLocaleString("es-AR")} kg`,
                k === "actual" ? "Esta semana" : "Semana previa",
              ]}
            />
            <Bar dataKey="previa" fill="var(--muted)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

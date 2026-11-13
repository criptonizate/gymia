"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SetsByMuscle } from "@/modules/progress/queries";

export function MuscleGroupChart({ data }: { data: SetsByMuscle[] }) {
  const rows = data.map((d) => ({ nombre: d.nombre, sets: d.sets_total }));
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 px-1 text-xs text-muted-foreground">
        Series por grupo muscular (últimos 7 días)
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="nombre"
              type="category"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={90}
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
            />
            <Bar dataKey="sets" fill="var(--primary)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

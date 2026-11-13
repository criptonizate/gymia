"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchEvolution } from "@/modules/progress/actions";
import type { EvolutionPoint, ExerciseRecord } from "@/modules/progress/queries";

type Props = { records: ExerciseRecord[] };

export function EvolutionPicker({ records }: Props) {
  const [picked, setPicked] = useState<string>(records[0]?.exercise_id ?? "");
  const [points, setPoints] = useState<EvolutionPoint[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!picked) return;
    start(async () => {
      setPoints(await fetchEvolution(picked));
    });
  }, [picked]);

  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Elegí un ejercicio una vez que tengas sesiones registradas.
      </div>
    );
  }

  const rows = points.map((p) => ({
    fecha: p.fecha.slice(5),
    peso: p.peso_max,
    reps: p.reps_max,
    seg: p.duracion_max,
  }));
  const hasPeso = rows.some((r) => r.peso != null);
  const yKey = hasPeso ? "peso" : rows.some((r) => r.seg != null) ? "seg" : "reps";

  return (
    <div className="flex flex-col gap-2">
      <select
        value={picked}
        onChange={(e) => setPicked(e.target.value)}
        className="min-h-12 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
      >
        {records.map((r) => (
          <option key={r.exercise_id} value={r.exercise_id}>
            {r.nombre}
          </option>
        ))}
      </select>
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="mb-2 text-xs text-muted-foreground">
          Evolución · {yKey === "peso" ? "peso máximo (kg)" : yKey === "seg" ? "duración (s)" : "reps"}
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="fecha"
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
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
              />
              <Line
                type="monotone"
                dataKey={yKey}
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ fill: "var(--primary)", r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {pending && (
          <p className="pt-2 text-center text-xs text-muted-foreground">
            Cargando…
          </p>
        )}
      </div>
    </div>
  );
}

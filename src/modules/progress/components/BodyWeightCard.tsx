"use client";

import { useState, useTransition } from "react";
import { Check, Scale } from "lucide-react";
import { logBodyWeight } from "@/modules/progress/actions";
import type { BodyWeightEntry } from "@/modules/progress/queries";

type Props = { entries: BodyWeightEntry[] };

export function BodyWeightCard({ entries }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [kg, setKg] = useState("");
  const [fecha, setFecha] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const latest = entries[0];
  const chart = entries.slice(0, 12).reverse();
  const max = chart.length ? Math.max(...chart.map((e) => e.kg)) : 1;
  const min = chart.length ? Math.min(...chart.map((e) => e.kg)) : 0;
  const range = max - min || 1;

  function onSave() {
    const n = Number(kg.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;
    start(async () => {
      const r = await logBodyWeight(fecha, n);
      if (!r.ok) setError(r.error);
      else {
        setError(null);
        setKg("");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Scale className="h-4 w-4 text-primary" />
          Peso corporal
        </span>
        {latest && (
          <span className="text-sm font-bold tabular-nums">
            {latest.kg} kg
          </span>
        )}
      </div>

      {chart.length > 1 && (
        <svg viewBox="0 0 100 32" className="h-16 w-full">
          <polyline
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={chart
              .map((e, i) => {
                const x = (i / (chart.length - 1)) * 100;
                const y = 30 - ((e.kg - min) / range) * 26;
                return `${x},${y}`;
              })
              .join(" ")}
          />
        </svg>
      )}

      <div className="flex gap-2">
        <input
          type="date"
          value={fecha}
          max={today}
          onChange={(e) => setFecha(e.target.value)}
          className="min-h-11 flex-1 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary"
        />
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder="kg"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          className="min-h-11 w-20 rounded-lg border border-border bg-background px-2 text-center text-sm tabular-nums outline-none focus:border-primary"
        />
        <button
          onClick={onSave}
          disabled={pending || !kg}
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-60"
          aria-label="Guardar peso"
        >
          <Check className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

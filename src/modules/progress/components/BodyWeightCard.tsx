"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Scale } from "lucide-react";
import { logBodyWeight } from "@/modules/progress/actions";
import type { BodyWeightEntry } from "@/modules/progress/queries";
import { useUnit } from "@/lib/use-unit";
import { fromDisplay, toDisplay } from "@/lib/units";

type Props = { entries: BodyWeightEntry[] };

export function BodyWeightCard({ entries }: Props) {
  // Fecha LOCAL (no UTC) para que un registro a las 22hs ARG no termine
  // guardado como el día siguiente.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [kg, setKg] = useState("");
  const [fecha, setFecha] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const unit = useUnit();

  const latest = entries[0];
  const chart = entries.slice(0, 12).reverse();
  const max = chart.length ? Math.max(...chart.map((e) => e.kg)) : 1;
  const min = chart.length ? Math.min(...chart.map((e) => e.kg)) : 0;
  const range = max - min || 1;

  function onSave() {
    const displayNum = Number(kg.replace(",", "."));
    if (!Number.isFinite(displayNum) || displayNum <= 0) return;
    // Siempre persistimos en kg. Si el user ve lb, convertimos antes de
    // guardar para que el histórico sea comparable.
    const kgNum = fromDisplay(displayNum, unit);
    start(async () => {
      const r = await logBodyWeight(fecha, kgNum ?? displayNum);
      if (!r.ok) setError(r.error);
      else {
        setError(null);
        setKg("");
      }
    });
  }

  const latestDisplay = latest ? toDisplay(latest.kg, unit) : null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Scale className="h-4 w-4 text-primary" />
          Peso corporal
        </span>
        {latest && latestDisplay != null && (
          <span className="text-sm font-bold tabular-nums">
            {latestDisplay} {unit}
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
          className="min-h-11 flex-1 rounded-lg border border-border bg-background px-2 text-base outline-none focus:border-primary"
        />
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder={unit}
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          className="min-h-11 w-20 rounded-lg border border-border bg-background px-2 text-center text-base tabular-nums outline-none focus:border-primary"
        />
        <button
          onClick={onSave}
          disabled={pending || !kg}
          aria-busy={pending || undefined}
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-150 active:scale-[0.92] disabled:opacity-60 motion-reduce:active:scale-100"
          aria-label="Guardar peso"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

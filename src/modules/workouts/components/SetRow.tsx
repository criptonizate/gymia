"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  numero: number;
  tipoRegistro: "peso_reps" | "reps";
  objetivoPeso?: number | null;
  objetivoRepsMin?: number | null;
  objetivoRepsMax?: number | null;
  /** Valores precargados (última vez o guardado). */
  initialPeso?: number | null;
  initialReps?: number | null;
  initialCompletada?: boolean;
  /** Paso de peso (±2.5 ó ±5). */
  stepKg: number;
  onCommit: (values: {
    peso_kg: number | null;
    reps: number | null;
    completada: boolean;
  }) => void;
};

export function SetRow({
  numero,
  tipoRegistro,
  objetivoPeso,
  objetivoRepsMin,
  objetivoRepsMax,
  initialPeso,
  initialReps,
  initialCompletada = false,
  stepKg,
  onCommit,
}: Props) {
  const [peso, setPeso] = useState<number | null>(
    initialPeso ?? objetivoPeso ?? null,
  );
  const [reps, setReps] = useState<number | null>(
    initialReps ?? objetivoRepsMax ?? objetivoRepsMin ?? null,
  );
  const [done, setDone] = useState<boolean>(initialCompletada);

  // reset si cambian los valores iniciales (switch de ejercicio)
  useEffect(() => {
    setPeso(initialPeso ?? objetivoPeso ?? null);
    setReps(initialReps ?? objetivoRepsMax ?? objetivoRepsMin ?? null);
    setDone(initialCompletada);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPeso, initialReps, initialCompletada]);

  const missed =
    done &&
    objetivoRepsMin != null &&
    reps != null &&
    reps < objetivoRepsMin;

  // Debounce de 300 ms; el ✓ hace flush inmediato.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function flush(values: {
    peso_kg: number | null;
    reps: number | null;
    completada: boolean;
  }) {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onCommit(values);
  }
  function commit(values: {
    peso_kg: number | null;
    reps: number | null;
    completada: boolean;
  }) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onCommit(values);
    }, 300);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function toggleDone() {
    const next = !done;
    setDone(next);
    flush({ peso_kg: peso, reps, completada: next });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border p-2",
        done
          ? missed
            ? "border-warning bg-[color-mix(in_oklab,var(--warning)_15%,var(--card))]"
            : "border-primary bg-[var(--primary-soft)]"
          : "border-border bg-card",
      )}
    >
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums">
        {numero}
      </span>

      {tipoRegistro === "peso_reps" && (
        <Field
          label="kg"
          value={peso}
          onChange={(v) => {
            setPeso(v);
            commit({ peso_kg: v, reps, completada: done });
          }}
          step={stepKg}
        />
      )}

      <Field
        label="reps"
        value={reps}
        onChange={(v) => {
          setReps(v);
          commit({ peso_kg: peso, reps: v, completada: done });
        }}
        step={1}
      />

      <button
        onClick={toggleDone}
        aria-label={done ? "Desmarcar serie" : "Marcar serie"}
        className={cn(
          "flex h-11 w-11 flex-none items-center justify-center rounded-full border",
          done
            ? missed
              ? "border-warning bg-warning text-black"
              : "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground",
        )}
      >
        <Check className="h-5 w-5" strokeWidth={done ? 3 : 2} />
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
}) {
  function bump(delta: number) {
    const base = value ?? 0;
    const next = Math.max(0, roundToStep(base + delta, step));
    onChange(next);
  }
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <button
        onClick={() => bump(-step)}
        aria-label={`Menos ${step} ${label}`}
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
      >
        <Minus className="h-4 w-4" />
      </button>
      <label className="flex min-w-0 flex-1 flex-col text-center">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return onChange(null);
            const n = Number(raw);
            onChange(Number.isFinite(n) ? n : null);
          }}
          className="w-full bg-transparent text-center text-lg font-bold tabular-nums outline-none"
          placeholder="—"
        />
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </label>
      <button
        onClick={() => bump(step)}
        aria-label={`Más ${step} ${label}`}
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function roundToStep(n: number, step: number): number {
  if (step >= 1) return Math.round(n);
  return Math.round(n / step) * step;
}

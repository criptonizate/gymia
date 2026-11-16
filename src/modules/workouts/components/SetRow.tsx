"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnit } from "@/lib/use-unit";
import { fromDisplay, toDisplay, KG_TO_LB } from "@/lib/units";

type Props = {
  numero: number;
  tipoRegistro: "peso_reps" | "reps";
  objetivoPeso?: number | null;
  objetivoRepsMin?: number | null;
  objetivoRepsMax?: number | null;
  rirObjetivo?: number | null;
  /** Valores precargados (última vez o guardado). */
  initialPeso?: number | null;
  initialReps?: number | null;
  initialRir?: number | null;
  initialCompletada?: boolean;
  /** Paso de peso (±2.5 ó ±5). */
  stepKg: number;
  onCommit: (values: {
    peso_kg: number | null;
    reps: number | null;
    rir: number | null;
    completada: boolean;
  }) => void;
};

export function SetRow({
  numero,
  tipoRegistro,
  objetivoPeso,
  objetivoRepsMin,
  objetivoRepsMax,
  rirObjetivo,
  initialPeso,
  initialReps,
  initialRir,
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
  const [rir, setRir] = useState<number | null>(initialRir ?? null);
  const [done, setDone] = useState<boolean>(initialCompletada);
  // En modo normal el RIR queda detrás de un botón para no competir con
  // peso/reps/✓ por la atención. Si el user lo abre acá queda abierto
  // mientras dure la serie.
  const [showAdjust, setShowAdjust] = useState(false);
  const unit = useUnit();

  // peso/reps no se sincronizan desde props: pisaríamos lo que el user está
  // tipeando. En cambio `done` SI tiene que reflejar cambios externos (ej.
  // una serie marcada desde modo focus), así que lo sincronizamos — pero
  // ese set no dispara commit, sólo UI.
  useEffect(() => {
    setDone(initialCompletada);
  }, [initialCompletada]);

  const missed =
    done &&
    objetivoRepsMin != null &&
    reps != null &&
    reps < objetivoRepsMin;

  // Si el RIR real quedó por encima del objetivo de forma consistente,
  // avisamos: la carga fue menor a la óptima, conviene subir la próxima.
  const excessRir =
    done &&
    rir != null &&
    rirObjetivo != null &&
    rir > rirObjetivo + 1;

  // Debounce de 300 ms; el ✓ hace flush inmediato.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  type CommitValues = {
    peso_kg: number | null;
    reps: number | null;
    rir: number | null;
    completada: boolean;
  };
  // Último valor pendiente para poder flushearlo en el unmount.
  const pendingRef = useRef<CommitValues | null>(null);
  // Guardo onCommit en ref para no depender de su identidad en el cleanup.
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  function flush(values: CommitValues) {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    onCommit(values);
  }
  function commit(values: CommitValues) {
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingRef.current = values;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      pendingRef.current = null;
      onCommit(values);
    }, 300);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // Flush del último valor pendiente al desmontar (swipe entre
        // ejercicios, salir de la sesión, etc) para no perder lo que el
        // user tipeó.
        const pending = pendingRef.current;
        if (pending) onCommitRef.current(pending);
      }
    };
  }, []);

  function toggleDone() {
    const next = !done;
    setDone(next);
    flush({ peso_kg: peso, reps, rir, completada: next });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border p-2",
        done
          ? missed
            ? "border-warning bg-[var(--warning-soft)]"
            : "border-primary bg-[var(--primary-soft)]"
          : "border-border bg-card",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums">
        {numero}
      </span>

      {tipoRegistro === "peso_reps" && (
        <Field
          label={unit}
          value={toDisplay(peso, unit)}
          onChange={(v) => {
            // Peso no puede ser negativo (Zod lo rechaza y se pierde el log).
            const clamped = v == null ? null : Math.max(0, v);
            const kg = clamped == null ? null : fromDisplay(clamped, unit);
            setPeso(kg);
            commit({ peso_kg: kg, reps, rir, completada: done });
          }}
          step={unit === "lb" ? Math.round(stepKg * KG_TO_LB) : stepKg}
        />
      )}

      <Field
        label="reps"
        value={reps}
        onChange={(v) => {
          // Reps siempre entero no negativo. Si el user tipea "8.5", redondeamos
          // en vez de dejar que Zod lo rechace y Perd el set.
          const clean = v == null ? null : Math.max(0, Math.round(v));
          setReps(clean);
          commit({ peso_kg: peso, reps: clean, rir, completada: done });
        }}
        step={1}
      />

      {/* RIR: oculto por default (prioridad = avanzar con la rutina). El
          user puede abrirlo con el botón de ajustes. Si ya hay un valor
          registrado, lo mostramos siempre para que no lo pierda. */}
      {rir != null || showAdjust ? (
        <RirPill
          value={rir}
          objetivo={rirObjetivo ?? null}
          onChange={(v) => {
            setRir(v);
            commit({ peso_kg: peso, reps, rir: v, completada: done });
          }}
        />
      ) : (
        <button
          type="button"
          aria-label="Mostrar ajustes (RIR, etc.)"
          onClick={() => setShowAdjust(true)}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
        >
          <Sliders className="h-4 w-4" />
        </button>
      )}

      <button
        onClick={toggleDone}
        aria-label={
          done
            ? missed
              ? `Serie ${numero} marcada: no llegaste al objetivo mínimo`
              : `Serie ${numero} marcada: objetivo alcanzado`
            : `Marcar serie ${numero} como completada`
        }
        className={cn(
          "flex h-11 w-11 flex-none items-center justify-center rounded-full border",
          done
            ? missed
              ? "border-warning bg-warning text-[var(--primary-foreground)]"
              : "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground",
        )}
      >
        <Check className="h-5 w-5" strokeWidth={done ? 3 : 2} />
        {done && missed && (
          <span className="sr-only">no llegaste al mínimo</span>
        )}
      </button>
      </div>
      {done && missed && (
        <p className="pl-9 text-[11px] text-warning">
          No llegaste al mínimo ({objetivoRepsMin} reps) — bajá un poco la
          carga la próxima.
        </p>
      )}
      {excessRir && (
        <p className="pl-9 text-[11px] text-primary">
          Te sobró mucho (RIR {rir} &gt; objetivo {rirObjetivo}) — probá subir
          la carga la próxima.
        </p>
      )}
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
  // Mantenemos el texto crudo que el user está tipeando. Si solo
  // usáramos `value` numérico, tipear "2." devolvería 2, y el input
  // controlado se re-renderizaría como "2", borrando el punto antes de
  // que termine de escribir "2.5".
  const [draft, setDraft] = useState<string | null>(null);
  const displayed = draft ?? (value ?? "");
  function bump(delta: number) {
    const base = value ?? 0;
    const next = Math.max(0, roundToStep(base + delta, step));
    setDraft(null);
    onChange(next);
  }
  return (
    <div className="flex min-w-0 flex-1 items-stretch gap-2 rounded-xl border border-border bg-background px-2 py-1">
      <label className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={displayed}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            if (raw === "") return onChange(null);
            const n = Number(raw);
            onChange(Number.isFinite(n) ? n : null);
          }}
          onBlur={() => setDraft(null)}
          className="w-full bg-transparent text-center text-xl font-bold tabular-nums outline-none"
          placeholder="—"
        />
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </label>
      <div className="flex flex-none flex-col">
        <button
          type="button"
          onClick={() => bump(step)}
          aria-label={`Más ${step} ${label}`}
          className="flex h-6 w-9 items-center justify-center rounded-md text-muted-foreground transition-transform duration-100 active:scale-90 hover:text-foreground motion-reduce:active:scale-100"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => bump(-step)}
          aria-label={`Menos ${step} ${label}`}
          className="flex h-6 w-9 items-center justify-center rounded-md text-muted-foreground transition-transform duration-100 active:scale-90 hover:text-foreground motion-reduce:active:scale-100"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function roundToStep(n: number, step: number): number {
  if (step >= 1) return Math.round(n);
  return Math.round(n / step) * step;
}

/** Pastilla de RIR (reps en reserva). null = no registrado. */
function RirPill({
  value,
  objetivo,
  onChange,
}: {
  value: number | null;
  objetivo: number | null;
  onChange: (v: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = value == null ? "RIR" : `RIR ${value}`;
  // Reacción visual a si estás cerca del objetivo
  const highlight =
    objetivo != null && value != null
      ? value <= objetivo
        ? "text-primary"
        : "text-warning"
      : "text-muted-foreground";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={value == null ? "Elegir RIR" : `RIR ${value}`}
        className={`flex h-11 min-w-12 flex-none items-center justify-center rounded-full border border-border bg-background px-2 text-[10px] font-bold uppercase ${highlight}`}
      >
        {label}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-30 mb-1 flex gap-1 rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          {[0, 1, 2, 3, 4, null].map((v, i) => (
            <button
              key={i}
              onClick={() => {
                onChange(v);
                setOpen(false);
              }}
              className={
                "min-h-9 min-w-9 rounded-lg px-2 text-xs font-semibold " +
                (value === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground")
              }
            >
              {v == null ? "—" : v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

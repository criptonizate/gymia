"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { ExerciseMedia } from "@/modules/exercises/components/ExerciseMedia";
import { beep, vibrate } from "@/modules/workouts/components/beep";
import { fromDisplay, KG_TO_LB, toDisplay } from "@/lib/units";
import { useUnit } from "@/lib/use-unit";
import { weightStep } from "@/modules/workouts/progression";
import { logSetOffline } from "@/modules/workouts/offline-queue";
import type { RoutineExerciseRow } from "@/modules/routines/queries";
import type { SetLog } from "@/modules/workouts/queries";

type Props = {
  sessionId: string;
  ejercicios: RoutineExerciseRow[];
  logs: SetLog[];
  lastLogsByExercise: Record<string, SetLog[]>;
  initialIndex: number;
  onExit: () => void;
  onIndexChange: (i: number) => void;
};

/**
 * Vista FOCUS: una sola serie por pantalla. Botones gigantes, poco texto,
 * pensada para usar sin pensar con una mano en el gym.
 */
export function FocusView({
  sessionId,
  ejercicios,
  logs,
  lastLogsByExercise,
  initialIndex,
  onExit,
  onIndexChange,
}: Props) {
  const router = useRouter();
  const [i, setI] = useState(initialIndex);
  const [currentSets, setCurrentSets] = useState<SetLog[]>(() =>
    logs
      .filter((l) => l.routine_exercise_id === ejercicios[initialIndex]?.id)
      .sort((a, b) => a.numero_serie - b.numero_serie),
  );
  const ex = ejercicios[i];
  const total = ejercicios.length;
  const unit = useUnit();

  // Último set previo (para precarga)
  const lastLogs = lastLogsByExercise[ex.exercise_id];
  const firstLast = lastLogs?.[0];
  const stepKg = weightStep(ex.exercise.equipment.slug);

  // Serie actual = primer "hueco"
  const serieActual = currentSets.length + 1;
  const terminado = serieActual > ex.series;

  const defaultPeso =
    ex.peso_objetivo_kg ?? firstLast?.peso_kg ?? null;
  const defaultReps =
    ex.reps_max ?? ex.reps_min ?? firstLast?.reps ?? 10;

  const [peso, setPeso] = useState<number | null>(defaultPeso);
  const [reps, setReps] = useState<number>(defaultReps);
  // Descanso corto por default; se puede estirar en vivo.
  const [rest, setRest] = useState<number | null>(null);

  // Al cambiar de ejercicio, resetear los sets locales y los defaults.
  useEffect(() => {
    onIndexChange(i);
    setCurrentSets(
      logs
        .filter((l) => l.routine_exercise_id === ejercicios[i]?.id)
        .sort((a, b) => a.numero_serie - b.numero_serie),
    );
    // No reseteamos `rest`: el user puede querer ir viendo el próximo
    // ejercicio mientras el timer sigue corriendo.
    // Nuevo ejercicio: recalcular defaults
    const nextEx = ejercicios[i];
    if (!nextEx) return;
    const last = lastLogsByExercise[nextEx.exercise_id]?.[0];
    setPeso(nextEx.peso_objetivo_kg ?? last?.peso_kg ?? null);
    setReps(nextEx.reps_max ?? nextEx.reps_min ?? last?.reps ?? 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  // Timer de descanso
  useEffect(() => {
    if (rest == null) return;
    if (rest <= 0) {
      beep(200, 880);
      vibrate([200, 100, 200]);
      setRest(null);
      return;
    }
    const t = setTimeout(() => setRest((r) => (r == null ? null : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [rest]);

  async function marcarSerie() {
    const num = serieActual;
    const planPeso = ex.peso_objetivo_kg;
    const planReps = ex.reps_max ?? ex.reps_min ?? null;
    const newLog: SetLog = {
      id: `tmp-${ex.id}-${num}-${Date.now()}`,
      session_id: sessionId,
      routine_exercise_id: ex.id,
      exercise_id: ex.exercise_id,
      es_sustituto: false,
      numero_serie: num,
      objetivo_reps: planReps,
      objetivo_peso_kg: planPeso,
      objetivo_seg: ex.duracion_seg,
      peso_kg: peso,
      reps,
      duracion_seg: null,
      rir: null,
      completada: true,
      created_at: new Date().toISOString(),
    };
    setCurrentSets((p) => [...p, newLog]);
    // Arrancar descanso corto (30s default, user agrega +15s si quiere)
    setRest(30);
    await logSetOffline({
      sessionId,
      routineExerciseId: ex.id,
      exerciseId: ex.exercise_id,
      esSustituto: false,
      numeroSerie: num,
      objetivoReps: planReps,
      objetivoPesoKg: planPeso,
      objetivoSeg: ex.duracion_seg,
      pesoKg: peso,
      reps,
      duracionSeg: null,
      rir: null,
      completada: true,
    });
  }

  function siguiente() {
    if (i < total - 1) setI(i + 1);
    else {
      onExit();
      router.push("/hoy");
    }
  }

  const missed =
    ex.reps_min != null && reps < ex.reps_min;
  const displayPeso = toDisplay(peso, unit);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-background">
      {/* Top: nombre + close */}
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {i + 1}/{total} · Serie {Math.min(serieActual, ex.series)}/{ex.series}
          </span>
          <h1 className="truncate text-base font-bold leading-tight">
            {ex.exercise.nombre}
          </h1>
        </div>
        <button
          onClick={onExit}
          aria-label="Salir del modo focus"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Media */}
      <div className="relative h-40 shrink-0">
        <ExerciseMedia
          mediaUrl={ex.exercise.media_url}
          frames={ex.exercise.media_frames}
          muscleGroupSlug={ex.exercise.muscle_group.slug}
          exerciseSlug={ex.exercise.slug}
          patron={ex.exercise.patron}
          alt={ex.exercise.nombre}
          className="h-full w-full"
          sizes="448px"
          minimal
        />
      </div>

      {/* Banner de descanso: se queda arriba mientras el user navega
          entre ejercicios para ver qué viene después. */}
      {rest != null && (
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-[var(--primary-soft)] px-3 py-2">
          <div className="flex min-w-0 flex-1 flex-col leading-none">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Descansá
            </span>
            <span className="text-3xl font-black tabular-nums text-primary">
              {rest}s
            </span>
          </div>
          <button
            onClick={() => setRest((r) => (r ?? 0) + 15)}
            className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          >
            +15 s
          </button>
          <button
            onClick={() => setRest(null)}
            className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          >
            Saltar
          </button>
        </div>
      )}

      {/* Zona central grande: peso + reps */}
      {terminado ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
          <Check className="h-20 w-20 text-primary" />
          <span className="text-xl font-bold">
            Terminaste {ex.exercise.nombre}
          </span>
          <BigBtn primary onClick={siguiente}>
            {i < total - 1 ? "Próximo ejercicio" : "Finalizar sesión"}
          </BigBtn>
        </section>
      ) : (
        <section className="flex flex-1 flex-col items-stretch justify-between gap-4 p-4">
          {firstLast && (
            <p className="text-center text-xs text-muted-foreground">
              Última vez: {firstLast.peso_kg ?? "?"} kg × {firstLast.reps ?? "?"}
            </p>
          )}

          {ex.exercise.tipo_registro === "peso_reps" && (
            <Stepper
              label={unit}
              value={displayPeso ?? 0}
              step={unit === "lb" ? Math.round(stepKg * KG_TO_LB) : stepKg}
              onChange={(v) => setPeso(fromDisplay(v, unit))}
            />
          )}

          <Stepper
            label="reps"
            value={reps}
            step={1}
            onChange={setReps}
            tone={missed ? "warning" : "normal"}
          />

          <button
            onClick={marcarSerie}
            className="flex min-h-20 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-2xl font-black text-primary-foreground"
          >
            <Check className="h-7 w-7" />
            Marcar serie {serieActual}
          </button>
        </section>
      )}

      {/* Nav inferior */}
      <nav className="flex items-center justify-between gap-2 border-t border-border p-3">
        <BigBtn
          onClick={() => {
            if (i > 0) setI(i - 1);
          }}
          disabled={i === 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </BigBtn>
        <BigBtn
          onClick={() => {
            if (i < total - 1) setI(i + 1);
          }}
          disabled={i >= total - 1}
        >
          <ChevronRight className="h-6 w-6" />
        </BigBtn>
      </nav>
    </div>
  );
}

function Stepper({
  label,
  value,
  step,
  onChange,
  tone = "normal",
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
  tone?: "normal" | "warning";
}) {
  const cls =
    tone === "warning"
      ? "border-warning bg-[var(--warning-soft)]"
      : "border-border bg-card";
  return (
    <div className={`flex items-center justify-between rounded-2xl border p-3 ${cls}`}>
      <button
        onClick={() => onChange(Math.max(0, value - step))}
        aria-label={`Menos ${step} ${label}`}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background text-foreground"
      >
        <Minus className="h-7 w-7" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <span className="text-5xl font-black tabular-nums leading-none">
          {Number.isInteger(value) ? value : value.toFixed(1)}
        </span>
        <span className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <button
        onClick={() => onChange(value + step)}
        aria-label={`Más ${step} ${label}`}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background text-foreground"
      >
        <Plus className="h-7 w-7" />
      </button>
    </div>
  );
}

function BigBtn({
  children,
  onClick,
  disabled,
  primary = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex min-h-14 min-w-14 flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-base font-bold disabled:opacity-40",
        primary
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

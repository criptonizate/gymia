"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Minus,
  Play,
  Plus,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { ExerciseMedia } from "@/modules/exercises/components/ExerciseMedia";
import {
  beep,
  unlockAudio,
  vibrate,
} from "@/modules/workouts/components/beep";
import {
  readVoiceEnabled,
  say,
  setVoiceEnabled,
} from "@/modules/workouts/components/voice";
import { FocusTutorial } from "./focus-tutorial";
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
  /**
   * Notifica al padre cada vez que se registra una serie desde focus para
   * que SessionView tenga esos logs visibles al salir del modo focus.
   */
  onLogCommitted: (log: SetLog) => void;
  /**
   * Error del padre al guardar. Lo mostramos para que el user sepa que algo
   * salió mal (misma gramática que SessionView).
   */
  onSaveError?: (error: string | null) => void;
};

const DEFAULT_REST = 60;

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
  onLogCommitted,
  onSaveError,
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

  const lastLogs = lastLogsByExercise[ex.exercise_id];
  const firstLast = lastLogs?.[0];
  const stepKg = weightStep(ex.exercise.equipment.slug);
  const tipoRegistro = ex.exercise.tipo_registro;
  const esTiempo = tipoRegistro === "tiempo";
  const esPeso = tipoRegistro === "peso_reps";

  const serieActual = currentSets.length + 1;
  const terminado = serieActual > ex.series;

  const defaultPeso = esPeso
    ? ex.peso_objetivo_kg ?? firstLast?.peso_kg ?? null
    : null;
  const defaultReps = esTiempo
    ? 0
    : ex.reps_max ?? ex.reps_min ?? firstLast?.reps ?? 10;
  const durObjetivo = ex.duracion_seg ?? firstLast?.duracion_seg ?? 30;

  const [peso, setPeso] = useState<number | null>(defaultPeso);
  const [reps, setReps] = useState<number>(defaultReps);
  // Para tipo "tiempo": timer de ejecución del ejercicio.
  const [holdSecs, setHoldSecs] = useState<number>(durObjetivo);
  const [holdRunning, setHoldRunning] = useState(false);
  const [rest, setRest] = useState<number | null>(null);
  const [voice, setVoice] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [sinMedir, setSinMedir] = useState(false);

  useEffect(() => {
    setVoice(readVoiceEnabled());
    try {
      if (!localStorage.getItem("gymia-focus-tutorial-seen")) {
        setShowTutorial(true);
      }
    } catch {
      // noop
    }
  }, []);

  function dismissTutorial() {
    try {
      localStorage.setItem("gymia-focus-tutorial-seen", "1");
    } catch {
      // noop
    }
    setShowTutorial(false);
  }

  function toggleVoice() {
    const next = !voice;
    setVoice(next);
    setVoiceEnabled(next);
    if (next) {
      unlockAudio();
      say("Narración activada");
    }
  }

  // Cambio de ejercicio: resetear defaults pero NO el descanso (que puede
  // seguir corriendo mientras el user "espía" el próximo).
  useEffect(() => {
    onIndexChange(i);
    setCurrentSets(
      logs
        .filter((l) => l.routine_exercise_id === ejercicios[i]?.id)
        .sort((a, b) => a.numero_serie - b.numero_serie),
    );
    const nextEx = ejercicios[i];
    if (!nextEx) return;
    const last = lastLogsByExercise[nextEx.exercise_id]?.[0];
    const nextEsPeso = nextEx.exercise.tipo_registro === "peso_reps";
    const nextEsTiempo = nextEx.exercise.tipo_registro === "tiempo";
    setPeso(nextEsPeso ? nextEx.peso_objetivo_kg ?? last?.peso_kg ?? null : null);
    setReps(
      nextEsTiempo ? 0 : nextEx.reps_max ?? nextEx.reps_min ?? last?.reps ?? 10,
    );
    setHoldSecs(nextEx.duracion_seg ?? last?.duracion_seg ?? 30);
    setHoldRunning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  // Timer de descanso
  useEffect(() => {
    if (rest == null) return;
    if (rest <= 0) {
      beep(200, 880);
      vibrate([200, 100, 200]);
      say(`Serie ${Math.min(serieActual, ex.series)}. Dale.`);
      setRest(null);
      return;
    }
    const t = setTimeout(() => setRest((r) => (r == null ? null : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [rest]);

  // Timer de ejecución (tipo "tiempo")
  useEffect(() => {
    if (!holdRunning) return;
    if (holdSecs <= 0) {
      beep(300, 1040);
      vibrate([300, 150, 300]);
      setHoldRunning(false);
      marcarSerie(durObjetivo);
      return;
    }
    const t = setTimeout(
      () => setHoldSecs((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdRunning, holdSecs]);

  async function marcarSerie(duracionReal?: number) {
    unlockAudio();
    vibrate(20);
    say(`Serie ${serieActual} marcada`);
    const num = serieActual;
    const planPeso = esPeso ? ex.peso_objetivo_kg : null;
    const planReps = esTiempo ? null : ex.reps_max ?? ex.reps_min ?? null;
    const dur = esTiempo ? duracionReal ?? durObjetivo : null;
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
      peso_kg: esPeso ? peso : null,
      reps: esTiempo ? null : reps,
      duracion_seg: dur,
      rir: null,
      completada: true,
      created_at: new Date().toISOString(),
    };
    setCurrentSets((p) => [...p, newLog]);
    // Subir el log al padre para que SessionView lo tenga al salir de focus.
    onLogCommitted(newLog);
    setRest(ex.descanso_seg ?? DEFAULT_REST);
    if (esTiempo) setHoldSecs(durObjetivo);
    const res = await logSetOffline({
      sessionId,
      routineExerciseId: ex.id,
      exerciseId: ex.exercise_id,
      esSustituto: false,
      numeroSerie: num,
      objetivoReps: planReps,
      objetivoPesoKg: planPeso,
      objetivoSeg: ex.duracion_seg,
      pesoKg: esPeso ? peso : null,
      reps: esTiempo ? null : reps,
      duracionSeg: dur,
      rir: null,
      completada: true,
    });
    if (!res.ok) onSaveError?.(res.error);
    else onSaveError?.(null);
  }

  function siguiente() {
    unlockAudio();
    vibrate(20);
    if (i < total - 1) setI(i + 1);
    else {
      onExit();
      router.push("/hoy");
    }
  }

  function handleExit() {
    const haySetsSinSerie = currentSets.length > 0 && !terminado;
    if (
      haySetsSinSerie &&
      !confirm("¿Salir del modo focus? La sesión queda guardada.")
    ) {
      return;
    }
    onExit();
  }

  const missed = !esTiempo && ex.reps_min != null && reps < ex.reps_min;
  const displayPeso = toDisplay(peso, unit);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col overflow-y-auto bg-background md:mx-auto md:my-4 md:max-w-md md:rounded-3xl md:border md:border-border">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-3">
        <div className="order-2 flex min-w-full flex-col sm:order-1 sm:min-w-0 sm:flex-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {i + 1}/{total} · Serie {Math.min(serieActual, ex.series)}/{ex.series}
          </span>
          <h1 className="truncate text-xl font-bold leading-tight">
            {ex.exercise.nombre}
          </h1>
        </div>
        <div className="order-1 flex flex-none items-center gap-1 sm:order-2">
        <button
          onClick={() => setShowTutorial(true)}
          aria-label="Ayuda"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
        <button
          onClick={toggleVoice}
          aria-label={voice ? "Silenciar narración" : "Activar narración"}
          className={`flex h-11 w-11 items-center justify-center rounded-full border ${
            voice
              ? "border-primary bg-[var(--primary-soft)] text-primary"
              : "border-border bg-card"
          }`}
        >
          {voice ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5" />
          )}
        </button>
        <button
          onClick={handleExit}
          aria-label="Salir del modo focus"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card"
        >
          <X className="h-5 w-5" />
        </button>
        </div>
      </header>
      {showTutorial && <FocusTutorial onClose={dismissTutorial} />}

      {rest != null && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-[var(--primary-soft)] px-3 py-2">
          <div className="flex min-w-0 flex-1 flex-col leading-none">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Descanso
            </span>
            <span className="text-4xl font-black tabular-nums text-primary sm:text-5xl">
              {rest}
              <span className="text-base font-bold sm:text-xl"> seg</span>
            </span>
          </div>
          <div className="flex gap-2">
          <button
            onClick={() => {
              unlockAudio();
              setRest((r) => (r ?? 0) + 15);
            }}
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
        </div>
      )}

      <div className="relative h-52 shrink-0 bg-[var(--primary-soft)]">
        <ExerciseMedia
          mediaUrl={ex.exercise.media_url}
          frames={ex.exercise.media_frames}
          muscleGroupSlug={ex.exercise.muscle_group.slug}
          exerciseSlug={ex.exercise.slug}
          patron={ex.exercise.patron}
          alt={ex.exercise.nombre}
          className="h-full w-full"
          sizes="448px"
          fit="contain"
          minimal
        />
      </div>

      {terminado ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
          <Check className="h-20 w-20 text-primary" />
          <span className="max-w-full break-words text-xl font-bold">
            Terminaste {ex.exercise.nombre}
          </span>
          <BigBtn primary onClick={siguiente}>
            {i < total - 1 ? "Próximo ejercicio" : "Finalizar sesión"}
          </BigBtn>
        </section>
      ) : esTiempo ? (
        <section className="flex flex-1 flex-col items-stretch justify-between gap-4 p-4">
          {firstLast?.duracion_seg && (
            <p className="text-center text-sm text-muted-foreground">
              Última vez: {firstLast.duracion_seg}s
            </p>
          )}
          <div className="flex flex-col items-center justify-center gap-4">
            <span className="text-sm uppercase tracking-wider text-muted-foreground">
              Objetivo {durObjetivo}s
            </span>
            <span
              className={`font-black leading-none tabular-nums text-[clamp(4.5rem,30vw,8.75rem)] ${
                holdRunning ? "text-primary" : ""
              }`}
            >
              {holdSecs}
            </span>
          </div>
          {holdRunning ? (
            <button
              onClick={() => {
                vibrate(30);
                setHoldRunning(false);
              }}
              className="flex min-h-20 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card text-2xl font-black"
            >
              Pausar
            </button>
          ) : (
            <button
              onClick={() => {
                unlockAudio();
                vibrate(30);
                if (holdSecs <= 0) setHoldSecs(durObjetivo);
                setHoldRunning(true);
              }}
              className="flex min-h-20 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-2xl font-black text-primary-foreground"
            >
              <Play className="h-7 w-7" />
              Empezar serie {serieActual}
            </button>
          )}
        </section>
      ) : (
        <section className="flex flex-1 flex-col items-stretch justify-between gap-4 p-4">
          {firstLast && !sinMedir && (
            <p className="break-words text-center text-sm text-muted-foreground">
              Última vez:{" "}
              {esPeso
                ? `${firstLast.peso_kg ?? "?"} kg × ${firstLast.reps ?? "?"}`
                : `${firstLast.reps ?? "?"} reps`}
            </p>
          )}

          <button
            onClick={() => setSinMedir((v) => !v)}
            className="self-center whitespace-nowrap rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground"
          >
            {sinMedir ? "Volver a medir" : "Modo sin medir"}
          </button>

          {sinMedir ? (
            <div className="flex flex-col gap-3 pt-2">
              <p className="text-center text-sm text-muted-foreground">
                ¿Cómo sentiste la serie?
              </p>
              <div className="grid grid-cols-3 gap-3">
                <RpeButton
                  emoji="💪"
                  label="Fácil"
                  onClick={() => {
                    const bump = esPeso ? stepKg : 1;
                    if (esPeso) setPeso((p) => (p ?? 0) + bump);
                    else setReps((r) => r + 1);
                    marcarSerie();
                  }}
                />
                <RpeButton
                  emoji="✅"
                  label="Bien"
                  onClick={() => marcarSerie()}
                />
                <RpeButton
                  emoji="🥵"
                  label="Durísimo"
                  onClick={() => {
                    const bump = esPeso ? stepKg : 1;
                    if (esPeso)
                      setPeso((p) => Math.max(0, (p ?? 0) - bump));
                    else setReps((r) => Math.max(0, r - 1));
                    marcarSerie();
                  }}
                />
              </div>
              <p className="text-center text-[11px] text-muted-foreground">
                La próxima subimos, mantenemos o bajamos solos.
              </p>
            </div>
          ) : (
            <>
              {esPeso && (
                <Stepper
                  label={unit}
                  value={displayPeso ?? 0}
                  step={unit === "lb" ? Math.round(stepKg * KG_TO_LB) : stepKg}
                  onChange={(v) => setPeso(fromDisplay(v, unit))}
                  allowEdit
                />
              )}

              <Stepper
                label="reps"
                value={reps}
                step={1}
                onChange={setReps}
                tone={missed ? "warning" : "normal"}
                allowEdit
              />

              <button
                onClick={() => marcarSerie()}
                className="flex min-h-20 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-2xl font-black text-primary-foreground"
              >
                <Check className="h-7 w-7" />
                Marcar serie {serieActual}
              </button>
            </>
          )}
        </section>
      )}

      <nav className="flex items-center justify-between gap-2 border-t border-border p-3">
        <BigBtn
          onClick={() => {
            if (i > 0) {
              vibrate(10);
              setI(i - 1);
            }
          }}
          disabled={i === 0}
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">Anterior</span>
        </BigBtn>
        <BigBtn
          onClick={() => {
            if (i < total - 1) {
              vibrate(10);
              setI(i + 1);
            }
          }}
          disabled={i >= total - 1}
        >
          <span className="text-sm">Siguiente</span>
          <ChevronRight className="h-5 w-5" />
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
  allowEdit = false,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
  tone?: "normal" | "warning";
  allowEdit?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(Number.isInteger(value) ? String(value) : value.toFixed(1));
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, value]);

  function commit() {
    const n = parseFloat(draft.replace(",", "."));
    if (Number.isFinite(n) && n >= 0) onChange(n);
    setEditing(false);
  }

  const cls =
    tone === "warning"
      ? "border-warning bg-[var(--warning-soft)]"
      : "border-border bg-card";
  return (
    <div
      className={`flex items-center justify-between rounded-2xl border p-3 ${cls}`}
    >
      <button
        onClick={() => onChange(Math.max(0, value - step))}
        aria-label={`Menos ${step} ${label}`}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background text-foreground"
      >
        <Minus className="h-7 w-7" />
      </button>
      <button
        type="button"
        onClick={() => allowEdit && setEditing(true)}
        className="flex min-w-0 flex-1 flex-col items-center"
        disabled={!allowEdit}
      >
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full bg-transparent text-center text-5xl font-black tabular-nums leading-none outline-none"
          />
        ) : (
          <span className="text-5xl font-black tabular-nums leading-none">
            {Number.isInteger(value) ? value : value.toFixed(1)}
          </span>
        )}
        <span className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
          {label}
          {allowEdit && !editing && " · tocá para editar"}
        </span>
      </button>
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

function RpeButton({
  emoji,
  label,
  onClick,
}: {
  emoji: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card"
    >
      <span className="text-4xl">{emoji}</span>
      <span className="text-xs font-semibold">{label}</span>
    </button>
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

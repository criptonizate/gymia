"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Info,
  MoreHorizontal,
  Repeat,
  Check,
} from "lucide-react";
import { ExerciseMedia } from "@/modules/exercises/components/ExerciseMedia";
import { TechniqueSheet } from "@/modules/exercises/components/TechniqueSheet";
import type { ExerciseWithRelations } from "@/modules/exercises/types";
import { SetRow } from "@/modules/workouts/components/SetRow";
import { RestTimer } from "@/modules/workouts/components/RestTimer";
import { HoldTimer } from "@/modules/workouts/components/HoldTimer";
import { BusyMachineSheet } from "@/modules/workouts/components/BusyMachineSheet";
import { PresetCountdown } from "@/modules/workouts/components/PresetCountdown";
import { ProgressionSheet } from "@/modules/workouts/components/ProgressionSheet";
import { WarmupTip } from "@/modules/workouts/components/WarmupTip";
import { Focus } from "lucide-react";
import { FocusView } from "./focus-view";
import { readPresetCountdown } from "@/lib/preferences";
import { applyProgression } from "@/modules/workouts/actions";
import {
  logSetOffline,
  startQueueSyncOnline,
} from "@/modules/workouts/offline-queue";
import {
  finishSessionOffline,
  saveSessionCache,
  startFinishSyncOnline,
} from "@/modules/workouts/offline-session";
import {
  weightStep,
  type CurrentTarget,
  type SetResult,
  type Suggestion,
} from "@/modules/workouts/progression";
import type { RoutineExerciseRow } from "@/modules/routines/queries";
import type { SetLog } from "@/modules/workouts/queries";

type Props = {
  sessionId: string;
  startedAt: string;
  dayNombre: string;
  ejercicios: RoutineExerciseRow[];
  logs: SetLog[];
  lastLogsByExercise: Record<string, SetLog[]>;
  substitutes: Record<string, ExerciseWithRelations>;
};

type Override = { exerciseId: string; exerciseSlug: string; nombre: string; media_url: string | null; media_frames: string[]; muscle_group_slug: string; instrucciones: string[]; errores_comunes: string[]; youtube_query: string | null; equipment_slug: string; tipo_registro: "peso_reps" | "reps" | "tiempo" };

export function SessionView({
  sessionId,
  startedAt,
  dayNombre,
  ejercicios,
  logs: initialLogs,
  lastLogsByExercise,
  substitutes,
}: Props) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [logs, setLogs] = useState<SetLog[]>(initialLogs);
  // Hidratar overrides desde los sustitutos persistidos (recarga sesión abierta)
  const [overrides, setOverrides] = useState<Record<string, Override>>(() => {
    const init: Record<string, Override> = {};
    for (const [reId, ex] of Object.entries(substitutes)) {
      init[reId] = {
        exerciseId: ex.id,
        exerciseSlug: ex.slug,
        nombre: ex.nombre,
        media_url: ex.media_url,
        media_frames: ex.media_frames,
        muscle_group_slug: ex.muscle_group.slug,
        instrucciones: ex.instrucciones,
        errores_comunes: ex.errores_comunes,
        youtube_query: ex.youtube_query,
        equipment_slug: ex.equipment.slug,
        tipo_registro: ex.tipo_registro,
      };
    }
    return init;
  });
  const [rest, setRest] = useState<{ seconds: number } | null>(null);
  const [presetSecs, setPresetSecs] = useState<number | null>(null);
  const [focusMode, setFocusMode] = useState<boolean>(false);

  // Arrancar sync offline al montar la vista
  useEffect(() => startQueueSyncOnline(), []);
  useEffect(() => startFinishSyncOnline(), []);

  // Guardar en IndexedDB el contexto de esta sesión (por si cae internet,
  // podés reabrir /sesion/[id] y seguir).
  useEffect(() => {
    void saveSessionCache({
      session_id: sessionId,
      startedAt,
      dayNombre,
      ejercicios,
      logs,
      lastLogsByExercise,
      substitutes,
    });
    // Pre-fetch de las imágenes del día para que estén en el cache del SW.
    for (const e of ejercicios) {
      for (const url of e.exercise.media_frames ?? []) {
        if (url) {
          const img = new window.Image();
          img.decoding = "async";
          img.loading = "eager";
          img.src = url;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);
  const [holdOpen, setHoldOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const [busyOpen, setBusyOpen] = useState(false);
  const [progressionOpen, setProgressionOpen] = useState<null | {
    target: CurrentTarget;
    results: SetResult[];
    routineExerciseId: string;
  }>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const current = ejercicios[i];
  const override = overrides[current.id];
  const activeExercise: ExerciseWithRelations = (override
    ? overrideAsExercise(current, override)
    : current.exercise);
  const activeTipoRegistro = override?.tipo_registro ?? current.exercise.tipo_registro;
  const activeEquipmentSlug = override?.equipment_slug ?? current.exercise.equipment.slug;
  const activeExerciseId = override?.exerciseId ?? current.exercise_id;
  const isSub = !!override;

  // Logs del ejercicio actual
  const currentSets = useMemo(
    () =>
      logs
        .filter((l) => l.routine_exercise_id === current.id)
        .sort((a, b) => a.numero_serie - b.numero_serie),
    [logs, current.id],
  );
  const lastLogs = lastLogsByExercise[activeExerciseId];

  // Swipe horizontal (ignora si parece scroll vertical, si viene de
  // dentro de un overlay o de un control interactivo).
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    // Si el toque empezó dentro de un dialog/button/input/textarea/select,
    // no capturamos el swipe (evita robar scroll de bottom sheets y taps).
    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        '[role="dialog"], button, input, textarea, select, label, a',
      )
    ) {
      touchStart.current = null;
      return;
    }
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 60) return;
    // Horizontal real: X tiene que dominar sobre Y
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
    // Swipe entre ejercicios: no cortamos los timers, el user puede
    // querer ir viendo el próximo mientras descansa.
    if (dx < 0 && i < ejercicios.length - 1) setI(i + 1);
    if (dx > 0 && i > 0) setI(i - 1);
  }

  // Optimistic + server save
  async function commitSet(
    serieNumero: number,
    data: {
      peso_kg: number | null;
      reps: number | null;
      rir?: number | null;
      completada: boolean;
      duracion_seg?: number | null;
    },
  ) {
    // Local update
    setLogs((prev) => {
      const next = prev.filter(
        (l) =>
          !(
            l.routine_exercise_id === current.id &&
            l.numero_serie === serieNumero
          ),
      );
      next.push({
        id: `tmp-${current.id}-${serieNumero}-${Date.now()}`,
        session_id: sessionId,
        routine_exercise_id: current.id,
        exercise_id: activeExerciseId,
        es_sustituto: isSub,
        numero_serie: serieNumero,
        objetivo_reps: current.reps_max ?? current.reps_min ?? null,
        objetivo_peso_kg: current.peso_objetivo_kg ?? null,
        objetivo_seg: current.duracion_seg ?? null,
        peso_kg: data.peso_kg,
        reps: data.reps,
        duracion_seg: data.duracion_seg ?? null,
        completada: data.completada,
        rir: data.rir ?? null,
        created_at: new Date().toISOString(),
      } as SetLog);
      return next;
    });

    // Rest timer al marcar completada
    if (data.completada && activeTipoRegistro !== "tiempo") {
      setRest({ seconds: current.descanso_seg });
    }

    // Persistir (offline-queued si no hay conexión)
    await logSetOffline({
      sessionId,
      routineExerciseId: current.id,
      exerciseId: activeExerciseId,
      esSustituto: isSub,
      numeroSerie: serieNumero,
      objetivoReps: current.reps_max ?? current.reps_min ?? null,
      objetivoPesoKg: current.peso_objetivo_kg ?? null,
      objetivoSeg: current.duracion_seg ?? null,
      pesoKg: data.peso_kg,
      reps: data.reps,
      duracionSeg: data.duracion_seg ?? null,
      rir: data.rir ?? null,
      completada: data.completada,
    });
  }

  function onHoldComplete(segs: number, completo: boolean) {
    // Buscar próxima serie no completada
    const nextSerie = (currentSets.filter((s) => s.completada).length) + 1;
    commitSet(nextSerie, {
      peso_kg: null,
      reps: null,
      duracion_seg: segs,
      completada: completo,
    });
    setHoldOpen(false);
    setRest({ seconds: current.descanso_seg });
  }

  const allDoneCurrent =
    currentSets.length >= current.series &&
    currentSets.filter((s) => s.completada).length >= current.series;

  function openProgression() {
    const target: CurrentTarget = {
      tipo_registro: activeTipoRegistro,
      equipment_slug: activeEquipmentSlug,
      peso_objetivo_kg: current.peso_objetivo_kg,
      reps_min: current.reps_min,
      reps_max: current.reps_max,
      duracion_seg: current.duracion_seg,
      series: current.series,
    };
    const results: SetResult[] = currentSets.map((s) => ({
      completada: s.completada,
      peso_kg: s.peso_kg,
      reps: s.reps,
      duracion_seg: s.duracion_seg,
    }));
    setProgressionOpen({ target, results, routineExerciseId: current.id });
  }

  async function onPickSuggestion(s: Suggestion) {
    if (!progressionOpen) return;
    // Si entrenaste con sustituto, no sobreescribimos el objetivo del
    // ejercicio original: lo dejaríamos inconsistente con tu progreso real.
    if (!isSub) {
      await applyProgression(
        progressionOpen.routineExerciseId,
        progressionOpen.target,
        s,
      );
    }
    setRest(null);
    setPresetSecs(null);
    if (i < ejercicios.length - 1) setI(i + 1);
    else setSummaryOpen(true);
  }

  async function onFinish(notas?: string) {
    await finishSessionOffline(sessionId, notas);
    router.push("/hoy");
  }

  const stepKg = weightStep(activeEquipmentSlug);
  const prevSummary = lastSummary(activeTipoRegistro, lastLogs);

  return (
    <div
      className="flex min-h-dvh flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between gap-2 border-b border-border bg-background/95 px-3 py-3 backdrop-blur">
        <button
          onClick={() => router.push("/hoy")}
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col text-center">
          <span className="truncate text-xs text-muted-foreground">
            {dayNombre}
          </span>
          <span className="text-sm font-medium tabular-nums">
            {i + 1} / {ejercicios.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFocusMode(true)}
            className="flex h-10 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs font-medium"
            aria-label="Modo focus"
          >
            <Focus className="h-3.5 w-3.5 text-primary" />
            Focus
          </button>
          <button
            onClick={() => setBusyOpen(true)}
            className="flex h-10 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs font-medium"
            aria-label="Máquina ocupada"
          >
            <Repeat className="h-3.5 w-3.5 text-primary" />
            Ocupada
          </button>
        </div>
      </header>

      {/* Media + técnica */}
      <div
        className="relative overflow-hidden"
        onClick={() => setTechOpen(true)}
        role="button"
      >
        <ExerciseMedia
          mediaUrl={activeExercise.media_url}
          frames={activeExercise.media_frames}
          muscleGroupSlug={activeExercise.muscle_group.slug}
          exerciseSlug={activeExercise.slug}
          patron={activeExercise.patron}
          alt={activeExercise.nombre}
          className="aspect-[4/3] w-full"
        />
        <span className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white">
          <Info className="h-3.5 w-3.5" />
          Técnica
        </span>
        {isSub && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
            Sustituto hoy
          </span>
        )}
      </div>

      {/* Info principal */}
      <section className="flex flex-col gap-2 px-4 pt-4">
        {current.superset_group != null && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-primary">
            Superset · {supersetLabel(ejercicios, current)}
          </span>
        )}
        <h1 className="text-xl font-bold leading-tight">{activeExercise.nombre}</h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          {activeTipoRegistro === "tiempo"
            ? `${current.series}×${current.duracion_seg}s`
            : `${current.series}×${current.reps_min}-${current.reps_max}`}
          {current.peso_objetivo_kg != null && activeTipoRegistro !== "tiempo"
            ? ` · objetivo ${current.peso_objetivo_kg} kg`
            : ""}
        </p>
        {prevSummary && (
          <p className="text-xs text-muted-foreground">Última vez: {prevSummary}</p>
        )}
      </section>

      {i === 0 && (
        <section className="px-4 pt-2">
          <WarmupTip primerEjercicio={activeExercise.nombre} />
        </section>
      )}

      {/* Series */}
      <section className="flex flex-col gap-2 p-4">
        {activeTipoRegistro === "tiempo" ? (
          <HoldTimerCta
            targetSeconds={current.duracion_seg ?? 30}
            completedSets={currentSets.filter((s) => s.completada).length}
            totalSets={current.series}
            onStart={() => setHoldOpen(true)}
          />
        ) : (
          Array.from({ length: current.series }, (_, idx) => {
            const num = idx + 1;
            const existing = currentSets.find((s) => s.numero_serie === num);
            const lastSet = lastLogs?.[idx] ?? lastLogs?.[lastLogs.length - 1];
            return (
              <SetRow
                key={current.id + "-" + num}
                numero={num}
                tipoRegistro={activeTipoRegistro as "peso_reps" | "reps"}
                objetivoPeso={current.peso_objetivo_kg}
                objetivoRepsMin={current.reps_min}
                objetivoRepsMax={current.reps_max}
                rirObjetivo={current.rir_objetivo}
                initialPeso={existing?.peso_kg ?? lastSet?.peso_kg ?? current.peso_objetivo_kg}
                initialReps={existing?.reps ?? lastSet?.reps ?? current.reps_max ?? current.reps_min}
                initialRir={existing?.rir ?? null}
                initialCompletada={existing?.completada}
                stepKg={stepKg}
                onCommit={(v) => commitSet(num, v)}
              />
            );
          })
        )}
      </section>

      {/* Acciones */}
      <section className="flex flex-col gap-2 px-4 pb-24">
        {allDoneCurrent && (
          <button
            onClick={openProgression}
            className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-[var(--primary-strong)]"
          >
            <Check className="h-5 w-5" />
            {i < ejercicios.length - 1 ? "Siguiente" : "Terminar"}
          </button>
        )}
      </section>

      {/* Nav flotante */}
      <nav className="sticky bottom-20 flex items-center justify-between gap-2 px-4 pb-2">
        <button
          onClick={() => {
            if (i > 0) { setI(i - 1); setRest(null); setPresetSecs(null); }
          }}
          disabled={i === 0}
          aria-label="Anterior"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card disabled:opacity-40"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            if (i < ejercicios.length - 1) { setI(i + 1); setRest(null); setPresetSecs(null); }
          }}
          disabled={i >= ejercicios.length - 1}
          aria-label="Siguiente"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card disabled:opacity-40"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </nav>

      {/* Overlays */}
      <TechniqueSheet
        open={techOpen}
        onClose={() => setTechOpen(false)}
        nombre={activeExercise.nombre}
        instrucciones={activeExercise.instrucciones}
        erroresComunes={activeExercise.errores_comunes}
        youtubeQuery={activeExercise.youtube_query}
      />

      {rest && (
        <RestTimer
          seconds={rest.seconds}
          onDone={() => {
            setRest(null);
            const s = readPresetCountdown();
            if (s > 0) setPresetSecs(s);
          }}
          onDismiss={() => setRest(null)}
        />
      )}

      {presetSecs && presetSecs > 0 && (
        <PresetCountdown
          seconds={presetSecs}
          onDone={() => setPresetSecs(null)}
          onCancel={() => setPresetSecs(null)}
        />
      )}

      {holdOpen && (
        <HoldTimer
          targetSeconds={current.duracion_seg ?? 30}
          onComplete={onHoldComplete}
          onCancel={() => setHoldOpen(false)}
        />
      )}

      <BusyMachineSheet
        open={busyOpen}
        onClose={() => setBusyOpen(false)}
        routineExerciseId={current.id}
        exerciseId={current.exercise_id}
        muscleGroupSlug={current.exercise.muscle_group.slug}
        patron={current.exercise.patron}
        tipo={current.exercise.tipo}
        equipmentSlug={current.exercise.equipment.slug}
        onUseOnce={(ex) => {
          setOverrides((prev) => ({
            ...prev,
            [current.id]: {
              exerciseId: ex.id,
              exerciseSlug: ex.slug,
              nombre: ex.nombre,
              media_url: ex.media_url,
              media_frames: ex.media_frames,
              muscle_group_slug: ex.muscle_group.slug,
              instrucciones: ex.instrucciones,
              errores_comunes: ex.errores_comunes,
              youtube_query: ex.youtube_query,
              equipment_slug: ex.equipment.slug,
              tipo_registro: ex.tipo_registro,
            },
          }));
          setBusyOpen(false);
        }}
      />

      {progressionOpen && (
        <ProgressionSheet
          open={!!progressionOpen}
          onClose={() => setProgressionOpen(null)}
          target={progressionOpen.target}
          results={progressionOpen.results}
          onPick={onPickSuggestion}
          esSustituto={isSub}
        />
      )}

      {focusMode && (
        <FocusView
          sessionId={sessionId}
          ejercicios={ejercicios}
          logs={logs}
          lastLogsByExercise={lastLogsByExercise}
          initialIndex={i}
          onIndexChange={setI}
          onExit={() => setFocusMode(false)}
        />
      )}

      {summaryOpen && (
        <SummaryOverlay
          startedAt={startedAt}
          logs={logs}
          ejercicios={ejercicios}
          lastLogsByExercise={lastLogsByExercise}
          onFinish={onFinish}
        />
      )}
    </div>
  );
}

function HoldTimerCta({
  targetSeconds,
  completedSets,
  totalSets,
  onStart,
}: {
  targetSeconds: number;
  completedSets: number;
  totalSets: number;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center">
      <p className="text-sm text-muted-foreground">
        Mantener {targetSeconds} segundos por serie
      </p>
      <p className="text-4xl font-bold tabular-nums">
        {completedSets} / {totalSets}
      </p>
      {completedSets < totalSets && (
        <button
          onClick={onStart}
          className="min-h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          Empezar serie {completedSets + 1}
        </button>
      )}
    </div>
  );
}

function supersetLabel(
  ejercicios: RoutineExerciseRow[],
  current: RoutineExerciseRow,
): string {
  const group = ejercicios.filter(
    (e) => e.superset_group === current.superset_group,
  );
  const idx = group.findIndex((e) => e.id === current.id);
  return group.map((_, i) => "A" + (i + 1) + (i === idx ? "*" : "")).join(" · ");
}

function overrideAsExercise(
  current: RoutineExerciseRow,
  override: Override,
): ExerciseWithRelations {
  return {
    ...current.exercise,
    id: override.exerciseId,
    slug: override.exerciseSlug,
    nombre: override.nombre,
    media_url: override.media_url,
    media_frames: override.media_frames,
    muscle_group: { ...current.exercise.muscle_group, slug: override.muscle_group_slug },
    equipment: { ...current.exercise.equipment, slug: override.equipment_slug, nombre: override.equipment_slug },
    instrucciones: override.instrucciones,
    errores_comunes: override.errores_comunes,
    youtube_query: override.youtube_query,
    tipo_registro: override.tipo_registro,
  };
}

function lastSummary(
  tipoRegistro: "peso_reps" | "reps" | "tiempo",
  logs?: SetLog[],
): string | null {
  if (!logs || logs.length === 0) return null;
  if (tipoRegistro === "tiempo") {
    const segs = logs.map((l) => l.duracion_seg).filter((x): x is number => x != null);
    if (!segs.length) return null;
    return `${segs.join(", ")} s`;
  }
  if (tipoRegistro === "reps") {
    const reps = logs.map((l) => l.reps).filter((x): x is number => x != null);
    if (!reps.length) return null;
    return reps.join(", ");
  }
  const reps = logs.map((l) => l.reps).filter((x): x is number => x != null);
  if (!reps.length) return null;
  return `${logs[0].peso_kg ?? "?"} kg × ${reps.join(", ")}`;
}

function SummaryOverlay({
  startedAt,
  logs,
  ejercicios,
  lastLogsByExercise,
  onFinish,
}: {
  startedAt: string;
  logs: SetLog[];
  ejercicios: RoutineExerciseRow[];
  lastLogsByExercise: Record<string, SetLog[]>;
  onFinish: (notas?: string) => void;
}) {
  const [notas, setNotas] = useState("");
  const [shareHint, setShareHint] = useState<string | null>(null);
  const mins = Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));
  const seriesCompletas = logs.filter((l) => l.completada).length;
  const seriesPlanificadas = ejercicios.reduce((a, e) => a + e.series, 0);
  const volumen = logs.reduce(
    (a, l) => a + (l.peso_kg ?? 0) * (l.reps ?? 0),
    0,
  );
  // Récords: por ejercicio, el peso máximo supera al histórico
  const records: string[] = [];
  const byEx = new Map<string, SetLog[]>();
  for (const l of logs) {
    const arr = byEx.get(l.exercise_id) ?? [];
    arr.push(l);
    byEx.set(l.exercise_id, arr);
  }
  for (const [exId, arr] of byEx) {
    const maxNow = Math.max(0, ...arr.map((a) => a.peso_kg ?? 0));
    if (maxNow <= 0) continue;
    const prev = lastLogsByExercise[exId] ?? [];
    const maxPrev = Math.max(0, ...prev.map((a) => a.peso_kg ?? 0));
    if (maxNow > maxPrev) {
      const name = ejercicios.find((e) => e.exercise_id === exId)?.exercise.nombre;
      if (name) records.push(`${name}: ${maxNow} kg`);
    }
  }
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-background p-6">
      <h2 className="text-2xl font-bold">¡Terminaste!</h2>
      <p className="text-sm text-muted-foreground">Buen laburo.</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Stat label="Duración" value={`${mins} min`} />
        <Stat label="Series" value={`${seriesCompletas}/${seriesPlanificadas}`} />
        <Stat label="Volumen" value={`${Math.round(volumen)} kg`} />
        <Stat label="Récords" value={`${records.length} ✨`} />
      </div>
      {records.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {records.map((r, i) => (
            <li
              key={i}
              className="rounded-xl border border-border bg-card p-3 text-sm"
            >
              ✨ {r}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-col gap-2">
        <label className="text-xs text-muted-foreground">Notas (opcional)</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Cómo te sentiste, qué cambiar la próxima..."
          rows={3}
          maxLength={500}
          className="min-h-20 rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
        />
      </div>
      {shareHint && (
        <p className="mt-3 rounded-xl border border-border bg-card px-3 py-2 text-center text-xs text-muted-foreground">
          {shareHint}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          onClick={async () => {
            const hint = await shareSummary({
              duracionMin: mins,
              seriesCompletas,
              seriesPlanificadas,
              volumen,
              records,
            });
            if (hint) {
              setShareHint(hint);
              setTimeout(() => setShareHint(null), 2500);
            }
          }}
          className="min-h-12 flex-1 rounded-xl border border-border bg-card text-sm font-medium"
        >
          Compartir
        </button>
        <button
          onClick={() => onFinish(notas)}
          className="min-h-14 flex-1 rounded-xl bg-primary text-base font-semibold text-primary-foreground"
        >
          Listo
        </button>
      </div>
    </div>
  );
}

async function shareSummary(s: {
  duracionMin: number;
  seriesCompletas: number;
  seriesPlanificadas: number;
  volumen: number;
  records: string[];
}): Promise<string | null> {
  const lines = [
    "GYMIA · resumen de hoy",
    `⏱️ ${s.duracionMin} min`,
    `✅ ${s.seriesCompletas}/${s.seriesPlanificadas} series`,
    `🏋️ ${Math.round(s.volumen).toLocaleString("es-AR")} kg de volumen`,
  ];
  if (s.records.length) lines.push("✨ Récords: " + s.records.join(" · "));
  const text = lines.join("\n");
  const nav = navigator as unknown as { share?: (d: { text: string }) => Promise<void> };
  if (nav.share) {
    try {
      await nav.share({ text });
      return null;
    } catch {
      // cancelado o fallback
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "Resumen copiado al portapapeles";
  } catch {
    return "No pude copiar el resumen";
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import type { ExerciseWithRelations } from "@/modules/exercises/types";
import type { RoutineDayRow, RoutineExerciseRow } from "@/modules/routines/queries";

const EX_COLS =
  "id, nombre, slug, muscle_group_id, secondary_muscles, equipment_id, patron, tipo, tipo_registro, nivel_minimo, instrucciones, errores_comunes, media_url, media_frames, youtube_query, youtube_video_id";

const RE_COLS = `
  id, routine_day_id, exercise_id, orden, series, reps_min, reps_max,
  duracion_seg, peso_objetivo_kg, descanso_seg, notas,
  exercise:exercises!inner(
    ${EX_COLS},
    muscle_group:muscle_groups!inner(id,nombre,slug),
    equipment:equipment!inner(id,nombre,slug)
  )
`;

export type SetLog = {
  id: string;
  session_id: string;
  routine_exercise_id: string;
  exercise_id: string;
  es_sustituto: boolean;
  numero_serie: number;
  objetivo_reps: number | null;
  objetivo_peso_kg: number | null;
  objetivo_seg: number | null;
  peso_kg: number | null;
  reps: number | null;
  duracion_seg: number | null;
  completada: boolean;
  created_at: string;
};

export type WorkoutSession = {
  id: string;
  user_id: string;
  routine_day_id: string;
  started_at: string;
  finished_at: string | null;
  notas: string | null;
};

// -------------------------------------------------------------------------
// ¿Qué día toca hoy?
// -------------------------------------------------------------------------
// Estrategia: el "siguiente día no hecho" dentro de la semana actual del plan.
// Un día está "hecho" si tiene una workout_session con finished_at. La semana
// actual se calcula a partir de cuántos días distintos ya se completaron.
// -------------------------------------------------------------------------
export async function getTodayContext(): Promise<null | {
  routineId: string;
  routineName: string;
  totalDias: number;
  completados: number;
  nextDay: {
    id: string;
    semana: number;
    orden: number;
    nombre: string;
    ejercicios: (RoutineExerciseRow & { lastLogs?: SetLog[] })[];
  } | null;
  planTerminado: boolean;
  openSessionId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: routine } = await supabase
    .from("routines")
    .select("id, nombre")
    .eq("owner_id", user.id)
    .eq("activa", true)
    .maybeSingle();
  if (!routine) return null;

  const { data: days } = await supabase
    .from("routine_days")
    .select("id, semana, orden, nombre")
    .eq("routine_id", routine.id)
    .order("semana")
    .order("orden");
  const allDays = days ?? [];

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, routine_day_id, started_at, finished_at")
    .eq("user_id", user.id);
  const sess = sessions ?? [];

  const finishedDayIds = new Set(
    sess.filter((s) => s.finished_at).map((s) => s.routine_day_id),
  );
  const open = sess.find((s) => !s.finished_at);
  const completados = finishedDayIds.size;

  // Siguiente día no hecho
  const nextDayRaw = allDays.find((d) => !finishedDayIds.has(d.id));
  const planTerminado = !nextDayRaw;

  if (!nextDayRaw) {
    return {
      routineId: routine.id,
      routineName: routine.nombre,
      totalDias: allDays.length,
      completados,
      nextDay: null,
      planTerminado: true,
      openSessionId: null,
    };
  }

  const { data: exs } = await supabase
    .from("routine_exercises")
    .select(RE_COLS)
    .eq("routine_day_id", nextDayRaw.id)
    .order("orden");

  const typedExs = (exs ?? []) as unknown as RoutineExerciseRow[];
  const exerciseIds = typedExs.map((e) => e.exercise_id);

  // "Última vez" por ejercicio: los set_logs de la última session distinta
  // (no la abierta) con ese exercise_id.
  const { data: lastLogs } = await supabase
    .from("set_logs")
    .select("*")
    .in("exercise_id", exerciseIds)
    .not("session_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(300);

  const logsByEx = new Map<string, SetLog[]>();
  for (const l of (lastLogs ?? []) as SetLog[]) {
    const arr = logsByEx.get(l.exercise_id) ?? [];
    arr.push(l);
    logsByEx.set(l.exercise_id, arr);
  }
  // Para cada ejercicio, tomar los sets de la última sesión en la que apareció.
  function lastSessionLogs(exId: string): SetLog[] | undefined {
    const logs = logsByEx.get(exId);
    if (!logs) return undefined;
    const lastSession = logs[0]?.session_id;
    return logs.filter((l) => l.session_id === lastSession);
  }

  return {
    routineId: routine.id,
    routineName: routine.nombre,
    totalDias: allDays.length,
    completados,
    nextDay: {
      ...nextDayRaw,
      ejercicios: typedExs.map((e) => ({
        ...e,
        lastLogs: lastSessionLogs(e.exercise_id),
      })),
    },
    planTerminado: false,
    openSessionId: open?.id ?? null,
  };
}

// -------------------------------------------------------------------------
// Sesión + contexto completo
// -------------------------------------------------------------------------
export async function getSessionContext(sessionId: string): Promise<null | {
  session: WorkoutSession;
  day: RoutineDayRow & { ejercicios: RoutineExerciseRow[] };
  logs: SetLog[];
  lastLogsByExercise: Record<string, SetLog[]>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return null;

  const { data: day } = await supabase
    .from("routine_days")
    .select("id, routine_id, semana, orden, nombre")
    .eq("id", session.routine_day_id)
    .maybeSingle();
  if (!day) return null;

  const { data: exs } = await supabase
    .from("routine_exercises")
    .select(RE_COLS)
    .eq("routine_day_id", day.id)
    .order("orden");

  const { data: logs } = await supabase
    .from("set_logs")
    .select("*")
    .eq("session_id", sessionId)
    .order("numero_serie");

  const typedExs = (exs ?? []) as unknown as RoutineExerciseRow[];
  const exIds = typedExs.map((e) => e.exercise_id);
  const { data: historical } = await supabase
    .from("set_logs")
    .select("*")
    .in("exercise_id", exIds)
    .neq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(500);

  const lastLogsByExercise: Record<string, SetLog[]> = {};
  for (const l of (historical ?? []) as SetLog[]) {
    // tomar la última session per ejercicio
    if (!lastLogsByExercise[l.exercise_id]) {
      lastLogsByExercise[l.exercise_id] = [];
    }
  }
  // armar sólo con la última sesión por ejercicio
  const bySess: Record<string, Record<string, SetLog[]>> = {};
  for (const l of (historical ?? []) as SetLog[]) {
    bySess[l.exercise_id] ??= {};
    bySess[l.exercise_id][l.session_id] ??= [];
    bySess[l.exercise_id][l.session_id].push(l);
  }
  for (const exId of Object.keys(bySess)) {
    const sessionsOrdered = Object.entries(bySess[exId]).sort((a, b) =>
      b[1][0].created_at.localeCompare(a[1][0].created_at),
    );
    lastLogsByExercise[exId] = sessionsOrdered[0]?.[1] ?? [];
  }

  return {
    session: session as WorkoutSession,
    day: { ...(day as RoutineDayRow), ejercicios: typedExs },
    logs: (logs ?? []) as SetLog[],
    lastLogsByExercise,
  };
}

// -------------------------------------------------------------------------
// Historial de un ejercicio (para la pantalla de detalle)
// -------------------------------------------------------------------------
export type HistoryEntry = {
  session_id: string;
  fecha: string;
  sets: SetLog[];
  volumen: number;
  pesoMax: number | null;
  repsTotales: number;
  segTotales: number;
};

export async function getExerciseHistory(
  exerciseId: string,
  limit = 10,
): Promise<HistoryEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: logs } = await supabase
    .from("set_logs")
    .select("*, session:workout_sessions!inner(user_id, finished_at)")
    .eq("exercise_id", exerciseId)
    .order("created_at", { ascending: false })
    .limit(limit * 10);

  if (!logs) return [];

  const bySession = new Map<string, SetLog[]>();
  for (const l of logs as unknown as (SetLog & { session: { user_id: string; finished_at: string | null } })[]) {
    if (l.session.user_id !== user.id || !l.session.finished_at) continue;
    const arr = bySession.get(l.session_id) ?? [];
    arr.push(l);
    bySession.set(l.session_id, arr);
  }

  const entries: HistoryEntry[] = [];
  for (const [session_id, sets] of bySession) {
    sets.sort((a, b) => a.numero_serie - b.numero_serie);
    let vol = 0;
    let pesoMax: number | null = null;
    let reps = 0;
    let seg = 0;
    for (const s of sets) {
      if (s.peso_kg && s.reps) vol += s.peso_kg * s.reps;
      if (s.peso_kg != null)
        pesoMax = Math.max(pesoMax ?? 0, s.peso_kg);
      if (s.reps != null) reps += s.reps;
      if (s.duracion_seg != null) seg += s.duracion_seg;
    }
    entries.push({
      session_id,
      fecha: sets[0].created_at,
      sets,
      volumen: vol,
      pesoMax,
      repsTotales: reps,
      segTotales: seg,
    });
  }
  entries.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return entries.slice(0, limit);
}

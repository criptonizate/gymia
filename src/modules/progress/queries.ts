import { createClient } from "@/lib/supabase/server";

export type KpiData = {
  entrenamientos_mes: number;
  volumen_total_kg: number;
  cumplimiento_semana: number;
  racha_semanas: number;
  planificadas_semana: number;
  hechas_semana: number;
};

export type TrainingDay = { dia: string; sesiones: number };
export type WeeklyVolume = { week_start: string; volumen: number };
export type SetsByMuscle = {
  muscle_group_slug: string;
  nombre: string;
  sets_total: number;
};
export type ExerciseRecord = {
  exercise_id: string;
  nombre: string;
  slug: string;
  peso_max: number;
  reps_en_max: number;
  rm_epley: number;
};
export type EvolutionPoint = {
  fecha: string;
  peso_max: number | null;
  reps_max: number | null;
  duracion_max: number | null;
};

export async function getKpis(): Promise<KpiData> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("user_kpis");
  return (
    (data as KpiData | null) ?? {
      entrenamientos_mes: 0,
      volumen_total_kg: 0,
      cumplimiento_semana: 0,
      racha_semanas: 0,
      planificadas_semana: 0,
      hechas_semana: 0,
    }
  );
}

export async function getTrainingDays(daysBack = 120): Promise<TrainingDay[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("user_training_days", {
    days_back: daysBack,
  });
  return (data as TrainingDay[] | null) ?? [];
}

export async function getWeeklyVolume(weeks = 12): Promise<WeeklyVolume[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("user_weekly_volume", { weeks });
  return (data as WeeklyVolume[] | null) ?? [];
}

export async function getSetsByMuscle(daysBack = 7): Promise<SetsByMuscle[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("user_sets_by_muscle_group", {
    days_back: daysBack,
  });
  return (data as SetsByMuscle[] | null) ?? [];
}

export async function getExerciseRecords(): Promise<ExerciseRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("user_exercise_records");
  return (data as ExerciseRecord[] | null) ?? [];
}

export type BodyWeightEntry = { fecha: string; kg: number };

export async function getBodyWeights(limit = 30): Promise<BodyWeightEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("body_weights")
    .select("fecha, kg")
    .eq("user_id", user.id)
    .order("fecha", { ascending: false })
    .limit(limit);
  return (data as BodyWeightEntry[] | null) ?? [];
}

export type RecentSession = {
  id: string;
  started_at: string;
  finished_at: string;
  notas: string | null;
  day_nombre: string;
  series_completadas: number;
  volumen: number;
};

export async function getRecentSessions(daysBack = 30): Promise<RecentSession[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const since = new Date(Date.now() - daysBack * 86400_000).toISOString();
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select(
      "id, started_at, finished_at, notas, day:routine_days!inner(nombre)",
    )
    .eq("user_id", user.id)
    .not("finished_at", "is", null)
    .gte("started_at", since)
    .order("started_at", { ascending: false });

  const ids = (sessions ?? []).map((s) => s.id);
  if (ids.length === 0) return [];

  const { data: logs } = await supabase
    .from("set_logs")
    .select("session_id, completada, peso_kg, reps")
    .in("session_id", ids);

  const stats = new Map<string, { series: number; vol: number }>();
  for (const l of logs ?? []) {
    const acc = stats.get(l.session_id) ?? { series: 0, vol: 0 };
    if (l.completada) acc.series += 1;
    if (l.peso_kg && l.reps) acc.vol += Number(l.peso_kg) * Number(l.reps);
    stats.set(l.session_id, acc);
  }

  return (sessions ?? []).map((s) => {
    const st = stats.get(s.id) ?? { series: 0, vol: 0 };
    return {
      id: s.id,
      started_at: s.started_at,
      finished_at: s.finished_at!,
      notas: s.notas,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      day_nombre: (s as any).day?.nombre ?? "Sesión",
      series_completadas: st.series,
      volumen: Math.round(st.vol),
    };
  });
}

export type WeekCompare = {
  sesiones_actual: number;
  sesiones_prev: number;
  series_actual: number;
  series_prev: number;
  volumen_actual: number;
  volumen_prev: number;
};

export async function getWeekCompare(): Promise<WeekCompare> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("user_week_compare");
  return (
    (data as WeekCompare | null) ?? {
      sesiones_actual: 0,
      sesiones_prev: 0,
      series_actual: 0,
      series_prev: 0,
      volumen_actual: 0,
      volumen_prev: 0,
    }
  );
}

export async function getExerciseEvolution(
  exerciseId: string,
): Promise<EvolutionPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("user_exercise_evolution", {
    _exercise_id: exerciseId,
  });
  return (data as EvolutionPoint[] | null) ?? [];
}

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

export async function getExerciseEvolution(
  exerciseId: string,
): Promise<EvolutionPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("user_exercise_evolution", {
    _exercise_id: exerciseId,
  });
  return (data as EvolutionPoint[] | null) ?? [];
}

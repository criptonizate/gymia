import { createClient } from "@/lib/supabase/server";
import type { ExerciseWithRelations } from "@/modules/exercises/types";

export type RoutineExerciseRow = {
  id: string;
  routine_day_id: string;
  exercise_id: string;
  orden: number;
  series: number;
  reps_min: number | null;
  reps_max: number | null;
  duracion_seg: number | null;
  peso_objetivo_kg: number | null;
  descanso_seg: number;
  notas: string | null;
  exercise: ExerciseWithRelations;
};

export type RoutineDayRow = {
  id: string;
  routine_id: string;
  semana: number;
  orden: number;
  nombre: string;
  ejercicios: RoutineExerciseRow[];
};

export type RoutineRow = {
  id: string;
  owner_id: string;
  nombre: string;
  dias_por_semana: number;
  semanas: number;
  split: string;
  nivel: "principiante" | "intermedio" | "avanzado";
  objetivo: "hipertrofia" | "fuerza" | "general";
  activa: boolean;
  created_at: string;
  dias: RoutineDayRow[];
};

const EX_COLS =
  "id, nombre, slug, muscle_group_id, secondary_muscles, equipment_id, patron, tipo, tipo_registro, nivel_minimo, instrucciones, errores_comunes, media_url, media_frames, youtube_query, youtube_video_id";

export async function getActiveRoutine(): Promise<RoutineRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: routine } = await supabase
    .from("routines")
    .select("*")
    .eq("owner_id", user.id)
    .eq("activa", true)
    .maybeSingle();
  if (!routine) return null;

  const { data: days } = await supabase
    .from("routine_days")
    .select("id, routine_id, semana, orden, nombre")
    .eq("routine_id", routine.id)
    .order("semana")
    .order("orden");

  const dayIds = (days ?? []).map((d) => d.id);
  const { data: exs } = await supabase
    .from("routine_exercises")
    .select(
      `id, routine_day_id, exercise_id, orden, series, reps_min, reps_max,
       duracion_seg, peso_objetivo_kg, descanso_seg, notas,
       exercise:exercises!inner(
         ${EX_COLS},
         muscle_group:muscle_groups!inner(id,nombre,slug),
         equipment:equipment!inner(id,nombre,slug)
       )`,
    )
    .in("routine_day_id", dayIds)
    .order("orden");

  const byDay = new Map<string, RoutineExerciseRow[]>();
  for (const e of (exs ?? []) as unknown as RoutineExerciseRow[]) {
    const arr = byDay.get(e.routine_day_id) ?? [];
    arr.push(e);
    byDay.set(e.routine_day_id, arr);
  }

  return {
    ...(routine as RoutineRow),
    dias: (days ?? []).map((d) => ({
      ...(d as RoutineDayRow),
      ejercicios: byDay.get(d.id) ?? [],
    })),
  };
}

import { createClient } from "@/lib/supabase/server";
import type {
  Equipment,
  Exercise,
  ExerciseWithRelations,
  MuscleGroup,
} from "./types";

const BASE_COLS =
  "id, nombre, slug, muscle_group_id, secondary_muscles, equipment_id, patron, tipo, tipo_registro, nivel_minimo, instrucciones, errores_comunes, media_url, media_frames, youtube_query, youtube_video_id";

export async function listMuscleGroups(): Promise<MuscleGroup[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("muscle_groups")
    .select("id, nombre, slug")
    .order("nombre");
  return (data as MuscleGroup[] | null) ?? [];
}

export async function listEquipment(): Promise<Equipment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment")
    .select("id, nombre, slug")
    .order("nombre");
  return (data as Equipment[] | null) ?? [];
}

export type ListExercisesFilters = {
  q?: string;
  muscleGroupSlug?: string;
  equipmentSlug?: string;
};

export async function listExercises(
  filters: ListExercisesFilters = {},
): Promise<ExerciseWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("exercises")
    .select(
      `${BASE_COLS}, muscle_group:muscle_groups!inner(id,nombre,slug), equipment:equipment!inner(id,nombre,slug)`,
    )
    .order("nombre");

  if (filters.q && filters.q.trim()) {
    query = query.ilike("nombre", `%${filters.q.trim()}%`);
  }
  if (filters.muscleGroupSlug) {
    query = query.eq("muscle_group.slug", filters.muscleGroupSlug);
  }
  if (filters.equipmentSlug) {
    query = query.eq("equipment.slug", filters.equipmentSlug);
  }

  const { data } = await query;
  return (data as unknown as ExerciseWithRelations[] | null) ?? [];
}

export async function getExerciseBySlug(
  slug: string,
): Promise<ExerciseWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises")
    .select(
      `${BASE_COLS}, muscle_group:muscle_groups!inner(id,nombre,slug), equipment:equipment!inner(id,nombre,slug)`,
    )
    .eq("slug", slug)
    .maybeSingle();
  return (data as unknown as ExerciseWithRelations | null) ?? null;
}

export async function getUserExerciseVideo(
  exerciseId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_exercise_videos")
    .select("youtube_video_id")
    .eq("user_id", user.id)
    .eq("exercise_id", exerciseId)
    .maybeSingle();
  return (data?.youtube_video_id as string | undefined) ?? null;
}

export type { Exercise, ExerciseWithRelations, MuscleGroup, Equipment };

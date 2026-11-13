"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  applySuggestion,
  type Suggestion,
  type CurrentTarget,
} from "./progression";
import { LogSetInput as LogSetSchema, UpdateSetLogInput } from "@/lib/validation";

export type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// -------------------------------------------------------------------------
// Empezar / Continuar sesión
// -------------------------------------------------------------------------
export async function startOrContinueSession(
  routineDayId: string,
): Promise<Result<{ sessionId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Hace falta iniciar sesión." };

  // ¿Hay una sesión abierta del mismo user?
  const { data: open } = await supabase
    .from("workout_sessions")
    .select("id, routine_day_id")
    .eq("user_id", user.id)
    .is("finished_at", null)
    .maybeSingle();
  if (open) return { ok: true, data: { sessionId: open.id } };

  const { data: created, error } = await supabase
    .from("workout_sessions")
    .insert({ user_id: user.id, routine_day_id: routineDayId })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: error?.message ?? "No pude empezar la sesión." };

  revalidatePath("/hoy");
  revalidatePath(`/sesion/${created.id}`);
  return { ok: true, data: { sessionId: created.id } };
}

// -------------------------------------------------------------------------
// Registrar / actualizar una serie
// -------------------------------------------------------------------------
export type LogSetInput = {
  sessionId: string;
  routineExerciseId: string;
  exerciseId: string;
  esSustituto?: boolean;
  numeroSerie: number;
  objetivoReps: number | null;
  objetivoPesoKg: number | null;
  objetivoSeg: number | null;
  pesoKg: number | null;
  reps: number | null;
  duracionSeg: number | null;
  completada: boolean;
};

export async function logSet(input: LogSetInput): Promise<Result<{ id: string }>> {
  const parsed = LogSetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const supabase = await createClient();
  // UPSERT por (session_id, routine_exercise_id, numero_serie)
  const { data, error } = await supabase
    .from("set_logs")
    .upsert(
      {
        session_id: input.sessionId,
        routine_exercise_id: input.routineExerciseId,
        exercise_id: input.exerciseId,
        es_sustituto: input.esSustituto ?? false,
        numero_serie: input.numeroSerie,
        objetivo_reps: input.objetivoReps,
        objetivo_peso_kg: input.objetivoPesoKg,
        objetivo_seg: input.objetivoSeg,
        peso_kg: input.pesoKg,
        reps: input.reps,
        duracion_seg: input.duracionSeg,
        completada: input.completada,
      },
      { onConflict: "session_id,routine_exercise_id,numero_serie" },
    )
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No pude guardar la serie." };
  return { ok: true, data: { id: data.id } };
}

// -------------------------------------------------------------------------
// Aplicar progresión al final del ejercicio
// -------------------------------------------------------------------------
export async function applyProgression(
  routineExerciseId: string,
  current: CurrentTarget,
  suggestion: Suggestion,
): Promise<Result> {
  const next = applySuggestion(current, suggestion);
  const supabase = await createClient();
  const { error } = await supabase
    .from("routine_exercises")
    .update({
      peso_objetivo_kg: next.peso_objetivo_kg ?? null,
      reps_min: next.reps_min ?? null,
      reps_max: next.reps_max ?? null,
      duracion_seg: next.duracion_seg ?? null,
    })
    .eq("id", routineExerciseId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

// -------------------------------------------------------------------------
// Finalizar sesión
// -------------------------------------------------------------------------
export async function finishSession(
  sessionId: string,
  notas?: string,
): Promise<Result> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    finished_at: new Date().toISOString(),
  };
  if (notas !== undefined) patch.notas = notas.trim() || null;
  const { error } = await supabase
    .from("workout_sessions")
    .update(patch)
    .eq("id", sessionId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/hoy");
  revalidatePath("/rutina");
  return { ok: true, data: undefined };
}

export async function saveSessionNotas(
  sessionId: string,
  notas: string,
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workout_sessions")
    .update({ notas: notas.trim() || null })
    .eq("id", sessionId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

// -------------------------------------------------------------------------
// Máquina ocupada: sustitutos
// -------------------------------------------------------------------------
export async function listSubstitutes(
  muscleGroupSlug: string,
  patron: string,
  tipo: "compuesto" | "aislamiento",
  excludeEquipmentSlug: string,
  excludeExerciseId: string,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises")
    .select(
      `id, nombre, slug, media_frames, media_url, patron, tipo, tipo_registro,
       muscle_group:muscle_groups!inner(id,nombre,slug),
       equipment:equipment!inner(id,nombre,slug)`,
    )
    .eq("muscle_group.slug", muscleGroupSlug)
    .eq("patron", patron)
    .eq("tipo", tipo)
    .neq("equipment.slug", excludeEquipmentSlug)
    .neq("id", excludeExerciseId)
    .order("nombre");
  return (data ?? []) as unknown as import("@/modules/exercises/types").ExerciseWithRelations[];
}

export async function replaceInRoutine(
  routineExerciseId: string,
  newExerciseId: string,
): Promise<Result> {
  const supabase = await createClient();
  const { data: ex } = await supabase
    .from("exercises")
    .select("tipo_registro")
    .eq("id", newExerciseId)
    .maybeSingle();
  const patch: Record<string, unknown> = { exercise_id: newExerciseId };
  if (ex?.tipo_registro === "tiempo") {
    patch.reps_min = null;
    patch.reps_max = null;
  } else {
    patch.duracion_seg = null;
  }
  const { error } = await supabase
    .from("routine_exercises")
    .update(patch)
    .eq("id", routineExerciseId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/rutina");
  return { ok: true, data: undefined };
}

// -------------------------------------------------------------------------
// Editar una serie del historial
// -------------------------------------------------------------------------
export async function updateSetLog(
  setLogId: string,
  patch: {
    peso_kg?: number | null;
    reps?: number | null;
    duracion_seg?: number | null;
    completada?: boolean;
  },
): Promise<Result> {
  const parsed = UpdateSetLogInput.safeParse({ id: setLogId, ...patch });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { id, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("set_logs").update(rest).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

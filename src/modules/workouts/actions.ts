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

  // ¿Hay una sesión abierta del mismo user? Si su día pertenece a una
  // rutina inactiva (porque regeneraste), cerrala y creá una nueva.
  const { data: open } = await supabase
    .from("workout_sessions")
    .select(
      "id, routine_day_id, day:routine_days!inner(routine:routines!inner(activa))",
    )
    .eq("user_id", user.id)
    .is("finished_at", null)
    .maybeSingle();
  if (open) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activa = (open as any).day?.routine?.activa === true;
    const mismoDia = open.routine_day_id === routineDayId;
    // Sólo retomamos la abierta si es del día que el user pidió — así
    // "Empezar" en otro día no te manda a la sesión del día anterior.
    if (activa && mismoDia) {
      return { ok: true, data: { sessionId: open.id } };
    }
    await supabase
      .from("workout_sessions")
      .update({ finished_at: new Date().toISOString() })
      .eq("id", open.id);
  }

  const { data: created, error } = await supabase
    .from("workout_sessions")
    .insert({ user_id: user.id, routine_day_id: routineDayId })
    .select("id")
    .maybeSingle();
  if (!error && created) {
    revalidatePath("/hoy");
    revalidatePath(`/sesion/${created.id}`);
    return { ok: true, data: { sessionId: created.id } };
  }
  // Si el unique partial de "una sesión abierta" rechazó por carrera,
  // leer la existente y devolverla.
  if (error && error.code === "23505") {
    const { data: again } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("user_id", user.id)
      .is("finished_at", null)
      .maybeSingle();
    if (again) return { ok: true, data: { sessionId: again.id } };
  }
  return { ok: false, error: error?.message ?? "No pude empezar la sesión." };
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
  rir?: number | null;
  completada: boolean;
};

export async function logSet(input: LogSetInput): Promise<Result<{ id: string }>> {
  const parsed = LogSetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const supabase = await createClient();
  // UPSERT por (session_id, routine_exercise_id, numero_serie).
  // Usamos maybeSingle() para no romper si el UPSERT no cambia nada y PostgREST
  // decide no devolver filas (PGRST116).
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
        rir: input.rir ?? null,
        completada: input.completada,
      },
      { onConflict: "session_id,routine_exercise_id,numero_serie" },
    )
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: data?.id ?? "upserted" } };
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
  // Refresh de materialized views de stats (si existen). No bloquea si falla.
  try {
    await supabase.rpc("refresh_user_stats");
  } catch {
    /* MV todavía no creada, no pasa nada */
  }
  revalidatePath("/hoy");
  revalidatePath("/rutina");
  revalidatePath("/cuenta");
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
  const { data, error } = await supabase
    .from("exercises")
    .select(
      `id, nombre, slug, media_frames, media_url, patron, tipo, tipo_registro,
       instrucciones, errores_comunes, youtube_query,
       muscle_group:muscle_groups!inner(id,nombre,slug),
       equipment:equipment!inner(id,nombre,slug)`,
    )
    .eq("muscle_group.slug", muscleGroupSlug)
    .eq("patron", patron)
    .eq("tipo", tipo)
    .neq("equipment.slug", excludeEquipmentSlug)
    .neq("id", excludeExerciseId)
    .order("nombre");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as import("@/modules/exercises/types").ExerciseWithRelations[];
}

export async function replaceInRoutine(
  routineExerciseId: string,
  newExerciseId: string,
): Promise<Result> {
  const supabase = await createClient();
  // Validamos que el user tenga visibilidad del ejercicio nuevo (RLS). Si
  // es un id ajeno o inexistente, data viene null y lo rechazamos en vez
  // de persistir un exercise_id que el join !inner va a ocultar después.
  const { data: ex } = await supabase
    .from("exercises")
    .select("tipo_registro")
    .eq("id", newExerciseId)
    .maybeSingle();
  if (!ex) {
    return { ok: false, error: "No encontré el ejercicio o no tenés acceso." };
  }
  // El objetivo de peso y RIR pertenecían al ejercicio viejo. Nulearlos
  // evita que "3×8-12 obj 100kg" quede arrastrado a una máquina con otro
  // rango de carga. La sugerencia de progresión los recalculará.
  const patch: Record<string, unknown> = {
    exercise_id: newExerciseId,
    peso_objetivo_kg: null,
    rir_objetivo: null,
  };
  if (ex?.tipo_registro === "tiempo") {
    // Tipo tiempo: necesita duracion_seg, pero no rango de reps.
    patch.reps_min = null;
    patch.reps_max = null;
    // Si el ejercicio viejo era de reps, duracion_seg estaba en null — poner
    // un default sensato.
    patch.duracion_seg = 30;
  } else {
    patch.duracion_seg = null;
    // Si el viejo era de tiempo, reps_min/reps_max estaban en null — rango
    // genérico que la progresión va a ajustar.
    const { data: current } = await supabase
      .from("routine_exercises")
      .select("reps_min, reps_max")
      .eq("id", routineExerciseId)
      .maybeSingle();
    if (current?.reps_min == null || current?.reps_max == null) {
      patch.reps_min = 8;
      patch.reps_max = 12;
    }
  }
  const { error } = await supabase
    .from("routine_exercises")
    .update(patch)
    .eq("id", routineExerciseId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/rutina");
  revalidatePath("/hoy");
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

  // Coherencia con el tipo_registro del exercise: nulear campos que no aplican
  // (sino queda data basura que infla PRs y volumen).
  const { data: log } = await supabase
    .from("set_logs")
    .select("exercise:exercises!inner(tipo_registro)")
    .eq("id", id)
    .maybeSingle();
  if (!log) {
    // El log no existe o RLS lo bloquea. No lo tratamos como éxito (antes
    // devolvíamos ok:true y la UI creía que se guardó).
    return { ok: false, error: "No encontré esa serie o no tenés permiso." };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tipo = (log as any)?.exercise?.tipo_registro as
    | "peso_reps"
    | "reps"
    | "tiempo"
    | undefined;
  const sanitized: Record<string, unknown> = { ...rest };
  if (tipo === "tiempo") {
    sanitized.peso_kg = null;
    sanitized.reps = null;
  } else if (tipo === "reps") {
    sanitized.peso_kg = null;
    sanitized.duracion_seg = null;
  } else if (tipo === "peso_reps") {
    sanitized.duracion_seg = null;
  }

  const { error, count } = await supabase
    .from("set_logs")
    .update(sanitized, { count: "exact" })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: "No se guardó: fila no accesible." };
  return { ok: true, data: undefined };
}

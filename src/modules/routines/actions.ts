"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listExercises } from "@/modules/exercises/queries";
import { RuleBasedGenerator } from "@/modules/routines/generator/rule-based";
import type {
  GeneratorConfig,
  RoutinePlan,
} from "@/modules/routines/generator/types";
import { prescripcion } from "@/modules/routines/generator/prescription";

export type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// -------------------------------------------------------------------------
// Wizard: generar preview (no persiste).
// -------------------------------------------------------------------------
export async function previewPlan(
  config: GeneratorConfig,
  seed?: number,
): Promise<Result<RoutinePlan>> {
  const catalog = await listExercises();
  const plan = RuleBasedGenerator.generate(
    config,
    catalog,
    seed ?? Math.floor(Math.random() * 2 ** 31),
  );
  return { ok: true, data: plan };
}

// -------------------------------------------------------------------------
// Confirmar plan → persistir en routines/routine_days/routine_exercises.
// Desactiva la rutina activa previa.
// -------------------------------------------------------------------------
export async function savePlan(plan: RoutinePlan): Promise<Result<{ routineId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Hace falta iniciar sesión." };

  const { data, error } = await supabase.rpc("save_routine", {
    payload: {
      nombre: plan.nombre,
      dias_por_semana: plan.dias_por_semana,
      semanas: plan.semanas,
      split: plan.split,
      nivel: plan.nivel,
      objetivo: plan.objetivo,
      dias: plan.dias.map((d) => ({
        semana: d.semana,
        orden: d.orden,
        nombre: d.nombre,
        ejercicios: d.ejercicios.map((e) => ({
          exercise_id: e.exercise_id,
          orden: e.orden,
          series: e.series,
          reps_min: e.reps_min ?? "",
          reps_max: e.reps_max ?? "",
          duracion_seg: e.duracion_seg ?? "",
          descanso_seg: e.descanso_seg,
        })),
      })),
    },
  });

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No pude guardar la rutina." };
  }

  revalidatePath("/rutina");
  revalidatePath("/hoy");
  return { ok: true, data: { routineId: data as string } };
}

// -------------------------------------------------------------------------
// Alternativas para el sheet de "Cambiar ejercicio".
// -------------------------------------------------------------------------
export async function listSwapAlternatives(
  muscleGroupSlug: string,
  patron: string,
  excludeExerciseId: string,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises")
    .select(
      `id, nombre, slug, muscle_group_id, secondary_muscles, equipment_id,
       patron, tipo, tipo_registro, nivel_minimo, instrucciones, errores_comunes,
       media_url, media_frames, youtube_query, youtube_video_id,
       muscle_group:muscle_groups!inner(id,nombre,slug),
       equipment:equipment!inner(id,nombre,slug)`,
    )
    .eq("muscle_group.slug", muscleGroupSlug)
    .eq("patron", patron)
    .neq("id", excludeExerciseId)
    .order("nombre");
  return (data ?? []) as unknown as import("@/modules/exercises/types").ExerciseWithRelations[];
}

// -------------------------------------------------------------------------
// Edición: cambiar ejercicio por otro (mismo patrón y grupo muscular).
// -------------------------------------------------------------------------
export async function swapExercise(
  routineExerciseId: string,
  newExerciseId: string,
): Promise<Result> {
  const supabase = await createClient();

  // Validar que el nuevo ejercicio comparta patrón y grupo con el actual.
  const { data: current } = await supabase
    .from("routine_exercises")
    .select("id, exercise_id, exercise:exercises!inner(patron, muscle_group_id, tipo, tipo_registro)")
    .eq("id", routineExerciseId)
    .maybeSingle();
  if (!current) return { ok: false, error: "No encontré el ejercicio." };

  const { data: nuevo } = await supabase
    .from("exercises")
    .select("id, patron, muscle_group_id, tipo_registro")
    .eq("id", newExerciseId)
    .maybeSingle();
  if (!nuevo) return { ok: false, error: "Ejercicio nuevo inexistente." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const curEx = (current as any).exercise;
  if (
    curEx.patron !== nuevo.patron ||
    curEx.muscle_group_id !== nuevo.muscle_group_id
  ) {
    return {
      ok: false,
      error: "El reemplazo tiene que ser del mismo patrón y grupo muscular.",
    };
  }

  // Si cambia el tipo_registro, resetear los campos específicos.
  const patch: Record<string, unknown> = { exercise_id: newExerciseId };
  if (curEx.tipo_registro !== nuevo.tipo_registro) {
    patch.duracion_seg = null;
    patch.reps_min = null;
    patch.reps_max = null;
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
// Reordenar: subir/bajar un ejercicio en su día.
// -------------------------------------------------------------------------
export async function reorderExercise(
  routineExerciseId: string,
  direction: "up" | "down",
): Promise<Result> {
  const supabase = await createClient();
  const { data: ex } = await supabase
    .from("routine_exercises")
    .select("id, routine_day_id, orden")
    .eq("id", routineExerciseId)
    .maybeSingle();
  if (!ex) return { ok: false, error: "No encontré el ejercicio." };

  const { data: siblings } = await supabase
    .from("routine_exercises")
    .select("id, orden")
    .eq("routine_day_id", ex.routine_day_id)
    .order("orden");
  if (!siblings) return { ok: false, error: "No pude leer el día." };

  const idx = siblings.findIndex((s) => s.id === ex.id);
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= siblings.length)
    return { ok: true, data: undefined };

  const other = siblings[targetIdx];

  // Evitar violar el UNIQUE(day, orden) parqueando uno en un orden grande.
  const PARK = 9000;
  await supabase
    .from("routine_exercises")
    .update({ orden: PARK })
    .eq("id", ex.id);
  await supabase
    .from("routine_exercises")
    .update({ orden: ex.orden })
    .eq("id", other.id);
  await supabase
    .from("routine_exercises")
    .update({ orden: other.orden })
    .eq("id", ex.id);

  revalidatePath("/rutina");
  return { ok: true, data: undefined };
}

// -------------------------------------------------------------------------
// Eliminar
// -------------------------------------------------------------------------
export async function removeExercise(routineExerciseId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("routine_exercises")
    .delete()
    .eq("id", routineExerciseId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/rutina");
  return { ok: true, data: undefined };
}

// -------------------------------------------------------------------------
// Agregar desde catálogo
// -------------------------------------------------------------------------
export async function addExerciseToDay(
  routineDayId: string,
  exerciseId: string,
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Hace falta iniciar sesión." };

  // Leer el objetivo/nivel de la rutina para prescripción
  const { data: ex } = await supabase
    .from("exercises")
    .select("tipo, tipo_registro")
    .eq("id", exerciseId)
    .maybeSingle();
  if (!ex) return { ok: false, error: "Ejercicio inexistente." };

  const { data: dayAndRoutine } = await supabase
    .from("routine_days")
    .select("id, routine:routines!inner(objetivo, nivel)")
    .eq("id", routineDayId)
    .maybeSingle();
  if (!dayAndRoutine) return { ok: false, error: "Día inexistente." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (dayAndRoutine as any).routine;
  const presc = prescripcion(r.objetivo, ex.tipo, ex.tipo_registro, r.nivel);

  // Último orden
  const { data: last } = await supabase
    .from("routine_exercises")
    .select("orden")
    .eq("routine_day_id", routineDayId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const orden = (last?.orden ?? 0) + 1;

  const { error } = await supabase.from("routine_exercises").insert({
    routine_day_id: routineDayId,
    exercise_id: exerciseId,
    orden,
    series: presc.series,
    reps_min: presc.reps_min ?? null,
    reps_max: presc.reps_max ?? null,
    duracion_seg: presc.duracion_seg ?? null,
    descanso_seg: presc.descanso_seg,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/rutina");
  return { ok: true, data: undefined };
}

// -------------------------------------------------------------------------
// Regenerar la rutina activa (con confirmación del lado UI).
// -------------------------------------------------------------------------
export async function regenerateActive(
  config: GeneratorConfig,
  seed?: number,
): Promise<Result<{ routineId: string }>> {
  const preview = await previewPlan(config, seed);
  if (!preview.ok) return preview;
  return savePlan(preview.data);
}

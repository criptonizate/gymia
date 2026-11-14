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
import {
  adjustPlanVolume,
  type VolumeMap,
} from "@/modules/routines/generator/volume";

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

export async function adjustVolume(
  plan: RoutinePlan,
  target: VolumeMap,
  seed?: number,
  entorno: "casa" | "gimnasio" = "gimnasio",
): Promise<Result<RoutinePlan>> {
  const catalog = await listExercises();
  const adjusted = adjustPlanVolume(
    plan,
    target,
    catalog,
    seed ?? Math.floor(Math.random() * 2 ** 31),
    entorno,
  );
  return { ok: true, data: adjusted };
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
          superset_group: e.superset_group ?? "",
          rir_objetivo: e.rir_objetivo ?? "",
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
// Reordenar: aplica un orden nuevo para todas las filas de un día.
// Hace dos pasadas (park → asignar) para no violar UNIQUE(day, orden).
// -------------------------------------------------------------------------
export async function reorderDay(
  routineDayId: string,
  orderedIds: string[],
): Promise<Result> {
  const supabase = await createClient();
  const PARK = 9000;
  // Parquear todos en órdenes altos únicos para evitar colisión
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("routine_exercises")
      .update({ orden: PARK + i })
      .eq("id", orderedIds[i])
      .eq("routine_day_id", routineDayId);
  }
  // Asignar el nuevo orden 1..n
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("routine_exercises")
      .update({ orden: i + 1 })
      .eq("id", orderedIds[i])
      .eq("routine_day_id", routineDayId);
  }
  revalidatePath("/rutina");
  return { ok: true, data: undefined };
}

// -------------------------------------------------------------------------
// Supersets: agrupar/desagrupar ejercicios consecutivos.
// -------------------------------------------------------------------------
export async function setSupersetGroup(
  routineExerciseIds: string[],
  groupId: number | null,
): Promise<Result> {
  if (routineExerciseIds.length === 0) return { ok: true, data: undefined };
  const supabase = await createClient();
  const { error } = await supabase
    .from("routine_exercises")
    .update({ superset_group: groupId })
    .in("id", routineExerciseIds);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/rutina");
  return { ok: true, data: undefined };
}

/** Pide al servidor un nuevo superset_group único para la rutina activa. */
export async function nextSupersetGroup(): Promise<Result<number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("next_superset_group");
  if (error || data == null) {
    return { ok: false, error: error?.message ?? "No pude generar un id." };
  }
  return { ok: true, data: Number(data) };
}

/** Limpia superset_group de ejercicios que quedaron solos en su grupo. */
export async function cleanupOrphanSupersets(
  routineDayId: string,
): Promise<Result> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("routine_exercises")
    .select("id, superset_group")
    .eq("routine_day_id", routineDayId)
    .not("superset_group", "is", null);
  if (!data) return { ok: true, data: undefined };
  const counts = new Map<number, string[]>();
  for (const r of data as { id: string; superset_group: number }[]) {
    const arr = counts.get(r.superset_group) ?? [];
    arr.push(r.id);
    counts.set(r.superset_group, arr);
  }
  const orphans: string[] = [];
  for (const [, ids] of counts) if (ids.length < 2) orphans.push(...ids);
  if (orphans.length > 0) {
    await supabase
      .from("routine_exercises")
      .update({ superset_group: null })
      .in("id", orphans);
  }
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
    .select("tipo, tipo_registro, muscle_group:muscle_groups!inner(slug)")
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mgSlug = (ex as any).muscle_group?.slug as string | undefined;
  const presc = prescripcion(r.objetivo, ex.tipo, ex.tipo_registro, r.nivel, mgSlug);

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

// -------------------------------------------------------------------------
// Deload: genera 1 semana con series y peso objetivo reducidos ~40%.
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// Export: devuelve el plan de la rutina activa como JSON serializable.
// -------------------------------------------------------------------------
export async function exportActiveRoutine(): Promise<Result<RoutinePlan>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Hace falta iniciar sesión." };

  const { data: routine } = await supabase
    .from("routines")
    .select("*")
    .eq("owner_id", user.id)
    .eq("activa", true)
    .maybeSingle();
  if (!routine) return { ok: false, error: "No hay rutina activa." };

  const { data: days } = await supabase
    .from("routine_days")
    .select("id, semana, orden, nombre")
    .eq("routine_id", routine.id)
    .order("semana")
    .order("orden");

  const dayIds = (days ?? []).map((d) => d.id);
  const { data: exs } = await supabase
    .from("routine_exercises")
    .select(
      `routine_day_id, exercise_id, orden, series, reps_min, reps_max, duracion_seg, descanso_seg, superset_group,
       exercise:exercises!inner(slug, nombre, patron, tipo, tipo_registro,
         muscle_group:muscle_groups!inner(slug),
         equipment:equipment!inner(slug))`,
    )
    .in("routine_day_id", dayIds)
    .order("orden");

  type ExRow = {
    routine_day_id: string;
    exercise_id: string;
    orden: number;
    series: number;
    reps_min: number | null;
    reps_max: number | null;
    duracion_seg: number | null;
    descanso_seg: number;
    superset_group: number | null;
    exercise: {
      slug: string;
      nombre: string;
      patron: string;
      tipo: "compuesto" | "aislamiento";
      tipo_registro: "peso_reps" | "reps" | "tiempo";
      muscle_group: { slug: string };
      equipment: { slug: string };
    };
  };

  const byDay = new Map<string, ExRow[]>();
  for (const e of (exs ?? []) as unknown as ExRow[]) {
    const arr = byDay.get(e.routine_day_id) ?? [];
    arr.push(e);
    byDay.set(e.routine_day_id, arr);
  }

  const plan: RoutinePlan = {
    nombre: routine.nombre,
    split: routine.split,
    dias_por_semana: routine.dias_por_semana,
    semanas: routine.semanas,
    nivel: routine.nivel,
    objetivo: routine.objetivo,
    dias: (days ?? []).map((d) => ({
      semana: d.semana,
      orden: d.orden,
      nombre: d.nombre,
      split_label: d.nombre,
      ejercicios: (byDay.get(d.id) ?? []).map((e) => ({
        orden: e.orden,
        exercise_id: e.exercise_id,
        exercise_slug: e.exercise.slug,
        nombre: e.exercise.nombre,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        patron: e.exercise.patron as any,
        tipo: e.exercise.tipo,
        tipo_registro: e.exercise.tipo_registro,
        muscle_group_slug: e.exercise.muscle_group.slug,
        equipment_slug: e.exercise.equipment.slug,
        series: e.series,
        reps_min: e.reps_min ?? undefined,
        reps_max: e.reps_max ?? undefined,
        duracion_seg: e.duracion_seg ?? undefined,
        descanso_seg: e.descanso_seg,
        superset_group: e.superset_group,
      })),
    })),
  };

  return { ok: true, data: plan };
}

// -------------------------------------------------------------------------
// Import: mapea los slugs del JSON a exercise_id actuales y guarda.
// -------------------------------------------------------------------------
export async function importRoutineFromPlan(
  rawPlan: unknown,
): Promise<Result<{ routineId: string }>> {
  const parsed = (
    await import("@/lib/validation")
  ).RoutinePlanSchema.safeParse(rawPlan);
  if (!parsed.success) {
    return {
      ok: false,
      error: "JSON inválido: " + (parsed.error.issues[0]?.message ?? ""),
    };
  }
  const plan = parsed.data as unknown as RoutinePlan;

  const supabase = await createClient();
  // Resolver IDs por slug
  const slugs = Array.from(
    new Set(plan.dias.flatMap((d) => d.ejercicios.map((e) => e.exercise_slug))),
  );
  const { data: exs } = await supabase
    .from("exercises")
    .select("id, slug")
    .in("slug", slugs);
  const idBySlug = new Map((exs ?? []).map((e) => [e.slug, e.id]));

  for (const d of plan.dias) {
    for (const e of d.ejercicios) {
      const id = idBySlug.get(e.exercise_slug);
      if (!id) {
        return {
          ok: false,
          error: `Ejercicio no encontrado en el catálogo: ${e.exercise_slug}`,
        };
      }
      e.exercise_id = id;
    }
  }

  return savePlan(plan);
}

export async function generateDeload(
  base: GeneratorConfig,
): Promise<Result<{ routineId: string }>> {
  const preview = await previewPlan({ ...base, semanas: 1 });
  if (!preview.ok) return preview;
  const plan = preview.data;
  plan.nombre = `Deload · ${base.diasPorSemana}d/sem · ${base.nivel}`;
  plan.split = `Descarga · ${plan.split}`;
  for (const d of plan.dias) {
    for (const e of d.ejercicios) {
      e.series = Math.max(1, Math.ceil(e.series * 0.6));
      if (e.duracion_seg != null) {
        e.duracion_seg = Math.max(10, Math.round(e.duracion_seg * 0.6));
      }
    }
  }
  return savePlan(plan);
}

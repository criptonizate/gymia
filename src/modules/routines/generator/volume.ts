// =========================================================================
// Volumen por grupo muscular: recomendación + post-proceso del plan.
// =========================================================================

import type {
  ExerciseWithRelations,
  Nivel,
} from "@/modules/exercises/types";
import {
  CASA_EQUIPMENT,
  type Entorno,
  type GeneratorConfig,
  type Objetivo,
  type PlannedDay,
  type PlannedExercise,
  type RoutinePlan,
} from "./types";
import { prescripcion } from "./prescription";
import { makeRng, shuffle } from "./rng";

export const MUSCLE_SLUGS = [
  "pecho",
  "espalda",
  "hombros",
  "biceps",
  "triceps",
  "cuadriceps",
  "isquios",
  "gluteos",
  "gemelos",
  "core",
] as const;
export type MuscleSlug = (typeof MUSCLE_SLUGS)[number];
export type VolumeMap = Record<MuscleSlug, number>;

// --------------------------- Etiquetas UI -------------------------------
export const MUSCLE_LABELS: Record<MuscleSlug, string> = {
  pecho: "Pecho",
  espalda: "Espalda",
  hombros: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  cuadriceps: "Cuádriceps",
  isquios: "Isquios",
  gluteos: "Glúteos",
  gemelos: "Gemelos",
  core: "Core (por día)",
};

// --------------------------- Recomendación ------------------------------

const BASE: Record<Objetivo, VolumeMap> = {
  hipertrofia: {
    pecho: 4, espalda: 4, hombros: 3, biceps: 2, triceps: 2,
    cuadriceps: 3, isquios: 2, gluteos: 2, gemelos: 2, core: 1,
  },
  fuerza: {
    pecho: 3, espalda: 3, hombros: 2, biceps: 1, triceps: 1,
    cuadriceps: 3, isquios: 2, gluteos: 2, gemelos: 1, core: 1,
  },
  general: {
    pecho: 3, espalda: 3, hombros: 2, biceps: 2, triceps: 2,
    cuadriceps: 2, isquios: 2, gluteos: 2, gemelos: 1, core: 1,
  },
  perdida_grasa: {
    pecho: 3, espalda: 3, hombros: 2, biceps: 1, triceps: 1,
    cuadriceps: 3, isquios: 2, gluteos: 2, gemelos: 1, core: 2,
  },
  rendimiento_deportivo: {
    pecho: 2, espalda: 3, hombros: 2, biceps: 1, triceps: 1,
    cuadriceps: 3, isquios: 3, gluteos: 3, gemelos: 1, core: 2,
  },
};
const NIVEL_MULT: Record<Nivel, number> = {
  principiante: 0.85, // antes 0.75 → dejaba grupos grandes bajo MEV
  intermedio: 1,
  avanzado: 1.25,
};

export function recommendVolume(cfg: GeneratorConfig): VolumeMap {
  const base = BASE[cfg.objetivo];
  const mult = NIVEL_MULT[cfg.nivel];
  const out = {} as VolumeMap;
  for (const k of MUSCLE_SLUGS) {
    if (k === "core") {
      out.core = 1; // por día
    } else {
      out[k] = Math.max(1, Math.round(base[k] * mult));
    }
  }
  return out;
}

// --------------------------- Cálculo del plan actual --------------------

/**
 * Para grupos no-core devuelve ejercicios únicos por semana (promediados
 * entre semanas). Para core devuelve el promedio por día.
 */
export function computeVolume(plan: RoutinePlan): VolumeMap {
  const perSemana = new Map<number, Map<MuscleSlug, number>>();
  const diasTotales = plan.dias.length;
  let coreTotal = 0;

  for (const d of plan.dias) {
    const map = perSemana.get(d.semana) ?? new Map();
    for (const e of d.ejercicios) {
      const m = e.muscle_group_slug as MuscleSlug;
      if (!MUSCLE_SLUGS.includes(m)) continue;
      if (m === "core") {
        coreTotal += 1;
      } else {
        map.set(m, (map.get(m) ?? 0) + 1);
      }
    }
    perSemana.set(d.semana, map);
  }

  const semanasCount = perSemana.size || 1;
  const sum = {} as VolumeMap;
  for (const k of MUSCLE_SLUGS) sum[k] = 0;

  for (const [, m] of perSemana) {
    for (const [g, n] of m) sum[g] += n;
  }

  const out = {} as VolumeMap;
  for (const k of MUSCLE_SLUGS) {
    if (k === "core") {
      out.core = diasTotales > 0 ? Math.round(coreTotal / diasTotales) : 0;
    } else {
      out[k] = Math.round(sum[k] / semanasCount);
    }
  }
  return out;
}

// --------------------------- Post-proceso -------------------------------

/**
 * Ajusta un plan ya generado para que cada grupo muscular cumpla el target.
 * Sólo agrega/quita AISLAMIENTO (los compuestos se preservan para que la
 * progresión siga siendo medible). El core se ajusta por día.
 * Retorna un nuevo plan (no muta el original).
 */
export function adjustPlanVolume(
  plan: RoutinePlan,
  target: VolumeMap,
  catalog: ExerciseWithRelations[],
  seed = 42,
  entorno: Entorno = "gimnasio",
): RoutinePlan {
  const rng = makeRng(seed);
  const usable =
    entorno === "casa"
      ? catalog.filter((e) => CASA_EQUIPMENT.includes(e.equipment.slug))
      : catalog;

  // Copia profunda liviana
  const next: RoutinePlan = {
    ...plan,
    dias: plan.dias.map((d) => ({ ...d, ejercicios: d.ejercicios.map((e) => ({ ...e })) })),
  };

  // Semanas presentes
  const semanas = Array.from(new Set(next.dias.map((d) => d.semana))).sort();
  for (const sem of semanas) {
    const dias = next.dias.filter((d) => d.semana === sem);
    adjustWeek(dias, target, usable, plan.nivel, plan.objetivo, rng);
  }
  // Reordenar y renumerar
  for (const d of next.dias) orderDay(d);
  return next;
}

function adjustWeek(
  dias: PlannedDay[],
  target: VolumeMap,
  catalog: ExerciseWithRelations[],
  nivel: Nivel,
  objetivo: Objetivo,
  rng: () => number,
) {
  // Muscle groups ≠ core
  for (const muscle of MUSCLE_SLUGS) {
    if (muscle === "core") continue;
    let current = countInWeek(dias, muscle);
    const want = target[muscle] ?? 0;
    // Agregar
    while (current < want) {
      const day = pickDayForMuscle(dias, muscle);
      if (!day) break;
      const used = new Set(day.ejercicios.map((e) => e.exercise_id));
      const usedInWeek = new Set(
        dias.flatMap((d) => d.ejercicios.map((e) => e.exercise_id)),
      );
      const chosen = pickAccessory(catalog, muscle, nivel, used, usedInWeek, rng);
      if (!chosen) break;
      day.ejercicios.push(toPlanned(chosen, objetivo, nivel, day.ejercicios.length + 1));
      current++;
    }
    // Remover
    while (current > want) {
      const removed = removeLastAccessory(dias, muscle);
      if (!removed) break;
      current--;
    }
  }

  // Core: target por día
  const coreTarget = Math.max(0, target.core ?? 1);
  for (const d of dias) {
    let coreCount = d.ejercicios.filter((e) => e.muscle_group_slug === "core").length;
    while (coreCount < coreTarget) {
      const used = new Set(d.ejercicios.map((e) => e.exercise_id));
      const chosen = pickCore(catalog, nivel, used, rng);
      if (!chosen) break;
      d.ejercicios.push(toPlanned(chosen, objetivo, nivel, d.ejercicios.length + 1));
      coreCount++;
    }
    while (coreCount > coreTarget) {
      // sacar el último core
      for (let i = d.ejercicios.length - 1; i >= 0; i--) {
        if (d.ejercicios[i].muscle_group_slug === "core") {
          d.ejercicios.splice(i, 1);
          coreCount--;
          break;
        }
      }
    }
  }
}

function countInWeek(dias: PlannedDay[], muscle: MuscleSlug): number {
  let n = 0;
  for (const d of dias) {
    for (const e of d.ejercicios) {
      if (e.muscle_group_slug === muscle) n++;
    }
  }
  return n;
}

function pickDayForMuscle(
  dias: PlannedDay[],
  muscle: MuscleSlug,
): PlannedDay | null {
  // Preferir días que ya tienen ese grupo y están bajo el techo de 8
  const withMuscle = dias
    .filter(
      (d) =>
        d.ejercicios.length < 8 &&
        d.ejercicios.some((e) => e.muscle_group_slug === muscle),
    )
    .sort((a, b) => a.ejercicios.length - b.ejercicios.length);
  if (withMuscle[0]) return withMuscle[0];
  // Fallback: cualquiera con lugar
  const any = dias
    .filter((d) => d.ejercicios.length < 8)
    .sort((a, b) => a.ejercicios.length - b.ejercicios.length);
  return any[0] ?? null;
}

function pickAccessory(
  catalog: ExerciseWithRelations[],
  muscle: MuscleSlug,
  nivel: Nivel,
  usedInDay: Set<string>,
  usedInWeek: Set<string>,
  rng: () => number,
): ExerciseWithRelations | null {
  const ordered: Nivel[] = ["principiante", "intermedio", "avanzado"];
  const nivelFloor = ordered.indexOf(nivel);
  const base = catalog.filter(
    (e) =>
      e.muscle_group.slug === muscle &&
      e.tipo === "aislamiento" &&
      ordered.indexOf(e.nivel_minimo) <= nivelFloor &&
      !usedInDay.has(e.id),
  );
  const notInWeek = base.filter((e) => !usedInWeek.has(e.id));
  const pool = notInWeek.length ? notInWeek : base;
  const cable = pool.filter((e) => e.equipment.slug === "polea");
  const list = cable.length ? cable : pool;
  return shuffle(list, rng)[0] ?? null;
}

function pickCore(
  catalog: ExerciseWithRelations[],
  nivel: Nivel,
  usedInDay: Set<string>,
  rng: () => number,
): ExerciseWithRelations | null {
  const ordered: Nivel[] = ["principiante", "intermedio", "avanzado"];
  const nivelFloor = ordered.indexOf(nivel);
  const list = catalog.filter(
    (e) =>
      e.muscle_group.slug === "core" &&
      ordered.indexOf(e.nivel_minimo) <= nivelFloor &&
      !usedInDay.has(e.id),
  );
  return shuffle(list, rng)[0] ?? null;
}

function removeLastAccessory(
  dias: PlannedDay[],
  muscle: MuscleSlug,
): PlannedExercise | null {
  for (let i = dias.length - 1; i >= 0; i--) {
    const d = dias[i];
    for (let j = d.ejercicios.length - 1; j >= 0; j--) {
      const ex = d.ejercicios[j];
      if (ex.muscle_group_slug === muscle && ex.tipo === "aislamiento") {
        d.ejercicios.splice(j, 1);
        return ex;
      }
    }
  }
  return null;
}

function orderDay(d: PlannedDay) {
  const comp = d.ejercicios.filter(
    (e) => e.tipo === "compuesto" && e.muscle_group_slug !== "core",
  );
  const ais = d.ejercicios.filter(
    (e) => e.tipo === "aislamiento" && e.muscle_group_slug !== "core",
  );
  const core = d.ejercicios.filter((e) => e.muscle_group_slug === "core");
  d.ejercicios = [...comp, ...ais, ...core];
  d.ejercicios.forEach((e, i) => (e.orden = i + 1));
}

function toPlanned(
  ex: ExerciseWithRelations,
  objetivo: Objetivo,
  nivel: Nivel,
  orden: number,
): PlannedExercise {
  const p = prescripcion(objetivo, ex.tipo, ex.tipo_registro, nivel, ex.muscle_group.slug);
  return {
    orden,
    exercise_id: ex.id,
    exercise_slug: ex.slug,
    nombre: ex.nombre,
    patron: ex.patron,
    tipo: ex.tipo,
    tipo_registro: ex.tipo_registro,
    muscle_group_slug: ex.muscle_group.slug,
    equipment_slug: ex.equipment.slug,
    series: p.series,
    reps_min: p.reps_min,
    reps_max: p.reps_max,
    duracion_seg: p.duracion_seg,
    descanso_seg: p.descanso_seg,
  };
}

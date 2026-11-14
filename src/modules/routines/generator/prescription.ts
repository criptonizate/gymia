// Series, reps y descanso según objetivo + tipo + nivel (SPEC §6).

import type { Nivel, Objetivo } from "./types";

export type Prescripcion = {
  series: number;
  reps_min?: number;
  reps_max?: number;
  duracion_seg?: number;
  descanso_seg: number;
};

export function prescripcion(
  objetivo: Objetivo,
  tipo: "compuesto" | "aislamiento",
  tipoRegistro: "peso_reps" | "reps" | "tiempo",
  nivel: Nivel,
  muscleGroupSlug?: string,
): Prescripcion {
  if (tipoRegistro === "tiempo") {
    const dur = nivel === "principiante" ? 30 : nivel === "intermedio" ? 40 : 60;
    return { series: 3, duracion_seg: dur, descanso_seg: 45 };
  }
  // Core por reps/peso_reps NO es un ejercicio pesado: no apliques 3x10-15
  // con descanso de 60s, pierde el punto neuromotor.
  if (muscleGroupSlug === "core") {
    return { series: 3, reps_min: 8, reps_max: 12, descanso_seg: 45 };
  }

  if (objetivo === "hipertrofia") {
    return tipo === "compuesto"
      ? { series: 4, reps_min: 8, reps_max: 12, descanso_seg: 90 }
      : { series: 3, reps_min: 10, reps_max: 12, descanso_seg: 90 };
  }
  if (objetivo === "fuerza") {
    return tipo === "compuesto"
      ? { series: 5, reps_min: 4, reps_max: 6, descanso_seg: 180 }
      : { series: 3, reps_min: 8, reps_max: 10, descanso_seg: 120 };
  }
  // General: compuestos con 90s, aislamiento 60s (antes todo 60s era poco
  // para una sentadilla de 15 reps).
  return tipo === "compuesto"
    ? { series: 3, reps_min: 10, reps_max: 15, descanso_seg: 90 }
    : { series: 3, reps_min: 10, reps_max: 15, descanso_seg: 60 };
}

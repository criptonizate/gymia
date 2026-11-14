// Series, reps y descanso siguiendo ACSM + recomendaciones de hipertrofia
// (Schoenfeld, Nippard). Ajustado a Tanda A del método (sin fallo, RIR 1-3).

import type { Nivel, Objetivo } from "./types";

export type Prescripcion = {
  series: number;
  reps_min?: number;
  reps_max?: number;
  duracion_seg?: number;
  descanso_seg: number;
  rir_objetivo?: number;
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
    return { series: 3, duracion_seg: dur, descanso_seg: 45, rir_objetivo: 1 };
  }
  // Core por reps/peso_reps NO es un ejercicio pesado.
  if (muscleGroupSlug === "core") {
    return {
      series: 3,
      reps_min: 8,
      reps_max: 15,
      descanso_seg: 45,
      rir_objetivo: 1,
    };
  }

  // ACSM: hipertrofia compuesto 2-3 min, aislamiento 1-2 min.
  if (objetivo === "hipertrofia") {
    return tipo === "compuesto"
      ? {
          series: 3,
          reps_min: 6,
          reps_max: 12,
          descanso_seg: 150,
          rir_objetivo: 2,
        }
      : {
          series: 3,
          reps_min: 10,
          reps_max: 15,
          descanso_seg: 90,
          rir_objetivo: 1,
        };
  }
  if (objetivo === "fuerza") {
    return tipo === "compuesto"
      ? {
          series: 4,
          reps_min: 4,
          reps_max: 6,
          descanso_seg: 210,
          rir_objetivo: 2,
        }
      : {
          series: 3,
          reps_min: 6,
          reps_max: 10,
          descanso_seg: 120,
          rir_objetivo: 2,
        };
  }
  // Pérdida de grasa: reps altas, descansos cortos.
  if (objetivo === "perdida_grasa") {
    return tipo === "compuesto"
      ? {
          series: 3,
          reps_min: 10,
          reps_max: 15,
          descanso_seg: 60,
          rir_objetivo: 1,
        }
      : {
          series: 3,
          reps_min: 12,
          reps_max: 20,
          descanso_seg: 45,
          rir_objetivo: 1,
        };
  }
  if (objetivo === "rendimiento_deportivo") {
    return tipo === "compuesto"
      ? {
          series: 4,
          reps_min: 3,
          reps_max: 6,
          descanso_seg: 180,
          rir_objetivo: 2,
        }
      : {
          series: 3,
          reps_min: 8,
          reps_max: 12,
          descanso_seg: 75,
          rir_objetivo: 2,
        };
  }
  // General / acondicionamiento.
  return tipo === "compuesto"
    ? {
        series: 3,
        reps_min: 8,
        reps_max: 15,
        descanso_seg: 120,
        rir_objetivo: 2,
      }
    : {
        series: 3,
        reps_min: 10,
        reps_max: 15,
        descanso_seg: 75,
        rir_objetivo: 1,
      };
}

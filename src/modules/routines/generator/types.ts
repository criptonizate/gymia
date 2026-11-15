import type {
  Exercise,
  ExerciseWithRelations,
  Nivel,
  Patron,
  TipoRegistro,
} from "@/modules/exercises/types";

export type Objetivo =
  | "hipertrofia"
  | "fuerza"
  | "general"
  | "perdida_grasa"
  | "rendimiento_deportivo";
export type DiasSemana = 2 | 3 | 4 | 5 | 6;
export type Semanas = 1 | 2 | 3 | 4;
export type Entorno = "casa_sin_equipo" | "casa" | "gimnasio";

export type GeneratorConfig = {
  diasPorSemana: DiasSemana;
  semanas: Semanas;
  nivel: Nivel;
  objetivo: Objetivo;
  entorno?: Entorno;
};

/** Equipos permitidos en "casa" (con mancuernas/banco improvisables). */
export const CASA_EQUIPMENT: readonly string[] = [
  "peso-corporal",
  "mancuernas",
  "banco",
  "barra-z",
];

/** Equipos permitidos en "casa_sin_equipo" (sólo cuerpo, nada más). */
export const CASA_SIN_EQUIPO: readonly string[] = ["peso-corporal"];

export function equipmentForEntorno(
  entorno: Entorno | undefined,
): readonly string[] | null {
  if (entorno === "casa_sin_equipo") return CASA_SIN_EQUIPO;
  if (entorno === "casa") return CASA_EQUIPMENT;
  return null; // null = sin filtro
}

/** Añadir entorno al plan para persistirlo. */
export type RoutinePlanWithEntorno = import("./types").RoutinePlan & {
  entorno?: Entorno;
};

export type PlannedExercise = {
  orden: number;
  exercise_id: string;
  exercise_slug: string;
  nombre: string;
  patron: Patron;
  tipo: "compuesto" | "aislamiento";
  tipo_registro: TipoRegistro;
  muscle_group_slug: string;
  equipment_slug: string;
  series: number;
  reps_min?: number;
  reps_max?: number;
  duracion_seg?: number;
  descanso_seg: number;
  superset_group?: number | null;
  rir_objetivo?: number | null;
};

export type PlannedDay = {
  semana: number;
  orden: number;
  nombre: string;
  split_label: string;
  ejercicios: PlannedExercise[];
};

export type RoutinePlan = {
  nombre: string;
  split: string;
  dias_por_semana: number;
  semanas: number;
  nivel: Nivel;
  objetivo: Objetivo;
  entorno?: Entorno;
  dias: PlannedDay[];
};

export interface RoutineGenerator {
  generate(
    config: GeneratorConfig,
    catalog: ExerciseWithRelations[],
    seed?: number,
  ): RoutinePlan;
}

export type { Exercise, ExerciseWithRelations, Nivel, Patron, TipoRegistro };

import type {
  Exercise,
  ExerciseWithRelations,
  Nivel,
  Patron,
  TipoRegistro,
} from "@/modules/exercises/types";

export type Objetivo = "hipertrofia" | "fuerza" | "general";
export type DiasSemana = 2 | 3 | 4 | 5;
export type Semanas = 1 | 2 | 3 | 4;
export type Entorno = "casa" | "gimnasio";

export type GeneratorConfig = {
  diasPorSemana: DiasSemana;
  semanas: Semanas;
  nivel: Nivel;
  objetivo: Objetivo;
  entorno?: Entorno;
};

/** Equipos permitidos en el entorno "casa". */
export const CASA_EQUIPMENT: readonly string[] = [
  "peso-corporal",
  "mancuernas",
  "banco",
  "barra-z",
];

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

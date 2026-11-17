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
  /**
   * En gimnasio: equipos preferidos (boost de scoring, no filtro duro).
   * En casa: equipos adicionales disponibles (banda, kettlebell, barra de
   *   dominadas). Expanden el whitelist base de CASA_EQUIPMENT.
   */
  equipmentPreferences?: string[];
  /**
   * Casa sin equipo: evita ejercicios de salto/plyo (ruido, articulaciones,
   * depto abajo). Heurístico por slug/nombre.
   */
  avoidPlyo?: boolean;
};

/** Equipos permitidos en "casa" base. Se expande con equipmentPreferences. */
export const CASA_EQUIPMENT: readonly string[] = [
  "peso-corporal",
  "mancuernas",
  "banco",
  "barra-z",
];

/** Equipos opcionales que el user puede tener en casa. */
export const CASA_EXTRAS: readonly string[] = [
  "banda",
  "kettlebell",
  "barra-dominadas",
];

/** Equipos permitidos en "casa_sin_equipo" (sólo cuerpo, nada más). */
export const CASA_SIN_EQUIPO: readonly string[] = ["peso-corporal"];

/** Equipos de gimnasio que el user puede marcar como preferencia. */
export const GYM_EQUIPMENT_CHOICES: readonly {
  slug: string;
  label: string;
}[] = [
  { slug: "mancuernas", label: "Mancuernas" },
  { slug: "barra", label: "Barra olímpica" },
  { slug: "polea", label: "Polea" },
  { slug: "maquina", label: "Máquinas" },
  { slug: "smith", label: "Smith" },
  { slug: "barra-z", label: "Barra Z" },
  { slug: "kettlebell", label: "Kettlebell" },
  { slug: "banda", label: "Banda" },
];

export function equipmentForEntorno(
  entorno: Entorno | undefined,
  extras?: readonly string[],
): readonly string[] | null {
  if (entorno === "casa_sin_equipo") return CASA_SIN_EQUIPO;
  if (entorno === "casa") {
    if (!extras || extras.length === 0) return CASA_EQUIPMENT;
    return [...CASA_EQUIPMENT, ...extras];
  }
  return null; // null = sin filtro
}

/** Heurístico para detectar ejercicios de salto/plyo por nombre o slug. */
export function esPlyo(nombre: string, slug: string): boolean {
  const hay = `${nombre} ${slug}`.toLowerCase();
  return /(salt|jump|plyo|burpee|pliom|rebote)/.test(hay);
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

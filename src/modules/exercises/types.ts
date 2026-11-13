export type Patron =
  | "empuje_horizontal" | "empuje_vertical"
  | "traccion_horizontal" | "traccion_vertical"
  | "sentadilla" | "bisagra" | "zancada" | "aislamiento"
  | "core_antiextension" | "core_flexion"
  | "core_antirotacion" | "core_lateral";

export type TipoRegistro = "peso_reps" | "reps" | "tiempo";
export type Nivel = "principiante" | "intermedio" | "avanzado";

export type MuscleGroup = {
  id: string;
  nombre: string;
  slug: string;
};

export type Equipment = {
  id: string;
  nombre: string;
  slug: string;
};

export type Exercise = {
  id: string;
  nombre: string;
  slug: string;
  muscle_group_id: string;
  secondary_muscles: string[];
  equipment_id: string;
  patron: Patron;
  tipo: "compuesto" | "aislamiento";
  tipo_registro: TipoRegistro;
  nivel_minimo: Nivel;
  instrucciones: string[];
  errores_comunes: string[];
  media_url: string | null;
  media_frames: string[];
  youtube_query: string | null;
  youtube_video_id: string | null;
};

export type ExerciseWithRelations = Exercise & {
  muscle_group: MuscleGroup;
  equipment: Equipment;
};

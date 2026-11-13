import type {
  Exercise,
  ExerciseWithRelations,
  Nivel,
  Patron,
  TipoRegistro,
} from "@/modules/exercises/types";

type Mini = {
  nombre: string;
  slug: string;
  mg: string;
  eq: string;
  patron: Patron;
  tipo: "compuesto" | "aislamiento";
  reg: TipoRegistro;
  nivel: Nivel;
};

const RAW: Mini[] = [
  // Pecho
  { nombre: "Press banca plano con barra", slug: "press-banca-plano-barra", mg: "pecho", eq: "barra", patron: "empuje_horizontal", tipo: "compuesto", reg: "peso_reps", nivel: "intermedio" },
  { nombre: "Press banca plano con mancuernas", slug: "press-banca-plano-mancuernas", mg: "pecho", eq: "mancuernas", patron: "empuje_horizontal", tipo: "compuesto", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Press banca inclinado con barra", slug: "press-banca-inclinado-barra", mg: "pecho", eq: "barra", patron: "empuje_horizontal", tipo: "compuesto", reg: "peso_reps", nivel: "intermedio" },
  { nombre: "Aperturas con mancuernas", slug: "aperturas-mancuernas", mg: "pecho", eq: "mancuernas", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Cruce de poleas alto", slug: "cruce-poleas-alto", mg: "pecho", eq: "polea", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Cruce de poleas bajo", slug: "cruce-poleas-bajo", mg: "pecho", eq: "polea", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "intermedio" },
  { nombre: "Pec deck", slug: "pec-deck", mg: "pecho", eq: "maquina", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },

  // Espalda
  { nombre: "Jalón al pecho agarre ancho", slug: "jalon-al-pecho-ancho", mg: "espalda", eq: "polea", patron: "traccion_vertical", tipo: "compuesto", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Jalón al pecho agarre neutro", slug: "jalon-al-pecho-neutro", mg: "espalda", eq: "polea", patron: "traccion_vertical", tipo: "compuesto", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Dominadas", slug: "dominadas", mg: "espalda", eq: "peso-corporal", patron: "traccion_vertical", tipo: "compuesto", reg: "reps", nivel: "avanzado" },
  { nombre: "Remo con barra", slug: "remo-con-barra", mg: "espalda", eq: "barra", patron: "traccion_horizontal", tipo: "compuesto", reg: "peso_reps", nivel: "intermedio" },
  { nombre: "Remo con mancuerna", slug: "remo-mancuerna", mg: "espalda", eq: "mancuernas", patron: "traccion_horizontal", tipo: "compuesto", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Remo en polea baja", slug: "remo-polea-baja", mg: "espalda", eq: "polea", patron: "traccion_horizontal", tipo: "compuesto", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Pullover en polea", slug: "pullover-polea", mg: "espalda", eq: "polea", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "intermedio" },
  { nombre: "Face pull", slug: "face-pull", mg: "espalda", eq: "polea", patron: "traccion_horizontal", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },

  // Hombros
  { nombre: "Press militar con barra", slug: "press-militar-barra", mg: "hombros", eq: "barra", patron: "empuje_vertical", tipo: "compuesto", reg: "peso_reps", nivel: "intermedio" },
  { nombre: "Press hombros con mancuernas", slug: "press-hombros-mancuernas", mg: "hombros", eq: "mancuernas", patron: "empuje_vertical", tipo: "compuesto", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Press hombros en máquina", slug: "press-hombros-maquina", mg: "hombros", eq: "maquina", patron: "empuje_vertical", tipo: "compuesto", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Elevaciones laterales mancuernas", slug: "elevaciones-laterales-mancuernas", mg: "hombros", eq: "mancuernas", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Elevaciones laterales polea", slug: "elevaciones-laterales-polea", mg: "hombros", eq: "polea", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "intermedio" },
  { nombre: "Vuelos posteriores mancuernas", slug: "vuelos-posteriores-mancuernas", mg: "hombros", eq: "mancuernas", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Pec deck invertido", slug: "pec-deck-invertido", mg: "hombros", eq: "maquina", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },

  // Bíceps
  { nombre: "Curl con barra", slug: "curl-barra", mg: "biceps", eq: "barra", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Curl alternado", slug: "curl-alternado", mg: "biceps", eq: "mancuernas", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Curl en polea", slug: "curl-polea", mg: "biceps", eq: "polea", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Curl martillo", slug: "curl-martillo", mg: "biceps", eq: "mancuernas", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },

  // Tríceps
  { nombre: "Extensión polea con soga", slug: "extension-polea-soga", mg: "triceps", eq: "polea", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Extensión polea con barra", slug: "extension-polea-barra", mg: "triceps", eq: "polea", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Press francés", slug: "press-frances", mg: "triceps", eq: "barra-z", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "intermedio" },

  // Cuádriceps
  { nombre: "Sentadilla con barra", slug: "sentadilla-barra", mg: "cuadriceps", eq: "barra", patron: "sentadilla", tipo: "compuesto", reg: "peso_reps", nivel: "intermedio" },
  { nombre: "Sentadilla goblet", slug: "sentadilla-goblet", mg: "cuadriceps", eq: "mancuernas", patron: "sentadilla", tipo: "compuesto", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Prensa 45°", slug: "prensa-45", mg: "cuadriceps", eq: "maquina", patron: "sentadilla", tipo: "compuesto", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Hack sentadilla", slug: "hack-sentadilla", mg: "cuadriceps", eq: "maquina", patron: "sentadilla", tipo: "compuesto", reg: "peso_reps", nivel: "intermedio" },
  { nombre: "Extensión de cuádriceps", slug: "extension-cuadriceps", mg: "cuadriceps", eq: "maquina", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },

  // Isquios
  { nombre: "Peso muerto rumano", slug: "peso-muerto-rumano", mg: "isquios", eq: "barra", patron: "bisagra", tipo: "compuesto", reg: "peso_reps", nivel: "intermedio" },
  { nombre: "Curl femoral acostado", slug: "curl-femoral-acostado", mg: "isquios", eq: "maquina", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Curl femoral sentado", slug: "curl-femoral-sentado", mg: "isquios", eq: "maquina", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },

  // Glúteos
  { nombre: "Hip thrust con barra", slug: "hip-thrust", mg: "gluteos", eq: "barra", patron: "bisagra", tipo: "compuesto", reg: "peso_reps", nivel: "intermedio" },
  { nombre: "Pull-through en polea", slug: "pull-through-polea", mg: "gluteos", eq: "polea", patron: "bisagra", tipo: "compuesto", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Patada de glúteo en polea", slug: "patada-gluteo-polea", mg: "gluteos", eq: "polea", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },

  // Gemelos
  { nombre: "Gemelos parado", slug: "gemelos-parado", mg: "gemelos", eq: "maquina", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Gemelos sentado", slug: "gemelos-sentado", mg: "gemelos", eq: "maquina", patron: "aislamiento", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },

  // Core
  { nombre: "Plancha frontal", slug: "plancha-frontal", mg: "core", eq: "peso-corporal", patron: "core_antiextension", tipo: "aislamiento", reg: "tiempo", nivel: "principiante" },
  { nombre: "Rueda abdominal", slug: "rueda-abdominal", mg: "core", eq: "peso-corporal", patron: "core_antiextension", tipo: "aislamiento", reg: "reps", nivel: "intermedio" },
  { nombre: "Crunch en polea", slug: "crunch-polea", mg: "core", eq: "polea", patron: "core_flexion", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Elevación piernas colgado", slug: "elevacion-piernas-colgado", mg: "core", eq: "peso-corporal", patron: "core_flexion", tipo: "aislamiento", reg: "reps", nivel: "intermedio" },
  { nombre: "Pallof press", slug: "pallof-press", mg: "core", eq: "polea", patron: "core_antirotacion", tipo: "aislamiento", reg: "peso_reps", nivel: "principiante" },
  { nombre: "Leñador polea", slug: "lenador-polea", mg: "core", eq: "polea", patron: "core_antirotacion", tipo: "aislamiento", reg: "peso_reps", nivel: "intermedio" },
  { nombre: "Plancha lateral", slug: "plancha-lateral", mg: "core", eq: "peso-corporal", patron: "core_lateral", tipo: "aislamiento", reg: "tiempo", nivel: "principiante" },
];

export const FIXTURE_CATALOG: ExerciseWithRelations[] = RAW.map((m, i): ExerciseWithRelations => ({
  id: `ex-${i}-${m.slug}`,
  nombre: m.nombre,
  slug: m.slug,
  muscle_group_id: `mg-${m.mg}`,
  secondary_muscles: [],
  equipment_id: `eq-${m.eq}`,
  patron: m.patron,
  tipo: m.tipo,
  tipo_registro: m.reg,
  nivel_minimo: m.nivel,
  instrucciones: [],
  errores_comunes: [],
  media_url: null,
  media_frames: [],
  youtube_query: null,
  youtube_video_id: null,
  muscle_group: { id: `mg-${m.mg}`, slug: m.mg, nombre: m.mg },
  equipment: { id: `eq-${m.eq}`, slug: m.eq, nombre: m.eq },
}));

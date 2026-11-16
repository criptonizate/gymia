// Schemas Zod reusables para server actions.
import { z } from "zod";

// Mensajes amigables al user (Zod v4). Devuelve string para forzar el mensaje;
// `undefined` deja el default. No tocamos códigos raros para no ocultar bugs.
z.config({
  customError: (iss) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const i = iss as any;
    if (i.code === "invalid_type") {
      if (i.input === undefined || i.input === null) return "Falta este dato.";
      return "Tipo de dato incorrecto.";
    }
    if (i.code === "too_small") {
      if (i.origin === "string")
        return i.minimum === 1
          ? "No puede estar vacío."
          : `Mínimo ${i.minimum} caracteres.`;
      if (i.origin === "number") return `Mínimo ${i.minimum}.`;
      if (i.origin === "array") return `Necesitás al menos ${i.minimum}.`;
    }
    if (i.code === "too_big") {
      if (i.origin === "string") return `Máximo ${i.maximum} caracteres.`;
      if (i.origin === "number") return `Máximo ${i.maximum}.`;
    }
    if (i.code === "invalid_format") {
      if (i.format === "email") return "Email inválido.";
      if (i.format === "uuid") return "ID inválido.";
    }
    if (i.code === "invalid_value") return "Valor inválido.";
    return undefined;
  },
});

export const Nivel = z.enum(["principiante", "intermedio", "avanzado"]);
export const Objetivo = z.enum([
  "hipertrofia",
  "fuerza",
  "general",
  "perdida_grasa",
  "rendimiento_deportivo",
]);
export const TipoRegistro = z.enum(["peso_reps", "reps", "tiempo"]);

export const Uuid = z.string().uuid();
export const NonEmptyStr = z.string().trim().min(1);

export const ProfileUpdate = z.object({
  nombre: z.string().trim().min(1).max(80).optional(),
  nivel: Nivel.optional(),
  objetivo: Objetivo.optional(),
});
export type ProfileUpdateIn = z.infer<typeof ProfileUpdate>;

export const EmailStr = z.string().trim().email();
export const PasswordStr = z.string().min(8).max(200);

export const SignInInput = z.object({
  email: EmailStr,
  password: PasswordStr,
  next: z.string().startsWith("/").optional(),
});

export const SignUpInput = z.object({
  email: EmailStr,
  password: PasswordStr,
  nombre: z.string().trim().min(1).max(80).optional(),
});

export const OnboardingInput = z.object({
  nombre: z.string().trim().min(1).max(80),
  nivel: Nivel,
});

export const LogSetInput = z.object({
  sessionId: Uuid,
  routineExerciseId: Uuid,
  exerciseId: Uuid,
  esSustituto: z.boolean().optional(),
  numeroSerie: z.number().int().min(1).max(20),
  objetivoReps: z.number().int().min(0).max(1000).nullable(),
  objetivoPesoKg: z.number().min(0).max(999).nullable(),
  objetivoSeg: z.number().int().min(0).max(3600).nullable(),
  pesoKg: z.number().min(0).max(999).nullable(),
  reps: z.number().int().min(0).max(1000).nullable(),
  duracionSeg: z.number().int().min(0).max(3600).nullable(),
  rir: z.number().int().min(0).max(5).nullable().optional(),
  completada: z.boolean(),
});

export const UpdateSetLogInput = z.object({
  id: Uuid,
  peso_kg: z.number().min(0).max(999).nullable().optional(),
  reps: z.number().int().min(0).max(1000).nullable().optional(),
  duracion_seg: z.number().int().min(0).max(3600).nullable().optional(),
  completada: z.boolean().optional(),
});

export const BodyWeightInput = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kg: z.number().min(20).max(400),
});

export const PlannedExerciseSchema = z.object({
  orden: z.number().int().min(1).max(20),
  exercise_id: Uuid.optional(),
  exercise_slug: z.string().min(1).max(120),
  nombre: z.string().min(1).max(200),
  patron: z.string().min(1).max(40),
  tipo: z.enum(["compuesto", "aislamiento"]),
  tipo_registro: TipoRegistro,
  muscle_group_slug: z.string().min(1).max(40),
  equipment_slug: z.string().min(1).max(40),
  series: z.number().int().min(1).max(10),
  reps_min: z.number().int().min(1).max(200).optional().nullable(),
  reps_max: z.number().int().min(1).max(200).optional().nullable(),
  duracion_seg: z.number().int().min(1).max(3600).optional().nullable(),
  descanso_seg: z.number().int().min(10).max(600),
  superset_group: z.number().int().nullable().optional(),
});

export const PlannedDaySchema = z.object({
  semana: z.number().int().min(1).max(4),
  orden: z.number().int().min(1).max(5),
  nombre: z.string().min(1).max(120),
  split_label: z.string().min(1).max(80).optional(),
  ejercicios: z.array(PlannedExerciseSchema).min(1).max(12),
});

export const RoutinePlanSchema = z.object({
  nombre: z.string().min(1).max(160),
  split: z.string().min(1).max(80),
  dias_por_semana: z.number().int().min(2).max(5),
  semanas: z.number().int().min(1).max(4),
  nivel: Nivel,
  objetivo: Objetivo,
  dias: z.array(PlannedDaySchema).min(1).max(28),
});

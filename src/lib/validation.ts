// Schemas Zod reusables para server actions.
import { z } from "zod";

export const Nivel = z.enum(["principiante", "intermedio", "avanzado"]);
export const Objetivo = z.enum(["hipertrofia", "fuerza", "general"]);
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
  objetivo: Objetivo,
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

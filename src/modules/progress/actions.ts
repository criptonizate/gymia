"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getExerciseEvolution, getRecentSessions } from "./queries";
import { BodyWeightInput } from "@/lib/validation";

export async function fetchRecentSessions(daysBack: number) {
  return getRecentSessions(daysBack);
}

export async function fetchEvolution(exerciseId: string) {
  return getExerciseEvolution(exerciseId);
}

export type SaveProfileInput = {
  nombre?: string;
  nivel?: "principiante" | "intermedio" | "avanzado";
  objetivo?:
    | "hipertrofia"
    | "fuerza"
    | "general"
    | "perdida_grasa"
    | "rendimiento_deportivo";
  edad?: number | null;
  sexo?: "masculino" | "femenino" | "otro" | null;
  altura_cm?: number | null;
  duracion_sesion_min?: number | null;
  limitaciones?: string[];
  grupos_prioritarios?: string[];
  otros_deportes?: string[];
};

export async function logBodyWeight(
  fecha: string,
  kg: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = BodyWeightInput.safeParse({ fecha, kg });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Hace falta iniciar sesión." };

  const { error } = await supabase
    .from("body_weights")
    .upsert(
      { user_id: user.id, fecha: parsed.data.fecha, kg: parsed.data.kg },
      { onConflict: "user_id,fecha" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/cuenta");
  return { ok: true };
}

export async function saveProfile(
  patch: SaveProfileInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Hace falta iniciar sesión." };

  const clean: Record<string, unknown> = {};
  if (patch.nombre !== undefined) clean.nombre = patch.nombre.trim() || null;
  if (patch.nivel !== undefined) clean.nivel = patch.nivel;
  if (patch.objetivo !== undefined) clean.objetivo = patch.objetivo;
  if (patch.edad !== undefined) clean.edad = patch.edad;
  if (patch.sexo !== undefined) clean.sexo = patch.sexo;
  if (patch.altura_cm !== undefined) clean.altura_cm = patch.altura_cm;
  if (patch.duracion_sesion_min !== undefined)
    clean.duracion_sesion_min = patch.duracion_sesion_min;
  if (patch.limitaciones !== undefined) clean.limitaciones = patch.limitaciones;
  if (patch.grupos_prioritarios !== undefined)
    clean.grupos_prioritarios = patch.grupos_prioritarios;
  if (patch.otros_deportes !== undefined)
    clean.otros_deportes = patch.otros_deportes;

  const { error } = await supabase
    .from("profiles")
    .update(clean)
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/cuenta");
  revalidatePath("/hoy");
  return { ok: true };
}

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
  objetivo?: "hipertrofia" | "fuerza" | "general";
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

  const { error } = await supabase
    .from("profiles")
    .update(clean)
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/cuenta");
  revalidatePath("/hoy");
  return { ok: true };
}

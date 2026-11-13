"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getExerciseEvolution } from "./queries";

export async function fetchEvolution(exerciseId: string) {
  return getExerciseEvolution(exerciseId);
}

export type SaveProfileInput = {
  nombre?: string;
  nivel?: "principiante" | "intermedio" | "avanzado";
  objetivo?: "hipertrofia" | "fuerza" | "general";
};

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

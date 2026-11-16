"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/supabase/profile";

const BUCKET = "exercise-media";
const MAX_FRAMES = 6;
const MAX_BYTES = 2_000_000; // 2 MB por archivo

export type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireAdmin(): Promise<Result<true>> {
  const admin = await isAdmin();
  if (!admin) return { ok: false, error: "Sin permisos." };
  return { ok: true, data: true };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export type ExerciseInput = {
  nombre: string;
  muscle_group_id: string;
  equipment_id: string;
  patron: string;
  tipo: "compuesto" | "aislamiento";
  tipo_registro: "peso_reps" | "reps" | "tiempo";
  nivel_minimo: "principiante" | "intermedio" | "avanzado";
  secondary_muscles: string[];
  instrucciones: string[];
  errores_comunes: string[];
  youtube_query: string | null;
};

function cleanInput(raw: ExerciseInput): ExerciseInput | string {
  const nombre = raw.nombre.trim();
  if (nombre.length < 2) return "El nombre es demasiado corto.";
  if (!raw.muscle_group_id) return "Elegí un grupo muscular.";
  if (!raw.equipment_id) return "Elegí un equipamiento.";
  return {
    ...raw,
    nombre,
    secondary_muscles: raw.secondary_muscles.map((x) => x.trim()).filter(Boolean),
    instrucciones: raw.instrucciones.map((x) => x.trim()).filter(Boolean),
    errores_comunes: raw.errores_comunes.map((x) => x.trim()).filter(Boolean),
    youtube_query: raw.youtube_query?.trim() || null,
  };
}

function revalidateExercises(slug?: string) {
  revalidatePath("/ejercicios");
  if (slug) revalidatePath(`/ejercicios/${slug}`);
  revalidatePath("/rutina");
  revalidatePath("/hoy");
}

export async function createExercise(
  input: ExerciseInput,
): Promise<Result<{ slug: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const clean = cleanInput(input);
  if (typeof clean === "string") return { ok: false, error: clean };

  const supabase = await createClient();
  const base = slugify(clean.nombre);
  if (!base) return { ok: false, error: "No pude generar un slug válido." };

  // Buscar un slug libre: base, base-2, base-3, ...
  let slug = base;
  for (let n = 2; n < 20; n++) {
    const { data: hit } = await supabase
      .from("exercises")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!hit) break;
    slug = `${base}-${n}`;
  }

  const { error } = await supabase.from("exercises").insert({
    nombre: clean.nombre,
    slug,
    muscle_group_id: clean.muscle_group_id,
    equipment_id: clean.equipment_id,
    patron: clean.patron,
    tipo: clean.tipo,
    tipo_registro: clean.tipo_registro,
    nivel_minimo: clean.nivel_minimo,
    secondary_muscles: clean.secondary_muscles,
    instrucciones: clean.instrucciones,
    errores_comunes: clean.errores_comunes,
    youtube_query: clean.youtube_query,
    media_frames: [],
  });
  if (error) return { ok: false, error: error.message };

  revalidateExercises(slug);
  return { ok: true, data: { slug } };
}

export async function updateExercise(
  exerciseId: string,
  input: ExerciseInput,
): Promise<Result<{ slug: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const clean = cleanInput(input);
  if (typeof clean === "string") return { ok: false, error: clean };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("exercises")
    .select("slug")
    .eq("id", exerciseId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Ejercicio inexistente." };

  const { error } = await supabase
    .from("exercises")
    .update({
      nombre: clean.nombre,
      muscle_group_id: clean.muscle_group_id,
      equipment_id: clean.equipment_id,
      patron: clean.patron,
      tipo: clean.tipo,
      tipo_registro: clean.tipo_registro,
      nivel_minimo: clean.nivel_minimo,
      secondary_muscles: clean.secondary_muscles,
      instrucciones: clean.instrucciones,
      errores_comunes: clean.errores_comunes,
      youtube_query: clean.youtube_query,
    })
    .eq("id", exerciseId);
  if (error) return { ok: false, error: error.message };

  revalidateExercises(existing.slug);
  return { ok: true, data: { slug: existing.slug } };
}

export async function deleteExercise(
  exerciseId: string,
): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const supabase = await createClient();
  const { data: ex } = await supabase
    .from("exercises")
    .select("slug")
    .eq("id", exerciseId)
    .maybeSingle();
  if (!ex) return { ok: false, error: "Ejercicio inexistente." };

  const { error } = await supabase
    .from("exercises")
    .delete()
    .eq("id", exerciseId);
  if (error) {
    // 23503 = foreign_key_violation
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "No se puede borrar: hay rutinas o registros que usan este ejercicio.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidateExercises(ex.slug);
  return { ok: true, data: undefined };
}

export async function deleteExerciseAndRedirect(
  exerciseId: string,
): Promise<Result> {
  const r = await deleteExercise(exerciseId);
  if (!r.ok) return r;
  redirect("/ejercicios");
}

/** Sobreescribe los frames de un ejercicio con la lista provista (URLs ya subidas). */
export async function updateExerciseFrames(
  exerciseId: string,
  frames: string[],
): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  if (frames.length > MAX_FRAMES) {
    return { ok: false, error: `Máximo ${MAX_FRAMES} imágenes.` };
  }
  const supabase = await createClient();
  const { data: ex } = await supabase
    .from("exercises")
    .select("slug")
    .eq("id", exerciseId)
    .maybeSingle();
  if (!ex) return { ok: false, error: "Ejercicio inexistente." };

  const { error } = await supabase
    .from("exercises")
    .update({ media_frames: frames })
    .eq("id", exerciseId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/ejercicios/${ex.slug}`);
  revalidatePath("/ejercicios");
  revalidatePath("/rutina");
  revalidatePath("/hoy");
  return { ok: true, data: undefined };
}

/**
 * Sube nuevos frames al Storage y devuelve sus URLs públicas.
 * Usa service_role (admin only). Reasigna nombres con timestamp para
 * invalidar caché del CDN y del service worker.
 */
export async function uploadExerciseFrames(
  formData: FormData,
): Promise<Result<{ urls: string[] }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const exerciseId = String(formData.get("exerciseId") ?? "");
  const files = formData.getAll("files") as File[];
  if (!exerciseId || files.length === 0) {
    return { ok: false, error: "Faltan archivos o ejercicio." };
  }
  if (files.length > MAX_FRAMES) {
    return { ok: false, error: `Máximo ${MAX_FRAMES} imágenes por carga.` };
  }

  const serverClient = await createClient();
  const { data: ex } = await serverClient
    .from("exercises")
    .select("slug")
    .eq("id", exerciseId)
    .maybeSingle();
  if (!ex) return { ok: false, error: "Ejercicio inexistente." };

  const adminClient = createAdminClient();
  const stamp = Date.now();
  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (!f || typeof f.arrayBuffer !== "function") continue;
    if (f.size > MAX_BYTES) {
      return { ok: false, error: `"${f.name}" pesa más de 2 MB.` };
    }
    if (!/^image\/(jpe?g|png|webp)$/.test(f.type)) {
      return { ok: false, error: `"${f.name}" no es una imagen (jpg/png/webp).` };
    }
    const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const path = `${ex.slug}/custom-${stamp}-${i}.${ext}`;
    const buf = Buffer.from(await f.arrayBuffer());
    const up = await adminClient.storage
      .from(BUCKET)
      .upload(path, buf, { contentType: f.type, upsert: true });
    if (up.error) return { ok: false, error: up.error.message };
    const { data: pub } = adminClient.storage.from(BUCKET).getPublicUrl(path);
    urls.push(pub.publicUrl);
  }

  return { ok: true, data: { urls } };
}

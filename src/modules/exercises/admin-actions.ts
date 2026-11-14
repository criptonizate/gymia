"use server";

import { revalidatePath } from "next/cache";
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

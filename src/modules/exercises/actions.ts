"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractYouTubeId } from "./youtube";

export type SaveVideoResult = { ok: true } | { ok: false; error: string };

export async function saveUserVideo(
  exerciseId: string,
  exerciseSlug: string,
  input: string,
): Promise<SaveVideoResult> {
  const id = extractYouTubeId(input);
  if (!id) return { ok: false, error: "No pude leer un video de YouTube de ese link." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Hace falta iniciar sesión." };

  const { error } = await supabase
    .from("user_exercise_videos")
    .upsert(
      { user_id: user.id, exercise_id: exerciseId, youtube_video_id: id },
      { onConflict: "user_id,exercise_id" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/ejercicios/${exerciseSlug}`);
  return { ok: true };
}

export async function clearUserVideo(
  exerciseId: string,
  exerciseSlug: string,
): Promise<SaveVideoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Hace falta iniciar sesión." };

  const { error } = await supabase
    .from("user_exercise_videos")
    .delete()
    .eq("user_id", user.id)
    .eq("exercise_id", exerciseId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/ejercicios/${exerciseSlug}`);
  return { ok: true };
}

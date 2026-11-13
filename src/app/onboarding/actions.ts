"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveOnboarding(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const nivel = String(formData.get("nivel") ?? "");
  const objetivo = String(formData.get("objetivo") ?? "");

  if (!nombre || !["principiante", "intermedio", "avanzado"].includes(nivel) ||
      !["hipertrofia", "fuerza", "general"].includes(objetivo)) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({ nombre, nivel, objetivo })
    .eq("id", user.id);

  redirect("/hoy");
}

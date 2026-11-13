"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingInput } from "@/lib/validation";

export async function saveOnboarding(formData: FormData) {
  const parsed = OnboardingInput.safeParse({
    nombre: formData.get("nombre"),
    nivel: formData.get("nivel"),
    objetivo: formData.get("objetivo"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  redirect("/hoy");
}

import { createClient } from "@/lib/supabase/server";

export type Nivel = "principiante" | "intermedio" | "avanzado";
export type Objetivo = "hipertrofia" | "fuerza" | "general";

export type Profile = {
  id: string;
  nombre: string | null;
  role: "user" | "trainer" | "admin";
  nivel: Nivel | null;
  objetivo: Objetivo | null;
  created_at: string;
};

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

export function isProfileComplete(p: Profile | null): boolean {
  return !!(p && p.nombre && p.nivel && p.objetivo);
}

export async function isAdmin(): Promise<boolean> {
  const p = await getProfile();
  return p?.role === "admin";
}

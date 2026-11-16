import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Nivel = "principiante" | "intermedio" | "avanzado";
export type Objetivo =
  | "hipertrofia"
  | "fuerza"
  | "general"
  | "perdida_grasa"
  | "rendimiento_deportivo";

export type Sexo = "masculino" | "femenino" | "otro";

export type Profile = {
  id: string;
  nombre: string | null;
  role: "user" | "trainer" | "admin";
  nivel: Nivel | null;
  objetivo: Objetivo | null;
  edad: number | null;
  sexo: Sexo | null;
  altura_cm: number | null;
  limitaciones: string[];
  duracion_sesion_min: number | null;
  grupos_prioritarios: string[];
  otros_deportes: string[];
  created_at: string;
};

// Deduplicado por request con React.cache: múltiples llamadas en el mismo
// render no golpean Supabase más de una vez.
export const getProfile = cache(async (): Promise<Profile | null> => {
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
});

export function isProfileComplete(p: Profile | null): boolean {
  return !!(p && p.nombre && p.nivel);
}

export async function isAdmin(): Promise<boolean> {
  const p = await getProfile();
  return p?.role === "admin";
}

// Identidad del user sin tocar la red.
//
// Supabase v2 expone `supabase.auth.getSession()` que LEE DEL STORAGE LOCAL,
// no hace fetch, así que funciona offline. En cambio `getUser()` hace
// `GET /user` contra auth.supabase.co y devuelve null sin conexión — eso
// rompía la cola offline (se guardaba todo con user_id "anon" y el drain
// nunca la reclamaba).
//
// Si el user cambia de cuenta, `getSession()` refleja la cuenta nueva
// automáticamente (lee del storage que supabase-js mantiene al día).

import { createClient } from "@/lib/supabase/client";

export async function getOfflineUserId(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

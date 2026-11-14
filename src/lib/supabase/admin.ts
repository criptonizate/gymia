// Cliente server-only con la service_role. NUNCA importar desde código
// que pueda llegar al cliente.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY o URL ausentes");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

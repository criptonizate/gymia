import { CalendarCheck } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getProfile } from "@/lib/supabase/profile";

export const instant = false;

export default async function HoyPage() {
  const profile = await getProfile();
  return (
    <main className="flex flex-col gap-2 p-4">
      <header className="flex flex-col gap-1 px-2 pt-4">
        <p className="text-sm text-muted-foreground">
          Hola{profile?.nombre ? `, ${profile.nombre.split(" ")[0]}` : ""}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Hoy</h1>
      </header>
      <EmptyState
        Icon={CalendarCheck}
        title="Todavía no tenés rutina"
        body="Generá un plan de 1 a 4 semanas según los días que entrenás."
        cta={{ href: "/generar", label: "Generar mi rutina" }}
      />
    </main>
  );
}

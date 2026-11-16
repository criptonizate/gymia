import { GenerarWizard } from "./wizard";
import { getProfile } from "@/lib/supabase/profile";

export const instant = false;

export default async function GenerarPage() {
  const profile = await getProfile();
  return (
    <main className="flex flex-col">
      <header className="px-6 pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Generar rutina</h1>
        <p className="text-sm text-muted-foreground">
          Armamos tu plan en 4 toques.
        </p>
      </header>
      <GenerarWizard
        nivelInicial={profile?.nivel ?? "intermedio"}
        objetivoInicial={profile?.objetivo ?? "hipertrofia"}
      />
    </main>
  );
}

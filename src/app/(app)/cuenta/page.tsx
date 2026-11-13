import { LogOut } from "lucide-react";
import { getProfile } from "@/lib/supabase/profile";
import { signOut } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";

export const instant = false;

const NIVEL_LABEL: Record<string, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

const OBJETIVO_LABEL: Record<string, string> = {
  hipertrofia: "Hipertrofia",
  fuerza: "Fuerza",
  general: "General",
};

export default async function CuentaPage() {
  const profile = await getProfile();

  return (
    <main className="flex flex-col gap-6 p-4">
      <header className="px-2 pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Mi cuenta</h1>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <Row label="Nombre" value={profile?.nombre ?? "—"} />
        <Row
          label="Nivel"
          value={profile?.nivel ? NIVEL_LABEL[profile.nivel] : "—"}
        />
        <Row
          label="Objetivo"
          value={profile?.objetivo ? OBJETIVO_LABEL[profile.objetivo] : "—"}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-2 text-sm font-medium text-muted-foreground">
          Preferencias
        </h2>
        <ThemeToggle />
      </section>

      <form action={signOut} className="mt-2">
        <button
          type="submit"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium text-destructive hover:bg-accent"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

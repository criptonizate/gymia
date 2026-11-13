import { LogOut } from "lucide-react";
import { getProfile } from "@/lib/supabase/profile";
import { signOut } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { UnitToggle } from "@/components/unit-toggle";
import { KpiGrid } from "@/modules/progress/components/KpiGrid";
import { Heatmap } from "@/modules/progress/components/Heatmap";
import { WeeklyVolumeChart } from "@/modules/progress/components/WeeklyVolumeChart.lazy";
import { MuscleGroupChart } from "@/modules/progress/components/MuscleGroupChart.lazy";
import { RecordsList } from "@/modules/progress/components/RecordsList";
import { EvolutionPicker } from "@/modules/progress/components/EvolutionPicker.lazy";
import { ProfileEditor } from "@/modules/progress/components/ProfileEditor";
import {
  getExerciseRecords,
  getKpis,
  getSetsByMuscle,
  getTrainingDays,
  getWeeklyVolume,
} from "@/modules/progress/queries";

export const instant = false;

export default async function CuentaPage() {
  const [profile, kpis, days, weekly, byMuscle, records] = await Promise.all([
    getProfile(),
    getKpis(),
    getTrainingDays(120),
    getWeeklyVolume(12),
    getSetsByMuscle(7),
    getExerciseRecords(),
  ]);

  return (
    <main className="flex flex-col gap-6 p-4">
      <header className="px-2 pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Mi cuenta</h1>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="px-2 text-sm font-semibold text-muted-foreground">
          Resumen
        </h2>
        <KpiGrid data={kpis} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-2 text-sm font-semibold text-muted-foreground">
          Actividad
        </h2>
        <Heatmap days={days} />
        <WeeklyVolumeChart data={weekly} />
        <MuscleGroupChart data={byMuscle} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-2 text-sm font-semibold text-muted-foreground">
          Récords
        </h2>
        <RecordsList records={records} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-2 text-sm font-semibold text-muted-foreground">
          Evolución por ejercicio
        </h2>
        <EvolutionPicker records={records} />
      </section>

      {profile && <ProfileEditor profile={profile} />}

      <section className="flex flex-col gap-3">
        <h2 className="px-2 text-sm font-semibold text-muted-foreground">
          Preferencias
        </h2>
        <ThemeToggle />
        <UnitToggle />
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

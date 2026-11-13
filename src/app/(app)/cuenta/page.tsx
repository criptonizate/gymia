import { getProfile } from "@/lib/supabase/profile";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UnitToggle } from "@/components/unit-toggle";
import { KpiGrid } from "@/modules/progress/components/KpiGrid";
import { Heatmap } from "@/modules/progress/components/Heatmap";
import { MonthCalendar } from "@/modules/progress/components/MonthCalendar";
import { WeeklyVolumeChart } from "@/modules/progress/components/WeeklyVolumeChart.lazy";
import { MuscleGroupChart } from "@/modules/progress/components/MuscleGroupChart.lazy";
import { RecordsList } from "@/modules/progress/components/RecordsList";
import { EvolutionPicker } from "@/modules/progress/components/EvolutionPicker.lazy";
import { ProfileEditor } from "@/modules/progress/components/ProfileEditor";
import { BodyWeightCard } from "@/modules/progress/components/BodyWeightCard";
import { RecentSessionsCard } from "@/modules/progress/components/RecentSessionsCard";
import { WeekCompareCard } from "@/modules/progress/components/WeekCompareCard";
import { PresetCountdownToggle } from "@/components/preset-countdown-toggle";
import {
  getBodyWeights,
  getExerciseRecords,
  getKpis,
  getRecentSessions,
  getSetsByMuscle,
  getTrainingDays,
  getWeekCompare,
  getWeeklyVolume,
} from "@/modules/progress/queries";

export const instant = false;

export default async function CuentaPage() {
  const [
    profile,
    kpis,
    days,
    weekly,
    byMuscle,
    records,
    bodyWeights,
    recent,
    weekCompare,
  ] = await Promise.all([
    getProfile(),
    getKpis(),
    getTrainingDays(120),
    getWeeklyVolume(12),
    getSetsByMuscle(7),
    getExerciseRecords(),
    getBodyWeights(30),
    getRecentSessions(30),
    getWeekCompare(),
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
        <WeekCompareCard data={weekCompare} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-2 text-sm font-semibold text-muted-foreground">
          Actividad
        </h2>
        <MonthCalendar days={days} />
        <Heatmap days={days} />
        <WeeklyVolumeChart data={weekly} />
        <MuscleGroupChart data={byMuscle} />
        <BodyWeightCard entries={bodyWeights} />
        <RecentSessionsCard initial={recent} />
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
        <PresetCountdownToggle />
      </section>

      <SignOutButton />
    </main>
  );
}

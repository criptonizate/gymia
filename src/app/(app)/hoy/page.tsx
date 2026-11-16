import Link from "next/link";
import { CalendarCheck, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ExerciseMedia } from "@/modules/exercises/components/ExerciseMedia";
import { getProfile } from "@/lib/supabase/profile";
import { getTodayContext } from "@/modules/workouts/queries";
import { getTrainingDays } from "@/modules/progress/queries";
import { StreakBadge } from "@/modules/progress/components/StreakBadge";
import { StartButton } from "./start-button";
import { DeloadCta } from "./deload-cta";

export const instant = false;

export default async function HoyPage() {
  const [profile, ctx, trainingDays] = await Promise.all([
    getProfile(),
    getTodayContext(),
    getTrainingDays(90),
  ]);

  const firstName = profile?.nombre?.split(" ")[0] ?? "";

  // Sin rutina activa
  if (!ctx) {
    return (
      <main className="flex flex-col gap-2 p-4">
        <header className="flex flex-col gap-1 px-2 pt-4">
          {firstName && (
            <p className="text-sm text-muted-foreground">Hola, {firstName}</p>
          )}
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

  // Plan completado
  if (ctx.planTerminado || !ctx.nextDay) {
    return (
      <main className="flex flex-col gap-2 p-4">
        <header className="flex flex-col gap-1 px-2 pt-4">
          <p className="text-sm text-muted-foreground">
            Hola{firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Hoy</h1>
        </header>
        <EmptyState
          Icon={Sparkles}
          title="¡Completaste el plan!"
          body={`${ctx.completados} de ${ctx.totalDias} días hechos.`}
          cta={{ href: "/generar", label: "Generar el siguiente" }}
        />
        <div className="px-4">
          <DeloadCta
            config={{
              diasPorSemana: ctx.routineConfig.diasPorSemana,
              semanas: 1,
              nivel: ctx.routineConfig.nivel,
              objetivo: ctx.routineConfig.objetivo,
            }}
          />
        </div>
      </main>
    );
  }

  const day = ctx.nextDay;

  return (
    <main className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-1 px-2 pt-4">
        <p className="text-sm text-muted-foreground">
          Hola{firstName ? `, ${firstName}` : ""}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Hoy</h1>
        <p className="text-sm text-muted-foreground">{day.nombre}</p>
      </header>

      <StreakBadge
        days={trainingDays}
        weekTarget={ctx.routineConfig.diasPorSemana}
      />

      <ul className="flex flex-col gap-2">
        {day.ejercicios.map((e) => {
          const lastSummary = summarizeLast(e);
          return (
            <li key={e.id}>
              <Link
                href={`/ejercicios/${e.exercise.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-primary/50"
              >
                <ExerciseMedia
                  mediaUrl={e.exercise.media_url}
                  frames={e.exercise.media_frames}
                  muscleGroupSlug={e.exercise.muscle_group.slug}
                  exerciseSlug={e.exercise.slug}
                  patron={e.exercise.patron}
                  alt={e.exercise.nombre}
                  className="h-16 w-16 flex-none rounded-xl"
                  minimal
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <h3 className="truncate text-sm font-semibold">
                    {e.exercise.nombre}
                  </h3>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {e.exercise.tipo_registro === "tiempo"
                      ? `${e.series} series × ${e.duracion_seg}s`
                      : `${e.series} series × ${e.reps_min}-${e.reps_max} reps`}
                  </p>
                  {lastSummary && (
                    <p className="truncate text-xs text-muted-foreground">
                      Última vez: {lastSummary}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <StartButton
        routineDayId={day.id}
        openSessionId={ctx.openSessionId}
      />
    </main>
  );
}

function summarizeLast(e: {
  exercise: { tipo_registro: string };
  lastLogs?: { peso_kg: number | null; reps: number | null; duracion_seg: number | null }[];
}): string | null {
  const logs = e.lastLogs;
  if (!logs || logs.length === 0) return null;
  if (e.exercise.tipo_registro === "tiempo") {
    const segs = logs.map((l) => l.duracion_seg).filter((x): x is number => x != null);
    if (!segs.length) return null;
    return `${segs.join(", ")} s`;
  }
  if (e.exercise.tipo_registro === "reps") {
    const reps = logs.map((l) => l.reps).filter((x): x is number => x != null);
    if (!reps.length) return null;
    return reps.join(", ");
  }
  // peso_reps
  const peso = logs[0].peso_kg;
  const reps = logs.map((l) => l.reps).filter((x): x is number => x != null);
  if (!reps.length) return null;
  if (peso == null || peso === 0) return `${reps.join(", ")} reps`;
  return `${peso} kg × ${reps.join(", ")}`;
}

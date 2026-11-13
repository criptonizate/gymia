"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { regenerateActive } from "@/modules/routines/actions";
import type { RoutineExerciseRow, RoutineRow } from "@/modules/routines/queries";
import { SwapSheet } from "./swap-sheet";
import { AddExerciseSheet } from "./add-sheet";
import { ImportExportButtons } from "./import-export";
import { SortableExerciseList } from "./sortable-list";

type Props = { routine: RoutineRow };

export function RutinaView({ routine }: Props) {
  const router = useRouter();
  const semanas = Array.from(
    new Set(routine.dias.map((d) => d.semana)),
  ).sort();
  const [sem, setSem] = useState(semanas[0]);
  const [swapFor, setSwapFor] = useState<{
    id: string;
    exId: string;
    patron: string;
    mg: string;
  } | null>(null);
  const [addFor, setAddFor] = useState<string | null>(null);
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
  const [pending, start] = useTransition();

  const diasDeSemana = routine.dias.filter((d) => d.semana === sem);

  function regen() {
    start(async () => {
      const res = await regenerateActive({
        diasPorSemana: routine.dias_por_semana as 2 | 3 | 4 | 5,
        semanas: routine.semanas as 1 | 2 | 3 | 4,
        nivel: routine.nivel,
        objetivo: routine.objetivo,
      });
      setConfirmRegenOpen(false);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-1 px-2 pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Rutina</h1>
        <p className="truncate text-sm text-muted-foreground">
          {routine.split} · {routine.dias_por_semana}d/sem · {routine.semanas}{" "}
          {routine.semanas === 1 ? "semana" : "semanas"}
        </p>
      </header>

      {semanas.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-1 pb-1">
          {semanas.map((s) => (
            <button
              key={s}
              onClick={() => setSem(s)}
              className={[
                "min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium",
                sem === s
                  ? "border-primary bg-[var(--primary-soft)] text-primary"
                  : "border-border bg-card text-muted-foreground",
              ].join(" ")}
            >
              Semana {s}
            </button>
          ))}
        </div>
      )}

      <section className="flex flex-col gap-4">
        {diasDeSemana.map((d) => (
          <article
            key={d.id}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3"
          >
            <header className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold">{d.nombre}</h2>
            </header>

            <SortableExerciseList
              routineDayId={d.id}
              ejercicios={d.ejercicios}
              onOpenSwap={(e: RoutineExerciseRow) =>
                setSwapFor({
                  id: e.id,
                  exId: e.exercise.id,
                  patron: e.exercise.patron,
                  mg: e.exercise.muscle_group.slug,
                })
              }
            />

            <button
              onClick={() => setAddFor(d.id)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/50 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              <Plus className="h-4 w-4 text-primary" />
              Agregar ejercicio
            </button>
          </article>
        ))}
      </section>

      <button
        onClick={() => setConfirmRegenOpen(true)}
        className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        Regenerar rutina
      </button>

      <ImportExportButtons />

      {/* Sheets globales */}
      {swapFor && (
        <SwapSheet
          open={!!swapFor}
          onClose={() => setSwapFor(null)}
          routineExerciseId={swapFor.id}
          currentExerciseId={swapFor.exId}
          patron={swapFor.patron}
          muscleGroupSlug={swapFor.mg}
        />
      )}
      {addFor && (
        <AddExerciseSheet
          open={!!addFor}
          onClose={() => setAddFor(null)}
          routineDayId={addFor}
        />
      )}

      <BottomSheet
        open={confirmRegenOpen}
        onClose={() => setConfirmRegenOpen(false)}
        title="Regenerar rutina"
      >
        <div className="flex flex-col gap-4 pb-2">
          <p className="text-sm text-muted-foreground">
            Vas a reemplazar la rutina actual por una nueva con la misma
            configuración ({routine.dias_por_semana}d/sem · {routine.semanas}{" "}
            sem · {routine.nivel} · {routine.objetivo}). La anterior quedará
            inactiva y se van a <strong>perder los supersets, el reorden y los
            cambios manuales</strong> de ejercicios.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmRegenOpen(false)}
              className="min-h-12 flex-1 rounded-xl border border-border bg-card text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              disabled={pending}
              onClick={regen}
              className="min-h-12 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-strong)] disabled:opacity-60"
            >
              {pending ? "Generando…" : "Sí, regenerar"}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}


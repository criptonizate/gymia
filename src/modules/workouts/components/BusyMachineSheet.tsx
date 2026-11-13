"use client";

import { useEffect, useState, useTransition } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { ExerciseMedia } from "@/modules/exercises/components/ExerciseMedia";
import { listSubstitutes, replaceInRoutine } from "@/modules/workouts/actions";
import type { ExerciseWithRelations } from "@/modules/exercises/types";

type Props = {
  open: boolean;
  onClose: () => void;
  routineExerciseId: string;
  exerciseId: string;
  muscleGroupSlug: string;
  patron: string;
  tipo: "compuesto" | "aislamiento";
  equipmentSlug: string;
  /** Usar sólo esta sesión → aplicar como sustituto. */
  onUseOnce: (newExercise: ExerciseWithRelations) => void;
};

export function BusyMachineSheet({
  open,
  onClose,
  routineExerciseId,
  exerciseId,
  muscleGroupSlug,
  patron,
  tipo,
  equipmentSlug,
  onUseOnce,
}: Props) {
  const [opts, setOpts] = useState<ExerciseWithRelations[] | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setOpts(null);
    setShowMore(false);
    setError(null);
    listSubstitutes(muscleGroupSlug, patron, tipo, equipmentSlug, exerciseId)
      .then(setOpts)
      .catch(() => setError("No pude cargar las alternativas."));
  }, [open, muscleGroupSlug, patron, tipo, equipmentSlug, exerciseId]);

  const primero = (opts ?? []).slice(0, 2);
  const siguiente = (opts ?? []).slice(2, 4);

  return (
    <BottomSheet open={open} onClose={onClose} title="Máquina ocupada">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Mismas series/reps. Mismo grupo muscular y patrón, otro equipo.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!opts && <p className="text-sm text-muted-foreground">Cargando…</p>}

        {opts && opts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay alternativas con otro equipo.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {primero.map((e) => (
            <OptionRow
              key={e.id}
              ex={e}
              pending={pending}
              onUseOnce={() => onUseOnce(e)}
              onUseAlways={() =>
                start(async () => {
                  const r = await replaceInRoutine(routineExerciseId, e.id);
                  if (r.ok) {
                    onUseOnce(e);
                  } else setError(r.error);
                })
              }
            />
          ))}
        </ul>

        {!showMore && siguiente.length > 0 && (
          <button
            onClick={() => setShowMore(true)}
            className="min-h-11 rounded-xl border border-border bg-card text-sm font-medium"
          >
            Otras opciones
          </button>
        )}

        {showMore && (
          <ul className="flex flex-col gap-2">
            {siguiente.map((e) => (
              <OptionRow
                key={e.id}
                ex={e}
                pending={pending}
                onUseOnce={() => onUseOnce(e)}
                onUseAlways={() =>
                  start(async () => {
                    const r = await replaceInRoutine(routineExerciseId, e.id);
                    if (r.ok) {
                      onUseOnce(e);
                    } else setError(r.error);
                  })
                }
              />
            ))}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
}

function OptionRow({
  ex,
  pending,
  onUseOnce,
  onUseAlways,
}: {
  ex: ExerciseWithRelations;
  pending: boolean;
  onUseOnce: () => void;
  onUseAlways: () => void;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <ExerciseMedia
          mediaUrl={ex.media_url}
          frames={ex.media_frames}
          muscleGroupSlug={ex.muscle_group.slug}
          alt={ex.nombre}
          className="h-16 w-16 flex-none rounded-lg"
          minimal
        />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{ex.nombre}</span>
          <span className="text-xs text-muted-foreground">
            {ex.equipment.nombre}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={onUseOnce}
          className="min-h-10 flex-1 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-[var(--primary-strong)] disabled:opacity-60"
        >
          Usar sólo hoy
        </button>
        <button
          disabled={pending}
          onClick={onUseAlways}
          className="min-h-10 flex-1 rounded-lg border border-border bg-background text-xs font-medium hover:bg-accent disabled:opacity-60"
        >
          Usar siempre
        </button>
      </div>
    </li>
  );
}

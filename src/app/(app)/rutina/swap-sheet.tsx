"use client";

import { useEffect, useState, useTransition } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { listSwapAlternatives, swapExercise } from "@/modules/routines/actions";
import { ExerciseMedia } from "@/modules/exercises/components/ExerciseMedia";
import type { ExerciseWithRelations } from "@/modules/exercises/types";

type Props = {
  open: boolean;
  onClose: () => void;
  routineExerciseId: string;
  currentExerciseId: string;
  patron: string;
  muscleGroupSlug: string;
};

export function SwapSheet({
  open,
  onClose,
  routineExerciseId,
  currentExerciseId,
  patron,
  muscleGroupSlug,
}: Props) {
  const [opts, setOpts] = useState<ExerciseWithRelations[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setOpts(null);
    setError(null);
    listSwapAlternatives(muscleGroupSlug, patron, currentExerciseId)
      .then(setOpts)
      .catch(() => setError("No pude cargar las alternativas."));
  }, [open, muscleGroupSlug, patron, currentExerciseId]);

  function pick(newId: string) {
    setError(null);
    start(async () => {
      const res = await swapExercise(routineExerciseId, newId);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Cambiar ejercicio">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Elegí otro del mismo patrón y grupo muscular.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!opts && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {opts && opts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay alternativas disponibles.
          </p>
        )}
        {opts && opts.length > 0 && (
          <ul className="flex flex-col gap-2">
            {opts.map((e) => (
              <li key={e.id}>
                <button
                  disabled={pending}
                  onClick={() => pick(e.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-2 text-left hover:border-primary/50 disabled:opacity-60"
                >
                  <ExerciseMedia
                    mediaUrl={e.media_url}
                    frames={e.media_frames}
                    muscleGroupSlug={e.muscle_group.slug}
                    alt={e.nombre}
                    className="h-14 w-14 flex-none rounded-lg"
                    minimal
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {e.nombre}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {e.equipment.nombre}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
}

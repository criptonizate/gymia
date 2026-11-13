"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { ExerciseMedia } from "@/modules/exercises/components/ExerciseMedia";
import { addExerciseToDay } from "@/modules/routines/actions";
import { listCatalog } from "./catalog-action";
import type { ExerciseWithRelations } from "@/modules/exercises/types";

type Props = {
  open: boolean;
  onClose: () => void;
  routineDayId: string;
};

export function AddExerciseSheet({ open, onClose, routineDayId }: Props) {
  const [all, setAll] = useState<ExerciseWithRelations[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open || all) return;
    listCatalog().then(setAll);
  }, [open, all]);

  const filtered = useMemo(() => {
    if (!all) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((e) => e.nombre.toLowerCase().includes(needle));
  }, [all, q]);

  function pick(id: string) {
    setError(null);
    start(async () => {
      const res = await addExerciseToDay(routineDayId, id);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Agregar ejercicio">
      <div className="flex flex-col gap-3">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en el catálogo"
            className="min-h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!all && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {all && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin resultados.</p>
        )}
        <ul className="flex max-h-[55dvh] flex-col gap-2 overflow-y-auto">
          {filtered.map((e) => (
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
                  <span className="truncate text-sm font-medium">{e.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.muscle_group.nombre} · {e.equipment.nombre}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </BottomSheet>
  );
}

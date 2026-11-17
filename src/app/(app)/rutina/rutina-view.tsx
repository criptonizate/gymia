"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, RefreshCw, Settings, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/button";
import { deleteActiveRoutine, regenerateActive } from "@/modules/routines/actions";
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
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Las dos nav más probables desde acá: volver a /hoy o ir a /generar.
  // Precargarlas hace que el click sea instantáneo.
  useEffect(() => {
    router.prefetch("/hoy");
    router.prefetch("/generar");
  }, [router]);

  const diasDeSemana = routine.dias.filter((d) => d.semana === sem);

  function regen() {
    setActionError(null);
    start(async () => {
      const res = await regenerateActive({
        diasPorSemana: routine.dias_por_semana as 2 | 3 | 4 | 5 | 6,
        semanas: routine.semanas as 1 | 2 | 3 | 4,
        nivel: routine.nivel,
        objetivo: routine.objetivo,
        entorno: routine.entorno ?? undefined,
      });
      if (res.ok) {
        setConfirmRegenOpen(false);
        router.refresh();
      } else {
        setActionError(res.error ?? "No se pudo regenerar la rutina.");
      }
    });
  }

  function eliminar() {
    setActionError(null);
    start(async () => {
      const res = await deleteActiveRoutine();
      if (res.ok) {
        setConfirmDeleteOpen(false);
        router.push("/hoy");
      } else {
        setActionError(res.error ?? "No se pudo eliminar la rutina.");
      }
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
                "glass-chip min-h-10 shrink-0 rounded-full px-4 text-sm font-medium",
                sem === s
                  ? "!border-primary !bg-[var(--primary-soft)] text-primary"
                  : "text-muted-foreground",
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
        onClick={() => setOptionsOpen(true)}
        className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent"
      >
        <MoreHorizontal className="h-4 w-4 text-primary" />
        Opciones de rutina
      </button>

      <ImportExportButtons />

      <BottomSheet
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        title="Opciones de rutina"
      >
        <div className="flex flex-col gap-2 pb-2">
          <OptionItem
            Icon={RefreshCw}
            label="Regenerar con la misma config"
            hint={`${routine.dias_por_semana}d/sem · ${routine.nivel} · ${routine.objetivo}`}
            onClick={() => {
              setOptionsOpen(false);
              setConfirmRegenOpen(true);
            }}
          />
          <OptionItem
            Icon={Settings}
            label="Hacer otra rutina"
            hint="Volvés al wizard: elegís entorno, días, objetivo, etc."
            onClick={() => {
              setOptionsOpen(false);
              router.push("/generar");
            }}
          />
          <OptionItem
            Icon={Trash2}
            label="Eliminar rutina"
            hint="Borra la rutina actual completa. El historial se queda."
            danger
            onClick={() => {
              setOptionsOpen(false);
              setConfirmDeleteOpen(true);
            }}
          />
        </div>
      </BottomSheet>

      <BottomSheet
        open={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setActionError(null);
        }}
        title="¿Eliminar la rutina?"
      >
        <div className="flex flex-col gap-4 pb-2">
          <p className="text-sm text-muted-foreground">
            Esto borra la rutina activa. El historial de sesiones queda
            intacto. Después podés generar una nueva.
          </p>
          {actionError && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {actionError}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              fullWidth
              loading={pending}
              loadingText="Eliminando…"
              onClick={eliminar}
            >
              Sí, eliminar
            </Button>
          </div>
        </div>
      </BottomSheet>

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
        onClose={() => {
          setConfirmRegenOpen(false);
          setActionError(null);
        }}
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
          {actionError && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {actionError}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setConfirmRegenOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              fullWidth
              loading={pending}
              loadingText="Generando…"
              onClick={regen}
            >
              Sí, regenerar
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}


function OptionItem({
  Icon,
  label,
  hint,
  onClick,
  danger = false,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex min-h-14 items-center gap-3 rounded-xl border border-border bg-background px-4 text-left",
        danger ? "text-destructive" : "text-foreground",
      ].join(" ")}
    >
      <Icon className={`h-4 w-4 ${danger ? "text-destructive" : "text-primary"}`} />
      <span className="flex flex-col">
        <span className="text-sm font-semibold">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

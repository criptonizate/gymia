"use client";

import { ArrowDown, ArrowUp, Check, Equal } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import {
  analyze,
  suggestOnNoLlegar,
  suggestOnSuperar,
  suggestOnTiempoCompleto,
  type CurrentTarget,
  type SetResult,
  type Suggestion,
} from "@/modules/workouts/progression";

type Props = {
  open: boolean;
  onClose: () => void;
  target: CurrentTarget;
  results: SetResult[];
  onPick: (s: Suggestion) => void;
  esSustituto?: boolean;
};

export function ProgressionSheet({
  open,
  onClose,
  target,
  results,
  onPick,
  esSustituto,
}: Props) {
  const a = analyze(target, results);
  const isTime = target.tipo_registro === "tiempo";

  let options: { icon: React.ElementType; title: string; subtitle: string; s: Suggestion }[] = [];

  if (isTime) {
    if (a.tiempoCompleto) {
      const s = suggestOnTiempoCompleto(target);
      options.push({
        icon: ArrowUp,
        title: "Subir el tiempo la próxima",
        subtitle: s.descripcion,
        s,
      });
    }
    options.push({
      icon: Equal,
      title: "Dejar igual",
      subtitle: "Mantener el tiempo objetivo",
      s: { kind: "igual", descripcion: "Mantener" },
    });
  } else if (a.supero) {
    const s = suggestOnSuperar(target);
    options.push({
      icon: ArrowUp,
      title: "Subir el peso",
      subtitle: s.descripcion,
      s,
    });
    options.push({
      icon: Equal,
      title: "Dejar igual",
      subtitle: "Mantener el objetivo",
      s: { kind: "igual", descripcion: "Mantener" },
    });
  } else if (a.noLlego) {
    const g = suggestOnNoLlegar(target);
    options = [
      { icon: ArrowDown, title: "Bajar el peso", subtitle: g.bajarPeso.descripcion, s: g.bajarPeso },
      { icon: ArrowDown, title: "Bajar las reps", subtitle: g.bajarReps.descripcion, s: g.bajarReps },
      { icon: Equal, title: "Dejar igual", subtitle: g.igual.descripcion, s: g.igual },
    ];
  } else {
    options = [
      { icon: Check, title: "Objetivo cumplido", subtitle: "Mantener para progresar", s: { kind: "igual", descripcion: "Mantener" } },
    ];
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="¿Y la próxima?">
      <div className="flex flex-col gap-2 pb-2">
        {esSustituto && (
          <p className="rounded-lg bg-[var(--primary-soft)] p-2 text-xs text-primary">
            Como entrenaste con un sustituto, no vamos a actualizar el
            objetivo del ejercicio original de tu rutina.
          </p>
        )}
        {options.map((o, i) => {
          const Icon = o.icon;
          return (
            <button
              key={i}
              onClick={() => {
                onPick(o.s);
                onClose();
              }}
              className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-primary/50"
            >
              <Icon className="h-5 w-5 flex-none text-primary" />
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold">{o.title}</span>
                <span className="text-xs text-muted-foreground">
                  {o.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}

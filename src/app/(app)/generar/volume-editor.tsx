"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Minus, Plus, Sliders } from "lucide-react";
import {
  MUSCLE_LABELS,
  MUSCLE_SLUGS,
  computeVolume,
  recommendVolume,
  type MuscleSlug,
  type VolumeMap,
} from "@/modules/routines/generator/volume";
import type {
  GeneratorConfig,
  RoutinePlan,
} from "@/modules/routines/generator/types";

type Props = {
  plan: RoutinePlan;
  config: GeneratorConfig;
  onApply: (target: VolumeMap) => void;
  pending?: boolean;
};

export function VolumeEditor({ plan, config, onApply, pending }: Props) {
  const [open, setOpen] = useState(false);
  const recomendado = useMemo(() => recommendVolume(config), [config]);
  const actual = useMemo(() => computeVolume(plan), [plan]);
  // Mínimo = compuestos por semana (no se tocan); clampea el stepper.
  const minimos = useMemo<VolumeMap>(() => {
    const semanas = Array.from(new Set(plan.dias.map((d) => d.semana))).length || 1;
    const perMuscleComp = {} as VolumeMap;
    for (const k of MUSCLE_SLUGS) perMuscleComp[k] = 0;
    for (const d of plan.dias) {
      for (const e of d.ejercicios) {
        if (e.tipo === "compuesto" && e.muscle_group_slug in perMuscleComp) {
          perMuscleComp[e.muscle_group_slug as MuscleSlug] += 1;
        }
      }
    }
    for (const k of MUSCLE_SLUGS) {
      if (k === "core") perMuscleComp[k] = 0;
      else perMuscleComp[k] = Math.round(perMuscleComp[k] / semanas);
    }
    return perMuscleComp;
  }, [plan]);
  const [target, setTarget] = useState<VolumeMap>(() => ({ ...actual }));

  // Si cambia el plan (se regeneró), resincronizar steppers.
  useEffect(() => {
    setTarget({ ...actual });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  function bump(k: MuscleSlug, delta: number) {
    setTarget((p) => {
      const next = { ...p };
      const max = k === "core" ? 3 : 8;
      const min = k === "core" ? 0 : minimos[k] ?? 0;
      next[k] = Math.max(min, Math.min(max, next[k] + delta));
      return next;
    });
  }
  function reset() {
    const safe = {} as VolumeMap;
    for (const k of MUSCLE_SLUGS) {
      safe[k] = k === "core" ? recomendado[k] : Math.max(minimos[k] ?? 0, recomendado[k]);
    }
    setTarget(safe);
  }

  const dirty = MUSCLE_SLUGS.some((k) => target[k] !== actual[k]);

  return (
    <section className="rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full min-h-12 items-center justify-between gap-2 px-4"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Sliders className="h-4 w-4 text-primary" />
          Ajustar volumen por grupo
        </span>
        <ChevronDown
          className={
            "h-4 w-4 text-muted-foreground transition " +
            (open ? "rotate-180" : "")
          }
        />
      </button>

      {open && (
        <div className="flex flex-col gap-3 p-4 pt-0">
          <p className="text-xs text-muted-foreground">
            Los compuestos principales no se tocan. Se agregan o remueven
            accesorios del grupo que elijas. Core se cuenta por día.
          </p>
          <ul className="flex flex-col gap-2">
            {MUSCLE_SLUGS.map((k) => (
              <li
                key={k}
                className="flex items-center justify-between rounded-xl border border-border bg-background p-2"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{MUSCLE_LABELS[k]}</span>
                  <span className="text-[11px] text-muted-foreground">
                    sugerido {recomendado[k]} · actual {actual[k]}
                    {k !== "core" && minimos[k] > 0
                      ? ` · mín ${minimos[k]} (compuestos)`
                      : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    aria-label={`-1 ${k}`}
                    onClick={() => bump(k, -1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center text-base font-bold tabular-nums">
                    {target[k]}
                  </span>
                  <button
                    aria-label={`+1 ${k}`}
                    onClick={() => bump(k, 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="min-h-11 flex-1 rounded-xl border border-border bg-card text-xs font-medium"
            >
              Volver al sugerido
            </button>
            <button
              onClick={() => onApply(target)}
              disabled={!dirty || pending}
              className="min-h-11 flex-1 rounded-xl bg-primary text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {pending ? "Aplicando…" : "Aplicar y regenerar"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

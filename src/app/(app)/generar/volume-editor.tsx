"use client";

import { useMemo, useState } from "react";
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
  const [target, setTarget] = useState<VolumeMap>(() => ({ ...actual }));

  function bump(k: MuscleSlug, delta: number) {
    setTarget((p) => {
      const next = { ...p };
      const max = k === "core" ? 3 : 8;
      next[k] = Math.max(0, Math.min(max, next[k] + delta));
      return next;
    });
  }
  function reset() {
    setTarget({ ...recomendado });
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
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    aria-label={`-1 ${k}`}
                    onClick={() => bump(k, -1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-base font-bold tabular-nums">
                    {target[k]}
                  </span>
                  <button
                    aria-label={`+1 ${k}`}
                    onClick={() => bump(k, 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
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

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, Check, Zap, Home, Dumbbell } from "lucide-react";
import {
  adjustVolume,
  previewPlan,
  savePlan,
} from "@/modules/routines/actions";
import type { VolumeMap } from "@/modules/routines/generator/volume";
import { VolumeEditor } from "./volume-editor";
import type {
  DiasSemana,
  Entorno,
  GeneratorConfig,
  Objetivo,
  RoutinePlan,
  Semanas,
} from "@/modules/routines/generator/types";
import type { Nivel } from "@/modules/exercises/types";

type Config = Partial<GeneratorConfig>;

const DIAS: DiasSemana[] = [2, 3, 4, 5];
const SEMANAS: Semanas[] = [1, 2, 3, 4];
const NIVELES: { v: Nivel; l: string }[] = [
  { v: "principiante", l: "Principiante" },
  { v: "intermedio", l: "Intermedio" },
  { v: "avanzado", l: "Avanzado" },
];
const OBJETIVOS: { v: Objetivo; l: string }[] = [
  { v: "hipertrofia", l: "Hipertrofia" },
  { v: "fuerza", l: "Fuerza" },
  { v: "general", l: "General" },
];

type Preset = {
  key: string;
  label: string;
  subtitle: string;
  cfg: GeneratorConfig;
};
const PRESETS: Preset[] = [
  {
    key: "fb2-ppte",
    label: "Full body · 2 días",
    subtitle: "Principiante · 2 sem · acondicionamiento",
    cfg: { diasPorSemana: 2, semanas: 2, nivel: "principiante", objetivo: "general" },
  },
  {
    key: "fb3-ppte",
    label: "Full body · 3 días",
    subtitle: "Principiante · 4 sem · hipertrofia",
    cfg: { diasPorSemana: 3, semanas: 4, nivel: "principiante", objetivo: "hipertrofia" },
  },
  {
    key: "ppl3-int",
    label: "Empuje / Tirón / Piernas · 3 días",
    subtitle: "Intermedio · 4 sem · hipertrofia",
    cfg: { diasPorSemana: 3, semanas: 4, nivel: "intermedio", objetivo: "hipertrofia" },
  },
  {
    key: "ul4-int",
    label: "Torso / Pierna · 4 días",
    subtitle: "Intermedio · 4 sem · hipertrofia",
    cfg: { diasPorSemana: 4, semanas: 4, nivel: "intermedio", objetivo: "hipertrofia" },
  },
  {
    key: "ppl5-av",
    label: "PPL + Torso/Pierna · 5 días",
    subtitle: "Avanzado · 4 sem · fuerza",
    cfg: { diasPorSemana: 5, semanas: 4, nivel: "avanzado", objetivo: "fuerza" },
  },
];

export function GenerarWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [cfg, setCfg] = useState<Config>({
    objetivo: "hipertrofia",
    entorno: "gimnasio",
  });
  const [plan, setPlan] = useState<RoutinePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const isFull =
    cfg.entorno && cfg.diasPorSemana && cfg.semanas && cfg.nivel && cfg.objetivo;

  function next() {
    setStep((s) => Math.min(s + 1, 5));
  }
  function prev() {
    if (step === 0) router.back();
    else setStep((s) => s - 1);
  }

  function generatePreview() {
    if (!isFull) return;
    setError(null);
    start(async () => {
      const res = await previewPlan(cfg as GeneratorConfig);
      if (!res.ok) setError(res.error);
      else {
        setPlan(res.data);
        setStep(5);
      }
    });
  }

  function regeneratePreview() {
    if (!isFull) return;
    start(async () => {
      const res = await previewPlan(
        cfg as GeneratorConfig,
        Math.floor(Math.random() * 2 ** 31),
      );
      if (res.ok) setPlan(res.data);
    });
  }

  function confirmSave() {
    if (!plan) return;
    start(async () => {
      const res = await savePlan(plan);
      if (!res.ok) setError(res.error);
      else router.push("/rutina");
    });
  }

  return (
    <div className="flex min-h-[70dvh] flex-col">
      <StepHeader step={step} />

      <div className="flex-1 px-4 pb-4">
        {step === 0 && (
          <Step title="¿Dónde vas a entrenar?">
            <div className="flex flex-col gap-3">
              <BigPick
                active={cfg.entorno === "gimnasio"}
                onClick={() => {
                  setCfg({ ...cfg, entorno: "gimnasio" });
                  next();
                }}
                vertical
              >
                <span className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">En el gimnasio</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  Barras, máquinas, poleas, mancuernas, etc.
                </span>
              </BigPick>
              <BigPick
                active={cfg.entorno === "casa"}
                onClick={() => {
                  setCfg({ ...cfg, entorno: "casa" });
                  next();
                }}
                vertical
              >
                <span className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">En casa</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  Peso corporal y mancuernas (o botellas / mochila).
                </span>
              </BigPick>
            </div>
          </Step>
        )}

        {step === 1 && (
          <Step title="¿Cuántos días por semana vas a entrenar?">
            {cfg.entorno === "gimnasio" && (
              <section className="flex flex-col gap-2">
                <h3 className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  O elegí una plantilla
                </h3>
                <div className="flex flex-col gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => {
                        setCfg({ ...p.cfg, entorno: "gimnasio" });
                        start(async () => {
                          const res = await previewPlan({ ...p.cfg, entorno: "gimnasio" });
                          if (!res.ok) setError(res.error);
                          else {
                            setPlan(res.data);
                            setStep(5);
                          }
                        });
                      }}
                      className="flex flex-col items-start rounded-xl border border-border bg-card p-3 text-left hover:border-primary/50"
                    >
                      <span className="text-sm font-semibold">{p.label}</span>
                      <span className="text-xs text-muted-foreground">{p.subtitle}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {cfg.entorno === "gimnasio" && (
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />o armá uno<div className="h-px flex-1 bg-border" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {DIAS.map((d) => (
                <BigPick
                  key={d}
                  active={cfg.diasPorSemana === d}
                  onClick={() => {
                    setCfg({ ...cfg, diasPorSemana: d });
                    next();
                  }}
                >
                  <span className="text-3xl font-bold tabular-nums">{d}</span>
                  <span className="text-xs text-muted-foreground">días</span>
                </BigPick>
              ))}
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step title="¿Cuántas semanas dura el plan?">
            <div className="grid grid-cols-2 gap-3">
              {SEMANAS.map((s) => (
                <BigPick
                  key={s}
                  active={cfg.semanas === s}
                  onClick={() => {
                    setCfg({ ...cfg, semanas: s });
                    next();
                  }}
                >
                  <span className="text-3xl font-bold tabular-nums">{s}</span>
                  <span className="text-xs text-muted-foreground">
                    {s === 1 ? "semana" : "semanas"}
                  </span>
                </BigPick>
              ))}
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step title="¿Cuál es tu nivel?">
            <div className="flex flex-col gap-3">
              {NIVELES.map((n) => (
                <BigPick
                  key={n.v}
                  active={cfg.nivel === n.v}
                  onClick={() => {
                    setCfg({ ...cfg, nivel: n.v });
                    next();
                  }}
                  vertical
                >
                  <span className="text-lg font-semibold">{n.l}</span>
                </BigPick>
              ))}
            </div>
          </Step>
        )}

        {step === 4 && (
          <Step title="¿Cuál es tu objetivo?">
            <div className="flex flex-col gap-3">
              {OBJETIVOS.map((o) => (
                <BigPick
                  key={o.v}
                  active={cfg.objetivo === o.v}
                  onClick={() => {
                    setCfg({ ...cfg, objetivo: o.v });
                    generatePreview();
                  }}
                  vertical
                >
                  <span className="text-lg font-semibold">{o.l}</span>
                </BigPick>
              ))}
            </div>
          </Step>
        )}

        {step === 5 && plan && (
          <div className="flex flex-col gap-4">
            <header className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Previsualización</h2>
              <p className="text-sm text-muted-foreground">{plan.split}</p>
            </header>

            <VolumeEditor
              plan={plan}
              config={cfg as GeneratorConfig}
              pending={pending}
              onApply={(target: VolumeMap) => {
                start(async () => {
                  const r = await adjustVolume(
                    plan,
                    target,
                    undefined,
                    cfg.entorno ?? "gimnasio",
                  );
                  if (r.ok) setPlan(r.data);
                });
              }}
            />

            <div className="flex flex-col gap-4">
              {groupBySemana(plan).map(([sem, dias]) => (
                <section key={sem} className="flex flex-col gap-2">
                  <h3 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Semana {sem}
                  </h3>
                  {dias.map((d) => (
                    <article
                      key={d.nombre}
                      className="rounded-2xl border border-border bg-card p-3"
                    >
                      <h4 className="mb-2 text-sm font-semibold">
                        {d.split_label}
                      </h4>
                      <ul className="flex flex-col gap-1">
                        {d.ejercicios.map((e) => (
                          <li
                            key={e.exercise_slug + e.orden}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="truncate pr-2">{e.nombre}</span>
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {e.tipo_registro === "tiempo"
                                ? `${e.series}×${e.duracion_seg}s`
                                : `${e.series}×${e.reps_min}-${e.reps_max}`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </section>
              ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="sticky bottom-20 mt-2 flex flex-col gap-2 bg-background py-2">
              <button
                onClick={confirmSave}
                disabled={pending}
                className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-[var(--primary-strong)] disabled:opacity-60"
              >
                <Check className="h-5 w-5" />
                {pending ? "Guardando..." : "Guardar y empezar"}
              </button>
              <button
                onClick={regeneratePreview}
                disabled={pending}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                Volver a generar
              </button>
            </div>
          </div>
        )}
      </div>

      {step < 5 && (
        <div className="sticky bottom-20 flex items-center justify-between gap-2 border-t border-border bg-background px-4 py-3">
          <button
            onClick={prev}
            className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? "Volver" : "Atrás"}
          </button>
          {pending && (
            <span className="text-xs text-muted-foreground">Generando…</span>
          )}
          {step < 4 && (
            <button
              onClick={next}
              disabled={!currentStepValue(step, cfg)}
              className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-strong)] disabled:opacity-60"
            >
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function currentStepValue(step: number, cfg: Config): unknown {
  if (step === 0) return cfg.entorno;
  if (step === 1) return cfg.diasPorSemana;
  if (step === 2) return cfg.semanas;
  if (step === 3) return cfg.nivel;
  if (step === 4) return cfg.objetivo;
  return true;
}

function StepHeader({ step }: { step: number }) {
  const titles = ["Entorno", "Días", "Semanas", "Nivel", "Objetivo", "Preview"];
  return (
    <header className="flex flex-col gap-3 px-4 pb-4 pt-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Paso {Math.min(step + 1, 6)} de 6
        </span>
        <span>{titles[step]}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((step + 1) / 6) * 100}%` }}
        />
      </div>
    </header>
  );
}

function Step({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

function BigPick({
  active,
  onClick,
  children,
  vertical = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  vertical?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        vertical
          ? "flex min-h-16 items-center justify-center rounded-2xl border text-center transition"
          : "flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border text-center transition",
        active
          ? "border-primary bg-[var(--primary-soft)] text-primary"
          : "border-border bg-card text-foreground hover:border-primary/50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function groupBySemana(plan: RoutinePlan): [number, RoutinePlan["dias"]][] {
  const m = new Map<number, RoutinePlan["dias"]>();
  for (const d of plan.dias) {
    const arr = m.get(d.semana) ?? [];
    arr.push(d);
    m.set(d.semana, arr);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
  Zap,
  Home,
  Dumbbell,
  HandMetal,
  Flame,
  Trophy,
  Heart,
  Rocket,
  Volume2,
  VolumeX,
} from "lucide-react";
import { GYM_EQUIPMENT_CHOICES, CASA_EXTRAS } from "@/modules/routines/generator/types";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/button";
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

const DIAS: DiasSemana[] = [2, 3, 4, 5, 6];
const SEMANAS: Semanas[] = [1, 2, 3, 4];
type Pick<V> = {
  v: V;
  l: string;
  icon: LucideIcon;
  tag: string;
  chips: string[];
};

const OBJETIVOS: Pick<Objetivo>[] = [
  {
    v: "hipertrofia",
    l: "Hipertrofia",
    icon: Dumbbell,
    tag: "Ganar músculo",
    chips: ["6–15 reps", "Descanso medio"],
  },
  {
    v: "fuerza",
    l: "Fuerza",
    icon: Trophy,
    tag: "Levantar más peso",
    chips: ["3–6 reps", "Descanso largo"],
  },
  {
    v: "perdida_grasa",
    l: "Pérdida de grasa",
    icon: Flame,
    tag: "Quemar grasa, mantener músculo",
    chips: ["10–20 reps", "Descanso corto"],
  },
  {
    v: "rendimiento_deportivo",
    l: "Rendimiento deportivo",
    icon: Rocket,
    tag: "Potencia y explosividad",
    chips: ["Series cortas", "Movimientos rápidos"],
  },
  {
    v: "general",
    l: "Acondicionamiento",
    icon: Heart,
    tag: "Salud y estar en forma",
    chips: ["Variado", "Sostenible", "Recomendado si recién empezás"],
  },
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

export function GenerarWizard({
  nivelInicial,
  objetivoInicial,
}: {
  nivelInicial: Nivel;
  objetivoInicial: Objetivo;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [cfg, setCfg] = useState<Config>({
    objetivo: objetivoInicial,
    entorno: "gimnasio",
    nivel: nivelInicial,
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

  function togglePref(slug: string) {
    const current = cfg.equipmentPreferences ?? [];
    const has = current.includes(slug);
    const nextList = has
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    setCfg({ ...cfg, equipmentPreferences: nextList });
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
                  setCfg({
                    ...cfg,
                    entorno: "gimnasio",
                    equipmentPreferences: [],
                    avoidPlyo: false,
                  });
                  next();
                }}
                vertical
              >
                <span className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">En el gimnasio</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  Barras, máquinas, poleas, mancuernas y bancos.
                </span>
              </BigPick>
              <BigPick
                active={cfg.entorno === "casa"}
                onClick={() => {
                  setCfg({
                    ...cfg,
                    entorno: "casa",
                    equipmentPreferences: [],
                    avoidPlyo: false,
                  });
                  next();
                }}
                vertical
              >
                <span className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">
                    En casa con mancuernas
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  Peso corporal + mancuernas (o botellas / mochila) + banco.
                </span>
              </BigPick>
              <BigPick
                active={cfg.entorno === "casa_sin_equipo"}
                onClick={() => {
                  setCfg({
                    ...cfg,
                    entorno: "casa_sin_equipo",
                    equipmentPreferences: [],
                    avoidPlyo: false,
                  });
                  next();
                }}
                vertical
              >
                <span className="flex items-center gap-2">
                  <HandMetal className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">
                    En casa sin equipo
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  Sólo peso corporal: flexiones, sentadillas, saltos.
                </span>
              </BigPick>
            </div>
          </Step>
        )}

        {step === 1 && (
          <Step
            title={
              cfg.entorno === "gimnasio"
                ? "¿Con qué equipos te gusta entrenar?"
                : cfg.entorno === "casa"
                  ? "¿Tenés algo más en casa?"
                  : "¿Algo que preferís evitar?"
            }
          >
            {cfg.entorno === "gimnasio" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Elegí los que más usás y vamos a priorizarlos. Si no marcás
                  ninguno, variamos entre todos.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {GYM_EQUIPMENT_CHOICES.map((eq) => {
                    const active =
                      cfg.equipmentPreferences?.includes(eq.slug) ?? false;
                    return (
                      <button
                        key={eq.slug}
                        type="button"
                        onClick={() => togglePref(eq.slug)}
                        className={[
                          "flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-medium transition",
                          active
                            ? "border-primary bg-[var(--primary-soft)] text-primary"
                            : "border-border bg-card text-foreground hover:border-primary/50",
                        ].join(" ")}
                      >
                        <span>{eq.label}</span>
                        {active && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {cfg.entorno === "casa" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Siempre podés hacer peso corporal + mancuernas + banco.
                  Marcá sólo lo que realmente tengas a mano para incluirlo.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {CASA_EXTRAS.map((slug) => {
                    const active =
                      cfg.equipmentPreferences?.includes(slug) ?? false;
                    const label =
                      slug === "banda"
                        ? "Banda elástica"
                        : slug === "kettlebell"
                          ? "Kettlebell"
                          : "Barra de dominadas";
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => togglePref(slug)}
                        className={[
                          "flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-medium transition",
                          active
                            ? "border-primary bg-[var(--primary-soft)] text-primary"
                            : "border-border bg-card text-foreground hover:border-primary/50",
                        ].join(" ")}
                      >
                        <span>{label}</span>
                        {active && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {cfg.entorno === "casa_sin_equipo" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Si vivís en depto o tenés articulaciones sensibles,
                  podés evitar saltos y plyometría.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setCfg({ ...cfg, avoidPlyo: !cfg.avoidPlyo })
                  }
                  className={[
                    "flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
                    cfg.avoidPlyo
                      ? "border-primary bg-[var(--primary-soft)] text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/50",
                  ].join(" ")}
                >
                  {cfg.avoidPlyo ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">
                      Evitar saltos / plyo
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {cfg.avoidPlyo
                        ? "No vamos a incluir ejercicios con impacto."
                        : "Vamos a incluirlos cuando corresponda."}
                    </span>
                  </span>
                </button>
              </div>
            )}
          </Step>
        )}

        {step === 2 && (
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
                        const merged = {
                          ...p.cfg,
                          entorno: "gimnasio" as const,
                          equipmentPreferences: cfg.equipmentPreferences,
                        };
                        setCfg(merged);
                        start(async () => {
                          const res = await previewPlan(merged);
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {DIAS.map((d) => {
                const rec = cfg.nivel === "principiante" && d === 3;
                return (
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
                    {rec && (
                      <span className="mt-1 rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Recomendado
                      </span>
                    )}
                  </BigPick>
                );
              })}
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step title="¿Cuántas semanas dura el plan?">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SEMANAS.map((s) => {
                const rec = cfg.nivel === "principiante" && s === 4;
                return (
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
                    {rec && (
                      <span className="mt-1 rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Recomendado
                      </span>
                    )}
                  </BigPick>
                );
              })}
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
                  onClick={() => setCfg({ ...cfg, objetivo: o.v })}
                  vertical
                >
                  <PickBody
                    icon={o.icon}
                    title={o.l}
                    tag={o.tag}
                    chips={o.chips}
                  />
                </BigPick>
              ))}
              <p className="px-1 text-xs text-muted-foreground">
                Elegí uno y confirmá para generar la rutina.
              </p>
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
                  {dias.map((d) => {
                    const warmup = d.ejercicios.slice(0, 3);
                    const finisher = d.ejercicios.slice(-2);
                    const main = d.ejercicios.slice(3, d.ejercicios.length - 2);
                    const renderRow = (e: typeof d.ejercicios[number]) => (
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
                    );
                    return (
                      <article
                        key={d.nombre}
                        className="rounded-2xl border border-border bg-card p-3"
                      >
                        <h4 className="mb-2 text-sm font-semibold">
                          {d.split_label}
                        </h4>
                        <h5 className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          Entrada en calor · colchoneta
                        </h5>
                        <ul className="mb-2 flex flex-col gap-1">
                          {warmup.map(renderRow)}
                        </ul>
                        <h5 className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          Rutina
                        </h5>
                        <ul className="mb-2 flex flex-col gap-1">
                          {main.map(renderRow)}
                        </ul>
                        <h5 className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          Abdomen final · colchoneta
                        </h5>
                        <ul className="flex flex-col gap-1">
                          {finisher.map(renderRow)}
                        </ul>
                      </article>
                    );
                  })}
                </section>
              ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="sticky bottom-20 mt-2 flex flex-col gap-2 bg-background py-2">
              <Button
                size="lg"
                onClick={confirmSave}
                loading={pending}
                loadingText="Guardando..."
              >
                {!pending && <Check className="h-5 w-5" />}
                Guardar y empezar
              </Button>
              <Button
                variant="outline"
                onClick={regeneratePreview}
                disabled={pending}
              >
                <Sparkles className="h-4 w-4 text-primary" />
                Volver a generar
              </Button>
            </div>
          </div>
        )}
      </div>

      {step < 5 && (
        <div className="sticky bottom-20 flex items-center justify-between gap-2 border-t border-border bg-background px-4 py-3">
          <Button variant="outline" onClick={prev} disabled={pending}>
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? "Volver" : "Atrás"}
          </Button>
          {step < 4 && (
            <Button
              onClick={next}
              disabled={!currentStepValue(step, cfg)}
            >
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {step === 4 && (
            <Button
              onClick={generatePreview}
              disabled={!cfg.objetivo}
              loading={pending}
              loadingText="Generando…"
            >
              {!pending && <Check className="h-4 w-4" />}
              Confirmar y generar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function currentStepValue(step: number, cfg: Config): unknown {
  if (step === 0) return cfg.entorno;
  if (step === 1) return true; // preferencias es opcional
  if (step === 2) return cfg.diasPorSemana;
  if (step === 3) return cfg.semanas;
  if (step === 4) return cfg.objetivo;
  return true;
}

function StepHeader({ step }: { step: number }) {
  const titles = [
    "Entorno",
    "Preferencias",
    "Días",
    "Semanas",
    "Objetivo",
    "Preview",
  ];
  return (
    <header className="flex flex-col gap-3 px-4 pb-4 pt-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Paso {Math.min(step + 1, 6)} de 6</span>
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

function PickBody({
  icon: Icon,
  title,
  tag,
  chips,
}: {
  icon: LucideIcon;
  title: string;
  tag: string;
  chips: string[];
}) {
  return (
    <span className="flex w-full items-center gap-3 px-4 py-3 text-left">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-base font-semibold">{title}</span>
        </span>
        <span className="truncate text-xs font-normal text-muted-foreground">
          {tag}
        </span>
        <span className="flex flex-wrap gap-1 pt-0.5">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {c}
            </span>
          ))}
        </span>
      </span>
    </span>
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

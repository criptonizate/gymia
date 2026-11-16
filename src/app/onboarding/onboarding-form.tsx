"use client";

import { useState, useTransition } from "react";
import { Baby, Medal, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/button";
import { saveOnboarding } from "./actions";

type NivelPick = {
  v: "principiante" | "intermedio" | "avanzado";
  l: string;
  icon: LucideIcon;
  tag: string;
  chips: string[];
};

const NIVELES: NivelPick[] = [
  {
    v: "principiante",
    l: "Principiante",
    icon: Baby,
    tag: "Aprendiendo la técnica",
    chips: ["0–6 meses", "Sin ejercicios complejos"],
  },
  {
    v: "intermedio",
    l: "Intermedio",
    icon: Medal,
    tag: "Técnica sólida en los básicos",
    chips: ["6+ meses", "Entiendo RIR/cargas"],
  },
  {
    v: "avanzado",
    l: "Avanzado",
    icon: Trophy,
    tag: "Dominio total y variantes exigentes",
    chips: ["1+ año", "Variantes avanzadas"],
  },
];

export function OnboardingForm({ nombreInicial }: { nombreInicial: string }) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [nivel, setNivel] = useState<string>("");
  const [pending, start] = useTransition();

  const puedeEnviar = nombre.trim() && nivel;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(() => saveOnboarding(fd));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <label className="text-sm text-muted-foreground">Tu nombre</label>
        <input
          name="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Juan"
          required
          className="min-h-12 rounded-xl border border-border bg-card px-4 text-base outline-none focus:border-primary"
        />
        <p className="text-xs text-muted-foreground">
          Lo usamos sólo para saludarte en la app.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm text-muted-foreground">Tu nivel</h2>
        <input type="hidden" name="nivel" value={nivel} />
        <div className="flex flex-col gap-3">
          {NIVELES.map((n) => {
            const active = nivel === n.v;
            const Icon = n.icon;
            return (
              <button
                key={n.v}
                type="button"
                onClick={() => setNivel(n.v)}
                className={[
                  "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                  active
                    ? "border-primary bg-[var(--primary-soft)] text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/50",
                ].join(" ")}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-base font-semibold">
                    {n.l}
                  </span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {n.tag}
                  </span>
                  <span className="flex flex-wrap gap-1 pt-0.5">
                    {n.chips.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {c}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="px-1 text-xs text-muted-foreground">
          Si todavía hay movimientos que no dominás, elegí un nivel más bajo.
          Podés cambiarlo luego desde &quot;Mi cuenta&quot;.
        </p>
      </section>

      <Button
        type="submit"
        size="lg"
        disabled={!puedeEnviar}
        loading={pending}
        loadingText="Guardando..."
        className="mt-4"
      >
        Empezar
      </Button>
    </form>
  );
}

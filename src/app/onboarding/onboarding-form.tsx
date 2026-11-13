"use client";

import { useState, useTransition } from "react";
import { saveOnboarding } from "./actions";

const NIVELES = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
] as const;

const OBJETIVOS = [
  { value: "hipertrofia", label: "Hipertrofia" },
  { value: "fuerza", label: "Fuerza" },
  { value: "general", label: "General" },
] as const;

export function OnboardingForm({ nombreInicial }: { nombreInicial: string }) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [nivel, setNivel] = useState<string>("");
  const [objetivo, setObjetivo] = useState<string>("");
  const [pending, start] = useTransition();

  const puedeEnviar = nombre.trim() && nivel && objetivo;

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
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm text-muted-foreground">Tu nivel</h2>
        <input type="hidden" name="nivel" value={nivel} />
        <div className="grid grid-cols-3 gap-2">
          {NIVELES.map((n) => (
            <Chip
              key={n.value}
              active={nivel === n.value}
              onClick={() => setNivel(n.value)}
            >
              {n.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm text-muted-foreground">Tu objetivo</h2>
        <input type="hidden" name="objetivo" value={objetivo} />
        <div className="grid grid-cols-3 gap-2">
          {OBJETIVOS.map((o) => (
            <Chip
              key={o.value}
              active={objetivo === o.value}
              onClick={() => setObjetivo(o.value)}
            >
              {o.label}
            </Chip>
          ))}
        </div>
      </section>

      <button
        type="submit"
        disabled={!puedeEnviar || pending}
        className="mt-4 min-h-14 rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-[var(--primary-strong)] disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Empezar"}
      </button>
    </form>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "min-h-12 rounded-xl border px-3 text-sm font-medium transition",
        active
          ? "border-primary bg-[var(--primary-soft)] text-primary"
          : "border-border bg-card text-foreground hover:border-primary/50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

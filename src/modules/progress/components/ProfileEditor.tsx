"use client";

import { useState, useTransition } from "react";
import { Check, Pencil } from "lucide-react";
import { saveProfile } from "@/modules/progress/actions";
import type { Nivel, Objetivo, Profile } from "@/lib/supabase/profile";

type Props = { profile: Profile };

const NIVEL: { v: Nivel; l: string }[] = [
  { v: "principiante", l: "Principiante" },
  { v: "intermedio", l: "Intermedio" },
  { v: "avanzado", l: "Avanzado" },
];
const OBJ: { v: Objetivo; l: string }[] = [
  { v: "hipertrofia", l: "Hipertrofia" },
  { v: "fuerza", l: "Fuerza" },
  { v: "perdida_grasa", l: "Pérdida de grasa" },
  { v: "rendimiento_deportivo", l: "Rendimiento deportivo" },
  { v: "general", l: "General" },
];

export function ProfileEditor({ profile }: Props) {
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(profile.nombre ?? "");
  const [nivel, setNivel] = useState<Nivel>(profile.nivel ?? "intermedio");
  const [objetivo, setObjetivo] = useState<Objetivo>(
    profile.objetivo ?? "hipertrofia",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const r = await saveProfile({ nombre, nivel, objetivo });
      if (!r.ok) setError(r.error);
      else setEditing(false);
    });
  }

  if (!editing) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Perfil</h2>
          <button
            onClick={() => setEditing(true)}
            className="flex min-h-10 items-center gap-1 rounded-full border border-border bg-background px-3 text-xs"
          >
            <Pencil className="h-3.5 w-3.5 text-primary" />
            Editar
          </button>
        </div>
        <Row label="Nombre" value={profile.nombre ?? "—"} />
        <Row label="Nivel" value={labelFromList(NIVEL, profile.nivel)} />
        <Row label="Objetivo" value={labelFromList(OBJ, profile.objetivo)} />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground">Perfil</h2>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Nombre</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="min-h-12 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
      </label>
      <Chips
        label="Nivel"
        options={NIVEL.map((n) => ({ v: n.v, l: n.l }))}
        value={nivel}
        onChange={(v) => setNivel(v as Nivel)}
      />
      <Chips
        label="Objetivo"
        options={OBJ.map((n) => ({ v: n.v, l: n.l }))}
        value={objetivo}
        onChange={(v) => setObjetivo(v as Objetivo)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => setEditing(false)}
          className="min-h-12 flex-1 rounded-xl border border-border bg-background text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          onClick={save}
          disabled={pending}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function Chips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={
              "min-h-11 rounded-xl border px-2 text-xs font-medium " +
              (value === o.v
                ? "border-primary bg-[var(--primary-soft)] text-primary"
                : "border-border bg-background")
            }
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function labelFromList(
  list: { v: string; l: string }[],
  v: string | null,
): string {
  return list.find((x) => x.v === v)?.l ?? "—";
}

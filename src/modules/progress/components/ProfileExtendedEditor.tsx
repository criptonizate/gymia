"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, UserCog } from "lucide-react";
import { Button } from "@/components/button";
import { saveProfile } from "@/modules/progress/actions";
import type { Profile, Sexo } from "@/lib/supabase/profile";

const SEXO_OPTIONS: { v: Sexo; l: string }[] = [
  { v: "masculino", l: "Masculino" },
  { v: "femenino", l: "Femenino" },
  { v: "otro", l: "Otro / Prefiero no decir" },
];

const GRUPOS = [
  "pecho", "espalda", "hombros", "biceps", "triceps",
  "cuadriceps", "isquios", "gluteos", "gemelos", "core",
];

const DEPORTES = [
  "futbol", "padel", "running", "ciclismo", "natacion",
  "basquet", "tenis", "yoga", "boxeo", "otro",
];

const LIMITACIONES_COMUNES = [
  "hombro", "codo", "muñeca", "lumbar", "rodilla", "tobillo", "cadera",
];

export function ProfileExtendedEditor({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [edad, setEdad] = useState<string>(profile.edad?.toString() ?? "");
  const [sexo, setSexo] = useState<Sexo | "">(profile.sexo ?? "");
  const [altura, setAltura] = useState<string>(
    profile.altura_cm?.toString() ?? "",
  );
  const [duracion, setDuracion] = useState<string>(
    profile.duracion_sesion_min?.toString() ?? "",
  );
  const [limitaciones, setLimitaciones] = useState<string[]>(
    profile.limitaciones ?? [],
  );
  const [prioritarios, setPrioritarios] = useState<string[]>(
    profile.grupos_prioritarios ?? [],
  );
  const [deportes, setDeportes] = useState<string[]>(
    profile.otros_deportes ?? [],
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(list: string[], v: string, set: (x: string[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  function save() {
    setError(null);
    start(async () => {
      const r = await saveProfile({
        edad: edad === "" ? null : Number(edad),
        sexo: sexo === "" ? null : sexo,
        altura_cm: altura === "" ? null : Number(altura),
        duracion_sesion_min: duracion === "" ? null : Number(duracion),
        limitaciones,
        grupos_prioritarios: prioritarios,
        otros_deportes: deportes,
      });
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <UserCog className="h-4 w-4 text-primary" />
          Perfil extendido (opcional)
        </span>
        <ChevronDown
          className={"h-4 w-4 text-muted-foreground " + (open ? "rotate-180" : "")}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Ayudan a personalizar mejor la rutina. Todo es opcional.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Edad">
              <input
                type="number"
                inputMode="numeric"
                min="10"
                max="100"
                value={edad}
                onChange={(e) => setEdad(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-border bg-background px-2 text-base tabular-nums outline-none focus:border-primary"
              />
            </Labelled>
            <Labelled label="Altura (cm)">
              <input
                type="number"
                inputMode="numeric"
                min="100"
                max="230"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-border bg-background px-2 text-base tabular-nums outline-none focus:border-primary"
              />
            </Labelled>
          </div>

          <Labelled label="Sexo">
            <select
              value={sexo}
              onChange={(e) => setSexo(e.target.value as Sexo)}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-2 text-base outline-none focus:border-primary"
            >
              <option value="">—</option>
              {SEXO_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          </Labelled>

          <Labelled label="Duración por sesión (min)">
            <input
              type="number"
              inputMode="numeric"
              min="20"
              max="180"
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-2 text-base tabular-nums outline-none focus:border-primary"
            />
          </Labelled>

          <Multi
            label="Grupos a priorizar"
            options={GRUPOS}
            selected={prioritarios}
            onToggle={(v) => toggle(prioritarios, v, setPrioritarios)}
          />
          <Multi
            label="Lesiones o molestias"
            options={LIMITACIONES_COMUNES}
            selected={limitaciones}
            onToggle={(v) => toggle(limitaciones, v, setLimitaciones)}
          />
          <Multi
            label="Otros deportes"
            options={DEPORTES}
            selected={deportes}
            onToggle={(v) => toggle(deportes, v, setDeportes)}
          />

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={save}
            loading={pending}
            loadingText="Guardando…"
          >
            {!pending && <Check className="h-4 w-4" />}
            Guardar
          </Button>
        </div>
      )}
    </section>
  );
}

function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Multi({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              onClick={() => onToggle(o)}
              className={
                "min-h-9 rounded-full border px-3 py-1 text-xs capitalize " +
                (on
                  ? "border-primary bg-[var(--primary-soft)] text-primary"
                  : "border-border bg-background text-muted-foreground")
              }
            >
              {o.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

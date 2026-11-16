"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";

const TERMS: { term: string; def: string }[] = [
  {
    term: "Serie",
    def: "Un grupo de repeticiones seguidas del mismo ejercicio. Ej.: 10 flexiones seguidas = 1 serie.",
  },
  {
    term: "Repetición (rep)",
    def: "Cada vez que hacés el movimiento completo del ejercicio (bajar y subir).",
  },
  {
    term: "RIR",
    def: "Reps In Reserve: cuántas repeticiones te quedaban antes de llegar al fallo. RIR 2 = podías hacer 2 más.",
  },
  {
    term: "RPE",
    def: "Rate of Perceived Exertion: cuán duro se sintió del 1 al 10. RPE 8 ≈ RIR 2.",
  },
  {
    term: "Hipertrofia",
    def: "Objetivo de ganar músculo. Rangos típicos: 6–15 reps con 1–3 min de descanso.",
  },
  {
    term: "Fuerza",
    def: "Objetivo de levantar más peso. Rangos típicos: 3–6 reps con 2–5 min de descanso.",
  },
  {
    term: "Compuesto",
    def: "Ejercicio que involucra varias articulaciones y músculos (sentadilla, press banca).",
  },
  {
    term: "Aislamiento",
    def: "Ejercicio que trabaja un solo músculo (curl de bíceps, extensiones de pierna).",
  },
  {
    term: "Bisagra (hip hinge)",
    def: "Patrón de inclinar el torso hacia adelante llevando la cadera atrás (peso muerto, buenos días).",
  },
  {
    term: "Superserie",
    def: "Dos ejercicios hechos seguidos sin descanso entre medio.",
  },
  {
    term: "Volumen",
    def: "La cantidad total de trabajo: series × reps × peso. Más volumen = más estímulo.",
  },
  {
    term: "Deload",
    def: "Semana de descarga: menos peso o volumen para que el cuerpo se recupere.",
  },
  {
    term: "1RM",
    def: "One Rep Max: el peso máximo que podés levantar una sola vez. Se puede estimar sin hacerlo.",
  },
  {
    term: "Split",
    def: "Cómo se reparte la rutina en la semana (Full body, PPL, Torso/Pierna…).",
  },
  {
    term: "AMRAP",
    def: "As Many Reps As Possible: hacer tantas reps como puedas en un set.",
  },
];

export function GlossaryCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left"
      >
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[var(--primary-soft)] text-primary">
          <BookOpen className="h-5 w-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-sm font-semibold">Glosario</span>
          <span className="text-xs text-muted-foreground">
            RIR, serie, bisagra, superserie, deload… explicado simple.
          </span>
        </div>
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Glosario">
        <ul className="flex flex-col gap-3 pb-2">
          {TERMS.map((t) => (
            <li
              key={t.term}
              className="rounded-xl border border-border bg-background p-3"
            >
              <div className="text-sm font-semibold">{t.term}</div>
              <div className="text-xs text-muted-foreground">{t.def}</div>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </>
  );
}

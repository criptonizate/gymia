"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

type Step = { title: string; body: string; emoji: string };

const STEPS: Step[] = [
  {
    emoji: "🎯",
    title: "Modo focus",
    body:
      "Una serie por pantalla. Elegís peso y reps, marcás, y la app arranca el descanso sola.",
  },
  {
    emoji: "⏱️",
    title: "Descanso automático",
    body:
      "Al marcar la serie, aparece arriba el timer de descanso. Podés agregar +15 seg o saltarlo si estás listo.",
  },
  {
    emoji: "👉",
    title: "Mirar el próximo",
    body:
      "Mientras descansás, podés usar Anterior/Siguiente abajo para ver qué viene. El timer sigue corriendo.",
  },
  {
    emoji: "🔊",
    title: "Narración (opcional)",
    body:
      "Tocá el altavoz en el header para que la app te avise con voz cuando termina el descanso.",
  },
  {
    emoji: "💡",
    title: "RIR",
    body:
      "RIR = Reps In Reserve: cuántas reps te quedaban antes de llegar al fallo. RIR 2 ≈ podías 2 más.",
  },
];

export function FocusTutorial({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/70 p-4 sm:p-6">
      <div className="flex max-h-[90dvh] max-w-sm flex-col gap-4 overflow-y-auto rounded-3xl border border-border bg-background p-5 sm:p-6">
        <div className="text-5xl">{step.emoji}</div>
        <h2 className="text-xl font-bold">{step.title}</h2>
        <p className="text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {STEPS.map((_, k) => (
              <span
                key={k}
                className={`h-1.5 w-6 rounded-full ${
                  k === i ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          {last ? (
            <button
              onClick={onClose}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <Check className="h-4 w-4" />
              Listo
            </button>
          ) : (
            <button
              onClick={() => setI((k) => k + 1)}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

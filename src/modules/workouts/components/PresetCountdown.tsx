"use client";

import { useEffect, useRef, useState } from "react";
import { beep } from "./beep";

type Props = { seconds: number; onDone: () => void; onCancel: () => void };

export function PresetCountdown({ seconds, onDone, onCancel }: Props) {
  const [n, setN] = useState(seconds);
  // Ref para no reiniciar el effect ni rebeeppear cuando el padre se
  // re-renderiza con un onDone inline nuevo.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (n <= 0) {
      beep(220, 1000);
      onDoneRef.current();
      return;
    }
    beep(60, 660);
    const t = setTimeout(() => setN((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [n]);

  return (
    <div
      className="fixed inset-0 z-[85] flex flex-col items-center justify-center gap-6 bg-background/95"
      onClick={onCancel}
      role="button"
      aria-label="Cancelar cuenta previa"
    >
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        Prepará la próxima serie
      </span>
      <span className="text-9xl font-extrabold tabular-nums text-primary">
        {n}
      </span>
      <span className="text-xs text-muted-foreground">Tocá para saltear</span>
    </div>
  );
}

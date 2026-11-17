"use client";

import { useEffect, useRef, useState } from "react";
import { beep } from "./beep";

type Props = { seconds: number; onDone: () => void; onCancel: () => void };

export function PresetCountdown({ seconds, onDone, onCancel }: Props) {
  const [n, setN] = useState(seconds);
  const startRef = useRef<number | null>(null);
  const lastBeepRef = useRef<number>(seconds + 1);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (startRef.current == null) startRef.current = Date.now();
    let raf = 0;
    function tick() {
      const elapsed = Math.floor(
        (Date.now() - (startRef.current ?? Date.now())) / 1000,
      );
      const left = Math.max(0, seconds - elapsed);
      setN(left);
      // Beep sólo al cambiar de número hacia abajo.
      if (left < lastBeepRef.current && left > 0) {
        lastBeepRef.current = left;
        beep(60, 660);
      }
      if (left <= 0) {
        beep(220, 1000);
        onDoneRef.current();
        return;
      }
      raf = window.setTimeout(tick, 150) as unknown as number;
    }
    tick();
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearTimeout(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [seconds]);

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

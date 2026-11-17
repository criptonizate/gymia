"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, SkipForward, X } from "lucide-react";
import { beep, vibrate } from "./beep";

type Props = {
  seconds: number;
  onDone: () => void;
  onDismiss: () => void;
};

export function RestTimer({ seconds, onDone, onDismiss }: Props) {
  // Anclamos un deadline absoluto en vez de contar con setInterval 1s:
  // así, cuando iOS/Safari throttlea la tab en background, al volver
  // calculamos remaining = (deadline - now) y los segundos no se pierden.
  const [deadline, setDeadline] = useState(() => Date.now() + seconds * 1000);
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Si el padre dispara un rest nuevo con el componente ya montado,
  // reseteamos deadline. También re-sincronizamos cuando vuelve la tab.
  useEffect(() => {
    setDeadline(Date.now() + seconds * 1000);
    firedRef.current = false;
  }, [seconds]);

  useEffect(() => {
    let raf = 0;
    function tick() {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left > 0) raf = window.setTimeout(tick, 250) as unknown as number;
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
  }, [deadline]);

  useEffect(() => {
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      beep(200, 880);
      vibrate([200, 100, 200]);
      const t = setTimeout(() => onDoneRef.current(), 300);
      return () => clearTimeout(t);
    }
  }, [remaining]);

  const pct = Math.max(0, Math.min(1, remaining / Math.max(1, seconds)));

  return (
    <div
      className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-md px-4"
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Descanso: ${remaining} segundos restantes`}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-popover/95 p-3 backdrop-blur shadow-lg">
        <div className="relative h-14 w-14 shrink-0">
          <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              className="stroke-muted"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              className="stroke-primary transition-all"
              strokeWidth="3"
              strokeDasharray={`${pct * 100} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">
            {remaining}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-muted-foreground">Descanso</span>
          <span className="text-sm font-medium">{remaining}s restantes</span>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn
            onClick={() => setDeadline((d) => Math.max(Date.now(), d - 15000))}
            aria="-15s"
          >
            <Minus className="h-4 w-4" />
          </IconBtn>
          <IconBtn onClick={() => setDeadline((d) => d + 15000)} aria="+15s">
            <Plus className="h-4 w-4" />
          </IconBtn>
          <IconBtn onClick={onDone} aria="Saltar">
            <SkipForward className="h-4 w-4" />
          </IconBtn>
          <IconBtn onClick={onDismiss} aria="Cerrar">
            <X className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  aria,
}: {
  children: React.ReactNode;
  onClick: () => void;
  aria: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={aria}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground hover:bg-accent"
    >
      {children}
    </button>
  );
}

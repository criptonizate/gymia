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
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => (r <= 0 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      beep(200, 880);
      vibrate([200, 100, 200]);
      setTimeout(onDone, 300);
    }
  }, [remaining, onDone]);

  const pct = Math.max(0, Math.min(1, remaining / Math.max(1, seconds)));

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-md px-4">
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
          <IconBtn onClick={() => setRemaining((r) => Math.max(0, r - 15))} aria="-15s">
            <Minus className="h-4 w-4" />
          </IconBtn>
          <IconBtn onClick={() => setRemaining((r) => r + 15)} aria="+15s">
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
      className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground hover:bg-accent"
    >
      {children}
    </button>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play } from "lucide-react";
import { beep, vibrate } from "./beep";

type Props = {
  targetSeconds: number;
  /** Se llama cuando el user guarda el tiempo real (termina o corta). */
  onComplete: (durationSeg: number, logradoCompleto: boolean) => void;
  onCancel: () => void;
};

type Phase = "ready" | "countdown" | "running" | "done";

export function HoldTimer({ targetSeconds, onComplete, onCancel }: Props) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const beep5Fired = useRef(false);
  const beepEndFired = useRef(false);

  // Wake Lock
  useEffect(() => {
    async function acquire() {
      try {
        if ("wakeLock" in navigator) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        }
      } catch {
        // permiso denegado; ignorar
      }
    }
    if (phase === "running") acquire();
    return () => {
      wakeLockRef.current?.release?.().catch(() => undefined);
      wakeLockRef.current = null;
    };
  }, [phase]);

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("running");
      return;
    }
    beep(80, 660);
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Timer
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return;
    const remaining = targetSeconds - elapsed;
    if (remaining === 5 && !beep5Fired.current) {
      beep5Fired.current = true;
      beep(80, 880);
      vibrate(60);
    }
    if (remaining <= 0 && !beepEndFired.current) {
      beepEndFired.current = true;
      beep(300, 880);
      vibrate([200, 100, 200]);
      setPhase("done");
      // auto-cerrar y reportar logro completo
      setTimeout(() => onComplete(targetSeconds, true), 400);
    }
  }, [elapsed, targetSeconds, phase, onComplete]);

  const pct = Math.min(1, elapsed / Math.max(1, targetSeconds));

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-10 bg-background p-6">
      <button
        onClick={onCancel}
        aria-label="Cerrar"
        className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative flex h-72 w-72 items-center justify-center">
        <svg viewBox="0 0 36 36" className="h-72 w-72 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            className="stroke-muted"
            strokeWidth="2.5"
          />
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            className="stroke-primary transition-all"
            strokeWidth="2.5"
            strokeDasharray={`${pct * 100} 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center gap-1">
          {phase === "ready" && (
            <>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Objetivo
              </span>
              <span className="text-6xl font-extrabold tabular-nums">
                {targetSeconds}s
              </span>
            </>
          )}
          {phase === "countdown" && (
            <span className="text-7xl font-extrabold tracking-tighter tabular-nums text-primary">
              {countdown || "¡YA!"}
            </span>
          )}
          {(phase === "running" || phase === "done") && (
            <>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {phase === "done" ? "¡Listo!" : "En curso"}
              </span>
              <span className="text-7xl font-extrabold tabular-nums">
                {elapsed}s
              </span>
              <span className="text-xs text-muted-foreground">
                / {targetSeconds}s
              </span>
            </>
          )}
        </div>
      </div>

      {phase === "ready" && (
        <button
          onClick={() => {
            setCountdown(3);
            setPhase("countdown");
          }}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-[var(--primary-strong)]"
        >
          <Play className="h-5 w-5 fill-primary-foreground" />
          Empezar
        </button>
      )}

      {phase === "running" && (
        <button
          onClick={() =>
            onComplete(elapsed, elapsed >= targetSeconds)
          }
          className="min-h-14 w-full rounded-xl border border-border bg-card text-base font-semibold hover:bg-accent"
        >
          Terminé ({elapsed}s)
        </button>
      )}
    </div>
  );
}

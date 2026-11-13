"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import {
  readPresetCountdown,
  writePresetCountdown,
  type PresetCountdown,
} from "@/lib/preferences";

const OPTS: PresetCountdown[] = [0, 3, 5, 10];

export function PresetCountdownToggle() {
  const [v, setV] = useState<PresetCountdown>(0);
  useEffect(() => setV(readPresetCountdown()), []);
  function pick(n: PresetCountdown) {
    writePresetCountdown(n);
    setV(n);
  }
  return (
    <div className="flex min-h-12 items-center justify-between rounded-xl border border-border bg-card px-4">
      <span className="flex items-center gap-3">
        <Timer className="h-5 w-5 text-primary" />
        <span className="text-base">Cuenta previa a cada serie</span>
      </span>
      <div className="flex rounded-full border border-border bg-background p-0.5">
        {OPTS.map((o) => (
          <button
            key={o}
            onClick={() => pick(o)}
            className={
              "min-w-10 rounded-full px-2 py-1 text-xs tabular-nums " +
              (v === o ? "bg-primary text-primary-foreground" : "text-muted-foreground")
            }
          >
            {o === 0 ? "Off" : `${o}s`}
          </button>
        ))}
      </div>
    </div>
  );
}

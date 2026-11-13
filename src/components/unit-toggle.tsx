"use client";

import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { readUnit, writeUnit, type Unit } from "@/lib/units";

export function UnitToggle() {
  const [unit, setUnit] = useState<Unit>("kg");

  useEffect(() => {
    setUnit(readUnit());
  }, []);

  function switchTo(u: Unit) {
    writeUnit(u);
    setUnit(u);
  }

  return (
    <div className="flex min-h-12 items-center justify-between rounded-xl border border-border bg-card px-4">
      <span className="flex items-center gap-3">
        <Scale className="h-5 w-5 text-primary" />
        <span className="text-base">Unidad de peso</span>
      </span>
      <div className="flex rounded-full border border-border bg-background p-0.5">
        {(["kg", "lb"] as const).map((u) => (
          <button
            key={u}
            onClick={() => switchTo(u)}
            className={
              "min-w-10 rounded-full px-3 py-1 text-xs font-semibold uppercase " +
              (unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground")
            }
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  );
}

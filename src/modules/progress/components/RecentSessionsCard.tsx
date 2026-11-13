"use client";

import { useEffect, useState, useTransition } from "react";
import { History } from "lucide-react";
import { fetchRecentSessions } from "@/modules/progress/actions";
import type { RecentSession } from "@/modules/progress/queries";

const RANGES = [
  { v: 7, l: "7 días" },
  { v: 30, l: "30 días" },
  { v: 90, l: "90 días" },
] as const;

export function RecentSessionsCard({ initial }: { initial: RecentSession[] }) {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [sessions, setSessions] = useState<RecentSession[]>(initial);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (range === 30) return;
    start(async () => {
      setSessions(await fetchRecentSessions(range));
    });
  }, [range]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <History className="h-4 w-4 text-primary" />
          Sesiones recientes
        </span>
        <div className="flex rounded-full border border-border bg-background p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.v}
              onClick={() => setRange(r.v)}
              className={
                "min-w-10 rounded-full px-2.5 py-1 text-xs " +
                (range === r.v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground")
              }
            >
              {r.l}
            </button>
          ))}
        </div>
      </div>

      {pending && (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      )}
      {!pending && sessions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Sin sesiones en este rango.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {sessions.map((s) => {
          const d = new Date(s.started_at);
          return (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-border bg-background p-3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="text-xs text-muted-foreground">
                  {d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                </span>
                <span className="truncate text-sm font-medium">
                  {s.day_nombre}
                </span>
                {s.notas && (
                  <span className="truncate text-xs italic text-muted-foreground">
                    “{s.notas}”
                  </span>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-bold tabular-nums">
                  {s.volumen.toLocaleString("es-AR")} kg
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {s.series_completadas} series
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

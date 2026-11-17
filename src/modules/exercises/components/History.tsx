"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X, LineChart, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { updateSetLog } from "@/modules/workouts/actions";
import type { HistoryEntry } from "@/modules/workouts/queries";

type Props = {
  tipoRegistro: "peso_reps" | "reps" | "tiempo";
  entries: HistoryEntry[];
};

export function History({ tipoRegistro, entries }: Props) {
  if (entries.length === 0) {
    return (
      <EmptyState
        Icon={LineChart}
        title="Sin historial todavía"
        body="Cuando registres sesiones vas a ver acá tu progreso."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Chart tipoRegistro={tipoRegistro} entries={entries} />
      <ul className="flex flex-col gap-2">
        {entries.slice(0, 5).map((e) => (
          <HistoryRow
            key={e.session_id}
            entry={e}
            tipoRegistro={tipoRegistro}
          />
        ))}
      </ul>
    </div>
  );
}

function Chart({
  tipoRegistro,
  entries,
}: {
  tipoRegistro: "peso_reps" | "reps" | "tiempo";
  entries: HistoryEntry[];
}) {
  const data = entries.slice().reverse();
  const values = data.map((e) =>
    tipoRegistro === "tiempo"
      ? e.segTotales / Math.max(1, e.sets.length)
      : tipoRegistro === "reps"
        ? e.repsTotales / Math.max(1, e.sets.length)
        : e.pesoMax ?? 0,
  );
  const max = Math.max(1, ...values);

  const label =
    tipoRegistro === "tiempo"
      ? "Seg. promedio"
      : tipoRegistro === "reps"
        ? "Reps promedio"
        : "Peso máximo (kg)";

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 text-xs text-muted-foreground">{label}</div>
      <div className="flex h-24 items-end gap-1">
        {values.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-primary/70"
            style={{ height: `${(v / max) * 100}%` }}
            title={String(v)}
          />
        ))}
      </div>
    </div>
  );
}

function HistoryRow({
  entry,
  tipoRegistro,
}: {
  entry: HistoryEntry;
  tipoRegistro: "peso_reps" | "reps" | "tiempo";
}) {
  const [editing, setEditing] = useState(false);
  const [sets, setSets] = useState(entry.sets);
  const [pending, start] = useTransition();

  const fecha = new Date(entry.fecha).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{fecha}</span>
          <span className="text-sm font-medium tabular-nums">
            {tipoRegistro === "tiempo"
              ? sets.map((s) => `${s.duracion_seg ?? "?"}s`).join(" · ")
              : tipoRegistro === "reps"
                ? sets.map((s) => s.reps ?? "?").join(" · ")
                : sets
                    .map(
                      (s) => `${s.peso_kg ?? "?"}×${s.reps ?? "?"}`,
                    )
                    .join(" · ")}
          </span>
        </div>
        {editing ? (
          <button
            onClick={() => setEditing(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background"
            aria-label="Cerrar edición"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background"
            aria-label="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>

      {editing && (
        <div className="flex flex-col gap-2">
          {sets.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="w-6 text-xs text-muted-foreground tabular-nums">
                {s.numero_serie}
              </span>
              {tipoRegistro === "peso_reps" && (
                <input
                  type="number"
                  defaultValue={s.peso_kg ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    setSets((p) => p.map((x, i) => (i === idx ? { ...x, peso_kg: v } : x)));
                  }}
                  className="min-h-10 flex-1 rounded-lg border border-border bg-background px-2 text-base outline-none focus:border-primary"
                  placeholder="kg"
                />
              )}
              {tipoRegistro !== "tiempo" && (
                <input
                  type="number"
                  defaultValue={s.reps ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    setSets((p) => p.map((x, i) => (i === idx ? { ...x, reps: v } : x)));
                  }}
                  className="min-h-10 flex-1 rounded-lg border border-border bg-background px-2 text-base outline-none focus:border-primary"
                  placeholder="reps"
                />
              )}
              {tipoRegistro === "tiempo" && (
                <input
                  type="number"
                  defaultValue={s.duracion_seg ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    setSets((p) => p.map((x, i) => (i === idx ? { ...x, duracion_seg: v } : x)));
                  }}
                  className="min-h-10 flex-1 rounded-lg border border-border bg-background px-2 text-base outline-none focus:border-primary"
                  placeholder="seg"
                />
              )}
              <button
                disabled={pending}
                aria-busy={pending || undefined}
                onClick={() =>
                  start(async () => {
                    await updateSetLog(s.id, {
                      peso_kg: s.peso_kg,
                      reps: s.reps,
                      duracion_seg: s.duracion_seg,
                    });
                  })
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-150 active:scale-[0.92] disabled:opacity-60 motion-reduce:active:scale-100"
                aria-label="Guardar"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

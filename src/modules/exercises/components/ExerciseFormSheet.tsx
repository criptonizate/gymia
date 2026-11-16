"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import {
  createExercise,
  deleteExerciseAndRedirect,
  updateExercise,
  type ExerciseInput,
} from "@/modules/exercises/admin-actions";
import type { Equipment, MuscleGroup, Patron } from "@/modules/exercises/types";

type Props = {
  open: boolean;
  onClose: () => void;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  mode: "create" | "edit";
  defaultMuscleGroupId?: string;
  initial?: {
    id: string;
    input: ExerciseInput;
  };
};

const PATRONES: { v: Patron; l: string }[] = [
  { v: "empuje_horizontal", l: "Empuje horizontal" },
  { v: "empuje_vertical", l: "Empuje vertical" },
  { v: "traccion_horizontal", l: "Tracción horizontal" },
  { v: "traccion_vertical", l: "Tracción vertical" },
  { v: "sentadilla", l: "Sentadilla" },
  { v: "bisagra", l: "Bisagra" },
  { v: "zancada", l: "Zancada" },
  { v: "aislamiento", l: "Aislamiento" },
  { v: "core_antiextension", l: "Core · antiextensión" },
  { v: "core_flexion", l: "Core · flexión" },
  { v: "core_antirotacion", l: "Core · antirotación" },
  { v: "core_lateral", l: "Core · lateral" },
];

const empty = (defaultMuscleGroupId?: string): ExerciseInput => ({
  nombre: "",
  muscle_group_id: defaultMuscleGroupId ?? "",
  equipment_id: "",
  patron: "aislamiento",
  tipo: "aislamiento",
  tipo_registro: "peso_reps",
  nivel_minimo: "principiante",
  secondary_muscles: [],
  instrucciones: [],
  errores_comunes: [],
  youtube_query: null,
});

export function ExerciseFormSheet({
  open,
  onClose,
  muscleGroups,
  equipment,
  mode,
  defaultMuscleGroupId,
  initial,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ExerciseInput>(
    initial?.input ?? empty(defaultMuscleGroupId),
  );
  const [secondaryRaw, setSecondaryRaw] = useState("");
  const [instruccionesRaw, setInstruccionesRaw] = useState("");
  const [erroresRaw, setErroresRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = initial?.input ?? empty(defaultMuscleGroupId);
    setForm(base);
    setSecondaryRaw(base.secondary_muscles.join(", "));
    setInstruccionesRaw(base.instrucciones.join("\n"));
    setErroresRaw(base.errores_comunes.join("\n"));
    setError(null);
    setConfirmDelete(false);
  }, [open, initial, defaultMuscleGroupId]);

  function submit() {
    const payload: ExerciseInput = {
      ...form,
      secondary_muscles: secondaryRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      instrucciones: instruccionesRaw.split("\n"),
      errores_comunes: erroresRaw.split("\n"),
    };
    start(async () => {
      const r =
        mode === "create"
          ? await createExercise(payload)
          : await updateExercise(initial!.id, payload);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onClose();
      if (mode === "create") router.push(`/ejercicios/${r.data.slug}`);
      else router.refresh();
    });
  }

  function onDelete() {
    if (!initial) return;
    start(async () => {
      const r = await deleteExerciseAndRedirect(initial.id);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Nuevo ejercicio" : "Editar ejercicio"}
    >
      <div className="flex flex-col gap-3 pb-2">
        <Field label="Nombre">
          <input
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Press banca con mancuernas"
            className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </Field>

        <Field label="Grupo muscular principal">
          <select
            value={form.muscle_group_id}
            onChange={(e) =>
              setForm({ ...form, muscle_group_id: e.target.value })
            }
            className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">Elegí uno…</option>
            {muscleGroups.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Equipamiento">
          <select
            value={form.equipment_id}
            onChange={(e) => setForm({ ...form, equipment_id: e.target.value })}
            className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">Elegí uno…</option>
            {equipment.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Patrón">
            <select
              value={form.patron}
              onChange={(e) =>
                setForm({ ...form, patron: e.target.value as Patron })
              }
              className="min-h-12 w-full rounded-xl border border-border bg-background px-2 text-sm outline-none focus:border-primary"
            >
              {PATRONES.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo">
            <select
              value={form.tipo}
              onChange={(e) =>
                setForm({
                  ...form,
                  tipo: e.target.value as "compuesto" | "aislamiento",
                })
              }
              className="min-h-12 w-full rounded-xl border border-border bg-background px-2 text-sm outline-none focus:border-primary"
            >
              <option value="compuesto">Compuesto</option>
              <option value="aislamiento">Aislamiento</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Registro">
            <select
              value={form.tipo_registro}
              onChange={(e) =>
                setForm({
                  ...form,
                  tipo_registro: e.target.value as ExerciseInput["tipo_registro"],
                })
              }
              className="min-h-12 w-full rounded-xl border border-border bg-background px-2 text-sm outline-none focus:border-primary"
            >
              <option value="peso_reps">Peso + reps</option>
              <option value="reps">Reps</option>
              <option value="tiempo">Tiempo</option>
            </select>
          </Field>
          <Field label="Nivel mínimo">
            <select
              value={form.nivel_minimo}
              onChange={(e) =>
                setForm({
                  ...form,
                  nivel_minimo: e.target.value as ExerciseInput["nivel_minimo"],
                })
              }
              className="min-h-12 w-full rounded-xl border border-border bg-background px-2 text-sm outline-none focus:border-primary"
            >
              <option value="principiante">Principiante</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>
          </Field>
        </div>

        <Field label="Músculos secundarios (coma)">
          <input
            value={secondaryRaw}
            onChange={(e) => setSecondaryRaw(e.target.value)}
            placeholder="hombros, triceps"
            className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </Field>

        <Field label="Instrucciones (una por línea)">
          <textarea
            value={instruccionesRaw}
            onChange={(e) => setInstruccionesRaw(e.target.value)}
            rows={4}
            className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          />
        </Field>

        <Field label="Errores comunes (una por línea)">
          <textarea
            value={erroresRaw}
            onChange={(e) => setErroresRaw(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          />
        </Field>

        <Field label="Búsqueda YouTube (opcional)">
          <input
            value={form.youtube_query ?? ""}
            onChange={(e) =>
              setForm({ ...form, youtube_query: e.target.value })
            }
            placeholder="dumbbell bench press technique"
            className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </Field>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={pending}
            className="min-h-12 flex-1 rounded-xl border border-border bg-card text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={pending}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {mode === "create" ? (
              <>
                <Plus className="h-4 w-4" />
                {pending ? "Creando…" : "Crear"}
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {pending ? "Guardando…" : "Guardar"}
              </>
            )}
          </button>
        </div>

        {mode === "edit" && initial && (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-destructive/30 bg-[var(--destructive-soft,transparent)] p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-destructive">
              Zona peligrosa
            </span>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={pending}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-background text-sm font-semibold text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar ejercicio
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Esto elimina el ejercicio del catálogo. Si hay rutinas o
                  registros que lo usan, no se podrá borrar.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={pending}
                    className="min-h-11 flex-1 rounded-xl border border-border bg-card text-xs font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={onDelete}
                    disabled={pending}
                    className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-xs font-semibold text-destructive-foreground disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {pending ? "Borrando…" : "Confirmar borrado"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

import { Suspense } from "react";
import { Dumbbell } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ExerciseCard } from "@/modules/exercises/components/ExerciseCard";
import {
  listEquipment,
  listExercises,
  listMuscleGroups,
} from "@/modules/exercises/queries";
import { ExerciseFilters } from "./filters";

export const instant = false;

type SearchParams = Promise<{ q?: string; mg?: string; eq?: string }>;

export default async function EjerciciosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "", mg = "", eq = "" } = await searchParams;

  const [muscleGroups, equipment, exercises] = await Promise.all([
    listMuscleGroups(),
    listEquipment(),
    listExercises({ q, muscleGroupSlug: mg, equipmentSlug: eq }),
  ]);

  return (
    <main className="flex flex-col gap-4 p-4">
      <header className="px-2 pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Ejercicios</h1>
        <p className="text-sm text-muted-foreground">
          {exercises.length}{" "}
          {exercises.length === 1 ? "resultado" : "resultados"}
        </p>
      </header>

      <Suspense>
        <ExerciseFilters muscleGroups={muscleGroups} equipment={equipment} />
      </Suspense>

      {exercises.length === 0 ? (
        <EmptyState
          Icon={Dumbbell}
          title="Sin resultados"
          body="Probá con otra búsqueda o cambiá los filtros."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {exercises.map((ex) => (
            <li key={ex.id}>
              <ExerciseCard ex={ex} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

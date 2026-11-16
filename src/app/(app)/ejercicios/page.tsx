import { Suspense } from "react";
import { Dumbbell } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ExerciseCard } from "@/modules/exercises/components/ExerciseCard";
import { NewExerciseButton } from "@/modules/exercises/components/NewExerciseButton";
import {
  listEquipment,
  listExercises,
  listMuscleGroups,
} from "@/modules/exercises/queries";
import { isAdmin } from "@/lib/supabase/profile";
import { ExerciseFilters } from "./filters";

export const instant = false;

type SearchParams = Promise<{ q?: string; mg?: string; eq?: string; fav?: string }>;

export default async function EjerciciosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "", mg = "", eq = "", fav } = await searchParams;
  const onlyFavorites = fav === "1";

  const [muscleGroups, equipment, exercises, admin] = await Promise.all([
    listMuscleGroups(),
    listEquipment(),
    listExercises({
      q,
      muscleGroupSlug: mg,
      equipmentSlug: eq,
      onlyFavorites,
    }),
    isAdmin(),
  ]);

  return (
    <main className="flex flex-col gap-4 p-4">
      <header className="flex items-end justify-between gap-2 px-2 pt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ejercicios</h1>
          <p className="text-sm text-muted-foreground">
            {exercises.length}{" "}
            {exercises.length === 1 ? "resultado" : "resultados"}
          </p>
        </div>
        {admin && (
          <Suspense>
            <NewExerciseButton
              muscleGroups={muscleGroups}
              equipment={equipment}
            />
          </Suspense>
        )}
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

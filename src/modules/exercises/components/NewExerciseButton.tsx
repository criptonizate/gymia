"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { ExerciseFormSheet } from "./ExerciseFormSheet";
import type { Equipment, MuscleGroup } from "@/modules/exercises/types";

type Props = {
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
};

export function NewExerciseButton({ muscleGroups, equipment }: Props) {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  const mgSlug = params.get("mg") ?? "";
  const defaultMuscleGroupId =
    muscleGroups.find((m) => m.slug === mgSlug)?.id ?? undefined;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"
      >
        <Plus className="h-4 w-4" />
        Nuevo ejercicio
      </button>
      <ExerciseFormSheet
        open={open}
        onClose={() => setOpen(false)}
        muscleGroups={muscleGroups}
        equipment={equipment}
        mode="create"
        defaultMuscleGroupId={defaultMuscleGroupId}
      />
    </>
  );
}

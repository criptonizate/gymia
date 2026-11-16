"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ExerciseFormSheet } from "./ExerciseFormSheet";
import type { ExerciseInput } from "@/modules/exercises/admin-actions";
import type { Equipment, MuscleGroup } from "@/modules/exercises/types";

type Props = {
  exerciseId: string;
  initial: ExerciseInput;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
};

export function EditExerciseButton({
  exerciseId,
  initial,
  muscleGroups,
  equipment,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs font-medium"
      >
        <Pencil className="h-3.5 w-3.5 text-primary" />
        Editar
      </button>
      <ExerciseFormSheet
        open={open}
        onClose={() => setOpen(false)}
        mode="edit"
        muscleGroups={muscleGroups}
        equipment={equipment}
        initial={{ id: exerciseId, input: initial }}
      />
    </>
  );
}

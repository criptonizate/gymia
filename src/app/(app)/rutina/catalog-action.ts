"use server";

import { listExercises } from "@/modules/exercises/queries";

export async function listCatalog() {
  return listExercises();
}

import { Dumbbell } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function EjerciciosPage() {
  return (
    <main className="flex flex-col gap-2 p-4">
      <header className="px-2 pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Ejercicios</h1>
      </header>
      <EmptyState
        Icon={Dumbbell}
        title="Catálogo en camino"
        body="Acá vas a buscar y abrir cualquier ejercicio para ver la técnica."
      />
    </main>
  );
}

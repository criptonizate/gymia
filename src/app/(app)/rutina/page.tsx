import { ListTodo } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getActiveRoutine } from "@/modules/routines/queries";
import { RutinaView } from "./rutina-view";

export const instant = false;

export default async function RutinaPage() {
  const routine = await getActiveRoutine();

  if (!routine) {
    return (
      <main className="flex flex-col gap-2 p-4">
        <header className="px-2 pt-4">
          <h1 className="text-3xl font-bold tracking-tight">Rutina</h1>
        </header>
        <EmptyState
          Icon={ListTodo}
          title="Sin plan activo"
          body="Cuando generes una rutina vas a ver acá las semanas y los días."
          cta={{ href: "/generar", label: "Generar mi rutina" }}
        />
      </main>
    );
  }

  return <RutinaView routine={routine} />;
}

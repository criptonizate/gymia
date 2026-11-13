import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function GenerarPage() {
  return (
    <main className="flex flex-col gap-2 p-4">
      <header className="px-2 pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Generar rutina</h1>
      </header>
      <EmptyState
        Icon={Sparkles}
        title="Próximamente"
        body="El asistente para armar tu plan llega en la próxima fase."
      />
    </main>
  );
}

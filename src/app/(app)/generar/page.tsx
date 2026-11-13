import { GenerarWizard } from "./wizard";

export const instant = false;

export default function GenerarPage() {
  return (
    <main className="flex flex-col">
      <header className="px-6 pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Generar rutina</h1>
        <p className="text-sm text-muted-foreground">
          Armamos tu plan en 4 toques.
        </p>
      </header>
      <GenerarWizard />
    </main>
  );
}

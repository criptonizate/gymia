import { notFound, redirect } from "next/navigation";
import { getSessionContext } from "@/modules/workouts/queries";
import { SessionView } from "./session-view";

export const instant = false;

export default async function SesionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getSessionContext(id);
  if (!ctx) notFound();
  if (ctx.session.finished_at) {
    // Sesión ya terminada: por ahora se vuelve a Hoy. (La edición del
    // historial se accede desde el detalle del ejercicio.)
    redirect("/hoy");
  }
  return (
    <SessionView
      sessionId={ctx.session.id}
      startedAt={ctx.session.started_at}
      dayNombre={ctx.day.nombre}
      ejercicios={ctx.day.ejercicios}
      logs={ctx.logs}
      lastLogsByExercise={ctx.lastLogsByExercise}
    />
  );
}

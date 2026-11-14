import { redirect } from "next/navigation";
import { getSessionContext } from "@/modules/workouts/queries";
import { SessionView } from "./session-view";
import { OfflineSessionFallback } from "./offline-fallback";

export const instant = false;

export default async function SesionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let ctx: Awaited<ReturnType<typeof getSessionContext>> = null;
  try {
    ctx = await getSessionContext(id);
  } catch {
    // Supabase inaccesible (offline). Dejamos que el cliente intente
    // levantar desde IndexedDB.
  }
  if (!ctx) {
    return <OfflineSessionFallback sessionId={id} />;
  }
  if (ctx.session.finished_at) {
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
      substitutes={ctx.substitutes}
    />
  );
}

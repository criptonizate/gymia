"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { startOrContinueSession } from "@/modules/workouts/actions";

export function StartButton({
  routineDayId,
  openSessionId,
}: {
  routineDayId: string;
  openSessionId: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    if (openSessionId) {
      router.push(`/sesion/${openSessionId}`);
      return;
    }
    start(async () => {
      const res = await startOrContinueSession(routineDayId);
      if (res.ok) router.push(`/sesion/${res.data.sessionId}`);
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="sticky bottom-20 z-10 flex min-h-14 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground shadow-lg hover:bg-[var(--primary-strong)] disabled:opacity-60"
    >
      <Play className="h-5 w-5 fill-primary-foreground" />
      {openSessionId ? "Continuar entrenamiento" : "Empezar entrenamiento"}
    </button>
  );
}

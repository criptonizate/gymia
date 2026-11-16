"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/button";
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
    <Button
      size="lg"
      onClick={onClick}
      loading={pending}
      loadingText={openSessionId ? "Abriendo…" : "Iniciando…"}
      className="sticky bottom-20 z-10 shadow-lg"
    >
      {!pending && <Play className="h-5 w-5 fill-primary-foreground" />}
      {openSessionId ? "Continuar entrenamiento" : "Empezar entrenamiento"}
    </Button>
  );
}

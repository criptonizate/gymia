"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Timer } from "lucide-react";
import { Button } from "@/components/button";
import { generateDeload } from "@/modules/routines/actions";
import type { GeneratorConfig } from "@/modules/routines/generator/types";

export function DeloadCta({ config }: { config: GeneratorConfig }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function onClick() {
    start(async () => {
      const r = await generateDeload(config);
      if (r.ok) router.push("/rutina");
    });
  }
  return (
    <Button
      variant="outline"
      onClick={onClick}
      loading={pending}
      loadingText="Generando…"
    >
      {!pending && <Timer className="h-4 w-4 text-primary" />}
      Generar semana de descarga
    </Button>
  );
}

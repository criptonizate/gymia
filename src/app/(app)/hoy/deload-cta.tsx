"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Timer } from "lucide-react";
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
    <button
      onClick={onClick}
      disabled={pending}
      className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent disabled:opacity-60"
    >
      <Timer className="h-4 w-4 text-primary" />
      {pending ? "Generando…" : "Generar semana de descarga"}
    </button>
  );
}

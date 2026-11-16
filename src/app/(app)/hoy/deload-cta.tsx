"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Timer } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/button";
import { generateDeload } from "@/modules/routines/actions";
import type { GeneratorConfig } from "@/modules/routines/generator/types";

export function DeloadCta({ config }: { config: GeneratorConfig }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirm() {
    setError(null);
    start(async () => {
      const r = await generateDeload(config);
      if (r.ok) {
        setConfirmOpen(false);
        router.push("/rutina");
      } else {
        setError(r.error ?? "No se pudo generar la descarga.");
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setConfirmOpen(true)}
      >
        <Timer className="h-4 w-4 text-primary" />
        Generar semana de descarga
      </Button>

      <BottomSheet
        open={confirmOpen}
        onClose={() => {
          if (!pending) {
            setConfirmOpen(false);
            setError(null);
          }
        }}
        title="Generar semana de descarga"
      >
        <div className="flex flex-col gap-4 pb-2">
          <p className="text-sm text-muted-foreground">
            Esto reemplaza la rutina activa por una semana de descarga
            (series y peso objetivo reducidos ~40%). La rutina anterior
            queda inactiva. El historial se mantiene.
          </p>
          {error && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setConfirmOpen(false);
                setError(null);
              }}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              fullWidth
              onClick={confirm}
              loading={pending}
              loadingText="Generando…"
            >
              Sí, generar
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}

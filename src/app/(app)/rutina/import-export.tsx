"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/button";
import {
  exportActiveRoutine,
  importRoutineFromPlan,
} from "@/modules/routines/actions";

export function ImportExportButtons() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onExport() {
    start(async () => {
      const r = await exportActiveRoutine();
      if (!r.ok) return setError(r.error);
      const json = JSON.stringify(r.data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gymia-rutina-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  function onImportClick() {
    fileRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    start(async () => {
      try {
        const text = await f.text();
        const parsed: unknown = JSON.parse(text);
        const r = await importRoutineFromPlan(parsed);
        if (!r.ok) setError(r.error);
        else router.refresh();
      } catch {
        setError("No pude leer el archivo.");
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          fullWidth
          onClick={onExport}
          loading={pending}
          loadingText="Exportando…"
          className="text-xs"
        >
          {!pending && <Download className="h-4 w-4 text-primary" />}
          Exportar
        </Button>
        <Button
          variant="outline"
          size="sm"
          fullWidth
          onClick={onImportClick}
          loading={pending}
          loadingText="Importando…"
          className="text-xs"
        >
          {!pending && <Upload className="h-4 w-4 text-primary" />}
          Importar
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={onFile}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

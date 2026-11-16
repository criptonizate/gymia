"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ImagePlus,
  Trash2,
  Images,
} from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/button";
import {
  updateExerciseFrames,
  uploadExerciseFrames,
} from "@/modules/exercises/admin-actions";

type Props = {
  open: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseNombre: string;
  muscleGroupSlug: string;
  initialFrames: string[];
};

const MAX_FRAMES = 6;
const FRAME_MS = 800;

export function EditMediaSheet({
  open,
  onClose,
  exerciseId,
  exerciseNombre,
  initialFrames,
}: Props) {
  const [frames, setFrames] = useState<string[]>(initialFrames);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [previewIdx, setPreviewIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setFrames(initialFrames);
    setError(null);
    setPreviewIdx(0);
  }, [open, initialFrames]);

  useEffect(() => {
    if (!open || frames.length < 2) return;
    const t = setInterval(
      () => setPreviewIdx((i) => (i + 1) % frames.length),
      FRAME_MS,
    );
    return () => clearInterval(t);
  }, [open, frames.length]);

  const dirty =
    frames.length !== initialFrames.length ||
    frames.some((u, i) => u !== initialFrames[i]);

  function move(idx: number, dir: -1 | 1) {
    const to = idx + dir;
    if (to < 0 || to >= frames.length) return;
    setFrames((prev) => {
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  }
  function remove(idx: number) {
    setFrames((prev) => prev.filter((_, i) => i !== idx));
    setPreviewIdx(0);
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const spaceLeft = MAX_FRAMES - frames.length;
    if (spaceLeft <= 0) {
      setError(`Ya tenés ${MAX_FRAMES} imágenes (el máximo).`);
      return;
    }
    const picked = files.slice(0, spaceLeft);
    start(async () => {
      const fd = new FormData();
      fd.append("exerciseId", exerciseId);
      picked.forEach((f) => fd.append("files", f));
      const r = await uploadExerciseFrames(fd);
      if (!r.ok) {
        setError(r.error);
      } else {
        setError(null);
        setFrames((prev) => [...prev, ...r.data.urls]);
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function onSave() {
    start(async () => {
      const r = await updateExerciseFrames(exerciseId, frames);
      if (!r.ok) setError(r.error);
      else onClose();
    });
  }

  const previewSrc = frames[previewIdx % Math.max(1, frames.length)];

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Imágenes · ${exerciseNombre}`}
    >
      <div className="flex flex-col gap-4 pb-2">
        <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl border border-border bg-[var(--primary-soft)]">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt="preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sin imágenes
            </div>
          )}
          {frames.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white tabular-nums">
              {previewIdx + 1}/{frames.length}
            </span>
          )}
        </div>

        <ul className="flex flex-col gap-2">
          {frames.map((url, i) => (
            <li
              key={url + i}
              className="flex items-center gap-2 rounded-xl border border-border bg-background p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`frame ${i + 1}`}
                className="h-12 w-12 flex-none rounded-lg object-cover"
              />
              <span className="flex-1 truncate text-xs text-muted-foreground">
                #{i + 1}
              </span>
              <button
                aria-label="Subir"
                disabled={i === 0 || pending}
                onClick={() => move(i, -1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                aria-label="Bajar"
                disabled={i === frames.length - 1 || pending}
                onClick={() => move(i, 1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background disabled:opacity-40"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                aria-label="Eliminar"
                disabled={pending}
                onClick={() => remove(i)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-destructive disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={onPickFiles}
        />
        <Button
          variant="outline"
          disabled={pending || frames.length >= MAX_FRAMES}
          onClick={() => inputRef.current?.click()}
          className="border-dashed text-muted-foreground"
        >
          <ImagePlus className="h-4 w-4 text-primary" />
          Agregar imagen ({frames.length}/{MAX_FRAMES})
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button
            variant="outline"
            fullWidth
            onClick={onClose}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            fullWidth
            onClick={onSave}
            disabled={!dirty}
            loading={pending}
            loadingText="Guardando…"
          >
            {!pending && <Check className="h-4 w-4" />}
            Guardar
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

/** Botón que abre el sheet. Server-wrapper decide si mostrarlo. */
export function EditMediaButton(props: {
  exerciseId: string;
  exerciseNombre: string;
  muscleGroupSlug: string;
  initialFrames: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs font-medium"
      >
        <Images className="h-3.5 w-3.5 text-primary" />
        Editar imágenes
      </button>
      <EditMediaSheet open={open} onClose={() => setOpen(false)} {...props} />
    </>
  );
}

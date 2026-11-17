"use client";

import { useState, useTransition } from "react";
import { CirclePlay, Pencil, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/button";
import { saveUserVideo, clearUserVideo } from "@/modules/exercises/actions";
import {
  PREFERRED_YT_CHANNEL,
  youtubeEmbedUrl,
  youtubeSearchUrl,
  youtubeSearchUrlGlobal,
} from "@/modules/exercises/youtube";

type Props = {
  exerciseId: string;
  exerciseSlug: string;
  youtubeQuery: string | null;
  /** videoId preferido (del usuario o el global). */
  videoId: string | null;
  /** Si es el video propio del usuario (para mostrar "guardado"). */
  userOwnsVideo: boolean;
};

export function YoutubeBlock({
  exerciseId,
  exerciseSlug,
  youtubeQuery,
  videoId,
  userOwnsVideo,
}: Props) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSave() {
    setError(null);
    start(async () => {
      const res = await saveUserVideo(exerciseId, exerciseSlug, link);
      if (!res.ok) setError(res.error);
      else {
        setLink("");
        setOpen(false);
      }
    });
  }

  function onClear() {
    start(async () => {
      await clearUserVideo(exerciseId, exerciseSlug);
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground">Video</h2>

      {videoId ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="relative aspect-video">
            <iframe
              src={youtubeEmbedUrl(videoId)}
              title="YouTube"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
          {userOwnsVideo && (
            <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
              <span>Tu video de referencia</span>
              <button
                onClick={onClear}
                disabled={pending}
                className="flex items-center gap-1 rounded-full px-2 py-1 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Quitar
              </button>
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        {youtubeQuery && (
          <a
            href={youtubeSearchUrl(youtubeQuery)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-[var(--primary-soft)] text-sm font-medium text-primary hover:bg-[var(--primary-soft-hover)]"
          >
            <CirclePlay className="h-4 w-4" />
            Buscar en {PREFERRED_YT_CHANNEL}
          </a>
        )}
        <button
          onClick={() => setOpen(true)}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent"
        >
          <Pencil className="h-4 w-4 text-primary" />
          {userOwnsVideo ? "Cambiar mi video" : "Guardar mi video"}
        </button>
      </div>
      {youtubeQuery && (
        <a
          href={youtubeSearchUrlGlobal(youtubeQuery)}
          target="_blank"
          rel="noopener noreferrer"
          className="px-1 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Buscar en todo YouTube
        </a>
      )}

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Mi video de referencia"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Pegá el link del video que quieras guardar para este ejercicio.
            Soportamos links de youtube.com, youtu.be y shorts.
          </p>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="min-h-12 rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-primary"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            onClick={onSave}
            disabled={!link.trim()}
            loading={pending}
            loadingText="Guardando..."
          >
            Guardar
          </Button>
        </div>
      </BottomSheet>
    </section>
  );
}

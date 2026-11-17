"use client";

import { CirclePlay } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import {
  PREFERRED_YT_CHANNEL,
  youtubeSearchUrl,
  youtubeSearchUrlGlobal,
} from "@/modules/exercises/youtube";

type Props = {
  open: boolean;
  onClose: () => void;
  nombre: string;
  instrucciones: string[];
  erroresComunes: string[];
  youtubeQuery?: string | null;
};

export function TechniqueSheet({
  open,
  onClose,
  nombre,
  instrucciones,
  erroresComunes,
  youtubeQuery,
}: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} title={nombre}>
      <div className="flex flex-col gap-6">
        {instrucciones.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Cómo hacerlo
            </h3>
            <ol className="flex flex-col gap-3">
              {instrucciones.map((paso, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed">{paso}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {erroresComunes.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Errores comunes
            </h3>
            <ul className="flex flex-col gap-2 pl-1">
              {erroresComunes.map((e, i) => (
                <li
                  key={i}
                  className="relative pl-4 text-sm leading-relaxed before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-warning"
                >
                  {e}
                </li>
              ))}
            </ul>
          </section>
        )}

        {youtubeQuery && (
          <div className="flex flex-col gap-2">
            <a
              href={youtubeSearchUrl(youtubeQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-strong)]"
            >
              <CirclePlay className="h-4 w-4" />
              Buscar en {PREFERRED_YT_CHANNEL}
            </a>
            <a
              href={youtubeSearchUrlGlobal(youtubeQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="self-center text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Buscar en todo YouTube
            </a>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { ExerciseMedia } from "./ExerciseMedia";
import { TechniqueSheet } from "./TechniqueSheet";

type Props = {
  nombre: string;
  slug?: string;
  patron?: string;
  mediaUrl: string | null;
  frames: string[];
  muscleGroupSlug: string;
  instrucciones: string[];
  erroresComunes: string[];
  youtubeQuery: string | null;
};

export function ExerciseHero({
  nombre,
  slug,
  patron,
  mediaUrl,
  frames,
  muscleGroupSlug,
  instrucciones,
  erroresComunes,
  youtubeQuery,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="relative overflow-hidden rounded-3xl border border-border"
        onClick={() => setOpen(true)}
        role="button"
      >
        <ExerciseMedia
          mediaUrl={mediaUrl}
          frames={frames}
          muscleGroupSlug={muscleGroupSlug}
          exerciseSlug={slug}
          patron={patron}
          alt={nombre}
          className="aspect-square w-full"
        />
        <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white">
          <Info className="h-3.5 w-3.5" />
          Ver técnica
        </span>
      </div>

      <TechniqueSheet
        open={open}
        onClose={() => setOpen(false)}
        nombre={nombre}
        instrucciones={instrucciones}
        erroresComunes={erroresComunes}
        youtubeQuery={youtubeQuery}
      />
    </>
  );
}

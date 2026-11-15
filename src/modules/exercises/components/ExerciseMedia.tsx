"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { exerciseGlyph } from "@/modules/exercises/exercise-glyphs";

type Props = {
  mediaUrl?: string | null;
  frames?: string[];
  muscleGroupSlug: string;
  /** Slug del ejercicio para el glifo fallback. */
  exerciseSlug?: string;
  /** Patrón del ejercicio (para fallback por patrón). */
  patron?: string;
  alt: string;
  className?: string;
  /** Oculta el botón play/pause (útil para miniaturas). */
  minimal?: boolean;
  /** Pista a next/image para elegir el srcset correcto. */
  sizes?: string;
};

const INTERVAL_MS = 800;

export function ExerciseMedia({
  mediaUrl,
  frames,
  muscleGroupSlug,
  exerciseSlug,
  patron,
  alt,
  className,
  minimal = false,
  sizes = "(max-width: 448px) 100vw, 448px",
}: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotionRef = useRef(false);

  const hasGif = !!mediaUrl;
  const usableFrames = (frames ?? []).filter(Boolean);
  const canAlternate = !hasGif && usableFrames.length > 1;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mql.matches;
    if (mql.matches) setPaused(true);
    const listener = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
      if (e.matches) setPaused(true);
    };
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (!canAlternate || paused) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % usableFrames.length);
    }, INTERVAL_MS);
    return () => clearInterval(t);
  }, [canAlternate, paused, usableFrames.length]);

  if (!hasGif && usableFrames.length === 0) {
    const glyph = exerciseGlyph({
      slug: exerciseSlug ?? "",
      patron,
      muscleSlug: muscleGroupSlug,
    });
    return (
      <div
        className={
          "flex items-center justify-center bg-[var(--primary-soft)] text-primary " +
          (className ?? "")
        }
        aria-label={alt}
      >
        <span
          aria-hidden="true"
          className="text-[clamp(1.75rem,8vw,3rem)] leading-none"
        >
          {glyph}
        </span>
      </div>
    );
  }

  const src = hasGif ? mediaUrl! : usableFrames[idx % usableFrames.length];

  return (
    <button
      type="button"
      onClick={() => !minimal && setPaused((p) => !p)}
      className={
        "relative overflow-hidden bg-[var(--primary-soft)] " + (className ?? "")
      }
      aria-label={paused ? `${alt} (pausado, tocá para reanudar)` : alt}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized={hasGif /* GIF animado no debe pasar por el optimizer */}
        className="object-cover"
        draggable={false}
        loading="lazy"
      />
      {!minimal && canAlternate && (
        <span className="pointer-events-none absolute bottom-1 right-1 rounded-full bg-black/55 p-1 text-white">
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </span>
      )}
    </button>
  );
}

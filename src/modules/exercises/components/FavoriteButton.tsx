"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleFavorite } from "@/modules/exercises/actions";

export function FavoriteButton({
  exerciseId,
  exerciseSlug,
  initial,
}: {
  exerciseId: string;
  exerciseSlug: string;
  initial: boolean;
}) {
  const [fav, setFav] = useOptimistic<boolean, boolean>(
    initial,
    (_, next) => next,
  );
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  // Si quedó marcado como fallido, lo limpiamos después de 2s.
  useEffect(() => {
    if (!failed) return;
    const t = setTimeout(() => setFailed(false), 2000);
    return () => clearTimeout(t);
  }, [failed]);

  function onClick() {
    const next = !fav;
    start(async () => {
      setFav(next);
      const r = await toggleFavorite(exerciseId, exerciseSlug);
      // El estado real lo recupera el router.refresh del action, pero
      // si la server action devolvió error avisamos con un pulso visual.
      if (!r.ok) setFailed(true);
    });
  }

  return (
    <button
      aria-label={
        failed
          ? "No se pudo actualizar el favorito, intentá de nuevo"
          : fav
            ? "Quitar de favoritos"
            : "Marcar favorito"
      }
      title={failed ? "No se pudo guardar. Tocá de nuevo." : undefined}
      onClick={onClick}
      disabled={pending}
      aria-busy={pending || undefined}
      className={
        "flex h-10 w-10 items-center justify-center rounded-full border bg-card transition-transform duration-150 active:scale-[0.92] disabled:opacity-60 motion-reduce:active:scale-100 " +
        (failed ? "border-destructive" : "border-border")
      }
    >
      <Star
        className={
          failed
            ? "h-4 w-4 text-destructive"
            : fav
              ? "h-4 w-4 fill-primary text-primary"
              : "h-4 w-4 text-muted-foreground"
        }
      />
    </button>
  );
}

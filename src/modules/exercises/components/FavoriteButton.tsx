"use client";

import { useOptimistic, useTransition } from "react";
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

  function onClick() {
    const next = !fav;
    start(async () => {
      setFav(next);
      await toggleFavorite(exerciseId, exerciseSlug);
    });
  }

  return (
    <button
      aria-label={fav ? "Quitar de favoritos" : "Marcar favorito"}
      onClick={onClick}
      disabled={pending}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card disabled:opacity-60"
    >
      <Star
        className={fav ? "h-4 w-4 fill-primary text-primary" : "h-4 w-4 text-muted-foreground"}
      />
    </button>
  );
}

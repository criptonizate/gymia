import Link from "next/link";
import { ExerciseMedia } from "./ExerciseMedia";
import type { ExerciseWithRelations } from "@/modules/exercises/types";

export function ExerciseCard({ ex }: { ex: ExerciseWithRelations }) {
  return (
    <Link
      href={`/ejercicios/${ex.slug}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-primary/50"
    >
      <ExerciseMedia
        mediaUrl={ex.media_url}
        frames={ex.media_frames}
        muscleGroupSlug={ex.muscle_group.slug}
        exerciseSlug={ex.slug}
        patron={ex.patron}
        youtubeVideoId={ex.youtube_video_id}
        alt={ex.nombre}
        className="h-16 w-16 flex-none rounded-xl"
        sizes="64px"
        minimal
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate text-sm font-semibold">{ex.nombre}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip>{ex.muscle_group.nombre}</Chip>
          <Chip variant="muted">{ex.equipment.nombre}</Chip>
        </div>
      </div>
    </Link>
  );
}

function Chip({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "muted";
}) {
  const classes =
    variant === "primary"
      ? "bg-[var(--primary-soft)] text-primary"
      : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${classes}`}>
      {children}
    </span>
  );
}

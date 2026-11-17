import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getExerciseBySlug,
  getUserExerciseVideo,
  isFavorite,
  listEquipment,
  listMuscleGroups,
} from "@/modules/exercises/queries";
import { ExerciseHero } from "@/modules/exercises/components/ExerciseHero";
import { YoutubeBlock } from "@/modules/exercises/components/YoutubeBlock";
import { History } from "@/modules/exercises/components/History";
import { FavoriteButton } from "@/modules/exercises/components/FavoriteButton";
import { EditMediaButton } from "@/modules/exercises/components/EditMediaSheet";
import { EditExerciseButton } from "@/modules/exercises/components/EditExerciseButton";
import { getExerciseHistory } from "@/modules/workouts/queries";
import { isAdmin } from "@/lib/supabase/profile";

export const instant = false;

const NIVEL_LABEL: Record<string, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export default async function EjercicioDetallePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ex = await getExerciseBySlug(slug);
  if (!ex) notFound();

  const [userVideoId, history, favorito, admin] = await Promise.all([
    getUserExerciseVideo(ex.id),
    getExerciseHistory(ex.id, 10),
    isFavorite(ex.id),
    isAdmin(),
  ]);
  const [muscleGroups, equipment] = admin
    ? await Promise.all([listMuscleGroups(), listEquipment()])
    : [[], []];
  const effectiveVideoId = userVideoId ?? ex.youtube_video_id ?? null;

  return (
    <main className="flex flex-col gap-6 p-4 pb-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/ejercicios"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          {admin && (
            <>
              <EditExerciseButton
                exerciseId={ex.id}
                muscleGroups={muscleGroups}
                equipment={equipment}
                initial={{
                  nombre: ex.nombre,
                  muscle_group_id: ex.muscle_group_id,
                  equipment_id: ex.equipment_id,
                  patron: ex.patron,
                  tipo: ex.tipo,
                  tipo_registro: ex.tipo_registro,
                  nivel_minimo: ex.nivel_minimo,
                  secondary_muscles: ex.secondary_muscles,
                  instrucciones: ex.instrucciones,
                  errores_comunes: ex.errores_comunes,
                  youtube_query: ex.youtube_query,
                }}
              />
              <EditMediaButton
                exerciseId={ex.id}
                exerciseNombre={ex.nombre}
                muscleGroupSlug={ex.muscle_group.slug}
                initialFrames={ex.media_frames}
              />
            </>
          )}
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {NIVEL_LABEL[ex.nivel_minimo]}
          </span>
          <FavoriteButton
            exerciseId={ex.id}
            exerciseSlug={ex.slug}
            initial={favorito}
          />
        </div>
      </div>

      <ExerciseHero
        nombre={ex.nombre}
        slug={ex.slug}
        patron={ex.patron}
        mediaUrl={ex.media_url}
        frames={ex.media_frames}
        muscleGroupSlug={ex.muscle_group.slug}
        youtubeVideoId={effectiveVideoId}
        instrucciones={ex.instrucciones}
        erroresComunes={ex.errores_comunes}
        youtubeQuery={ex.youtube_query}
      />

      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{ex.nombre}</h1>
        <div className="flex flex-wrap gap-1.5">
          <Chip>{ex.muscle_group.nombre}</Chip>
          {ex.secondary_muscles.map((m) => (
            <Chip key={m} variant="muted">
              {m}
            </Chip>
          ))}
          <Chip variant="muted">{ex.equipment.nombre}</Chip>
        </div>
      </header>

      {ex.instrucciones.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Cómo hacerlo
          </h2>
          <ol className="flex flex-col gap-3">
            {ex.instrucciones.map((paso, i) => (
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

      {ex.errores_comunes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Errores comunes
          </h2>
          <ul className="flex flex-col gap-2">
            {ex.errores_comunes.map((e, i) => (
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

      <YoutubeBlock
        exerciseId={ex.id}
        exerciseSlug={ex.slug}
        youtubeQuery={ex.youtube_query}
        videoId={effectiveVideoId}
        userOwnsVideo={!!userVideoId}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Historial
        </h2>
        <History tipoRegistro={ex.tipo_registro} entries={history} />
      </section>
    </main>
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

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  GripVertical,
  Link2,
  Link2Off,
  MoreHorizontal,
  Repeat,
  Trash2,
} from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { ExerciseMedia } from "@/modules/exercises/components/ExerciseMedia";
import type { RoutineExerciseRow } from "@/modules/routines/queries";
import {
  cleanupOrphanSupersets,
  nextSupersetGroup,
  removeExercise,
  reorderDay,
  setSupersetGroup,
} from "@/modules/routines/actions";

type Props = {
  routineDayId: string;
  ejercicios: RoutineExerciseRow[];
  onOpenSwap: (e: RoutineExerciseRow) => void;
};

export function SortableExerciseList({
  routineDayId,
  ejercicios,
  onOpenSwap,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(ejercicios);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    if (pending) return; // bloquear si hay persist pendiente
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((x) => x.id === active.id);
    const newIdx = items.findIndex((x) => x.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = [...items];
    const [m] = next.splice(oldIdx, 1);
    next.splice(newIdx, 0, m);
    setItems(next);
    start(async () => {
      await reorderDay(
        routineDayId,
        next.map((x) => x.id),
      );
      // Si un drag separó un par de superset, limpiar huérfanos
      if (items.some((x) => x.superset_group != null)) {
        await cleanupOrphanSupersets(routineDayId);
      }
      router.refresh();
    });
  }

  function doDelete(id: string) {
    setMenuFor(null);
    setItems((p) => p.filter((x) => x.id !== id));
    start(async () => {
      await removeExercise(id);
      await cleanupOrphanSupersets(routineDayId);
      router.refresh();
    });
  }

  async function toggleSuperset(e: RoutineExerciseRow) {
    const idx = items.findIndex((x) => x.id === e.id);
    const next = items[idx + 1];
    setMenuFor(null);
    if (e.superset_group != null) {
      start(async () => {
        // Al desagrupar uno, limpiar al compañero huérfano también
        await setSupersetGroup([e.id], null);
        await cleanupOrphanSupersets(routineDayId);
        router.refresh();
      });
      return;
    }
    if (!next) return;
    start(async () => {
      const r = await nextSupersetGroup();
      if (!r.ok) return;
      await setSupersetGroup([e.id, next.id], r.data);
      router.refresh();
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map((x) => x.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-2">
          {items.map((e, idx) => {
            const inGroup = e.superset_group != null;
            const nextInGroup =
              inGroup && items[idx + 1]?.superset_group === e.superset_group;
            const prevInGroup =
              inGroup && items[idx - 1]?.superset_group === e.superset_group;
            return (
              <SortableRow
                key={e.id}
                item={e}
                supersetBadge={inGroup}
                connectBelow={nextInGroup}
                connectAbove={prevInGroup}
                onMenu={() => setMenuFor(e.id)}
                menuOpen={menuFor === e.id}
                onCloseMenu={() => setMenuFor(null)}
                onSwap={() => {
                  setMenuFor(null);
                  onOpenSwap(e);
                }}
                onDelete={() => doDelete(e.id)}
                onToggleSuperset={() => toggleSuperset(e)}
                canGroupWithNext={!!items[idx + 1]}
              />
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  item,
  supersetBadge,
  connectBelow,
  connectAbove,
  onMenu,
  menuOpen,
  onCloseMenu,
  onSwap,
  onDelete,
  onToggleSuperset,
  canGroupWithNext,
}: {
  item: RoutineExerciseRow;
  supersetBadge: boolean;
  connectBelow: boolean;
  connectAbove: boolean;
  onMenu: () => void;
  menuOpen: boolean;
  onCloseMenu: () => void;
  onSwap: () => void;
  onDelete: () => void;
  onToggleSuperset: () => void;
  canGroupWithNext: boolean;
}) {
  const sortable = useSortable({ id: item.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={sortable.setNodeRef}
      style={style}
      className="relative flex items-center gap-2 rounded-xl border border-border bg-background p-2"
    >
      {(connectAbove || connectBelow) && (
        <span
          className="absolute left-1 top-1/2 h-3/4 w-0.5 -translate-y-1/2 rounded bg-primary/60"
          aria-hidden
        />
      )}
      <button
        aria-label="Arrastrar"
        {...sortable.attributes}
        {...sortable.listeners}
        className="flex h-10 w-6 items-center justify-center text-muted-foreground touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <ExerciseMedia
        mediaUrl={item.exercise.media_url}
        frames={item.exercise.media_frames}
        muscleGroupSlug={item.exercise.muscle_group.slug}
        alt={item.exercise.nombre}
        className="h-12 w-12 flex-none rounded-lg"
        minimal
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">
            {item.exercise.nombre}
          </span>
          {supersetBadge && (
            <span className="rounded-full bg-[var(--primary-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              superset
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {item.exercise.tipo_registro === "tiempo"
            ? `${item.series}×${item.duracion_seg}s`
            : `${item.series}×${item.reps_min}-${item.reps_max}`}
        </span>
      </div>
      <button
        aria-label="Más acciones"
        onClick={onMenu}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      <BottomSheet open={menuOpen} onClose={onCloseMenu} title={item.exercise.nombre}>
        <div className="flex flex-col gap-2 pb-2">
          <MenuItem Icon={Repeat} label="Cambiar ejercicio" onClick={onSwap} />
          <MenuItem
            Icon={supersetBadge ? Link2Off : Link2}
            label={supersetBadge ? "Quitar del superset" : "Agrupar con el siguiente"}
            onClick={onToggleSuperset}
            disabled={!supersetBadge && !canGroupWithNext}
            hint={
              supersetBadge
                ? "Vuelve a ser un ejercicio común"
                : "Para alternar serie por serie en la sesión"
            }
          />
          <MenuItem Icon={Check} label="Listo" onClick={onCloseMenu} />
          <MenuItem Icon={Trash2} label="Eliminar" onClick={onDelete} danger />
        </div>
      </BottomSheet>
    </li>
  );
}

function MenuItem({
  Icon,
  label,
  hint,
  onClick,
  danger = false,
  disabled = false,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex min-h-12 items-center gap-3 rounded-xl border border-border bg-background px-4 text-left disabled:opacity-50",
        danger ? "text-destructive" : "text-foreground",
      ].join(" ")}
    >
      <Icon className={`h-4 w-4 ${danger ? "text-destructive" : "text-primary"}`} />
      <span className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

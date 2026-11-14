"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Star, X } from "lucide-react";
import type { Equipment, MuscleGroup } from "@/modules/exercises/types";

type Props = {
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
};

export function ExerciseFilters({ muscleGroups, equipment }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const mg = searchParams.get("mg") ?? "";
  const eq = searchParams.get("eq") ?? "";
  const fav = searchParams.get("fav") === "1";

  const [text, setText] = useState(q);

  // Debounce del buscador: 250 ms.
  useEffect(() => {
    const t = setTimeout(() => {
      if (text === q) return;
      updateParam("q", text);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Buscar ejercicio"
          className="min-h-12 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-base outline-none focus:border-primary"
        />
        {text && (
          <button
            onClick={() => setText("")}
            aria-label="Limpiar"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => updateParam("fav", fav ? "" : "1")}
          className={[
            "flex min-h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition",
            fav
              ? "border-primary bg-[var(--primary-soft)] text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          <Star className={"h-3 w-3 " + (fav ? "fill-primary" : "")} />
          Favoritos
        </button>
      </div>
      <ChipRow
        items={muscleGroups}
        active={mg}
        onPick={(slug) => updateParam("mg", mg === slug ? "" : slug)}
        allLabel="Todos"
      />
      <ChipRow
        items={equipment}
        active={eq}
        onPick={(slug) => updateParam("eq", eq === slug ? "" : slug)}
        allLabel="Cualquier equipo"
      />
    </div>
  );
}

function ChipRow({
  items,
  active,
  onPick,
  allLabel,
}: {
  items: { slug: string; nombre: string }[];
  active: string;
  onPick: (slug: string) => void;
  allLabel: string;
}) {
  return (
    <div
      className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex w-max items-center gap-2">
        <Chip active={active === ""} onClick={() => onPick("")}>
          {allLabel}
        </Chip>
        {items.map((it) => (
          <Chip
            key={it.slug}
            active={active === it.slug}
            onClick={() => onPick(it.slug)}
          >
            {it.nombre}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition",
        active
          ? "border-primary bg-[var(--primary-soft)] text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

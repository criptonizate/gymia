// =========================================================================
// RuleBasedGenerator (SPEC §6)
// Funciones puras. Determinístico si se pasa seed.
// =========================================================================

import type { ExerciseWithRelations, Nivel, Patron } from "@/modules/exercises/types";
import type {
  GeneratorConfig,
  PlannedDay,
  PlannedExercise,
  RoutineGenerator,
  RoutinePlan,
} from "./types";
import { makeRng, shuffle } from "./rng";
import { CORE_PATRON_ROTATION, pickSplit, type Slot } from "./templates";
import { prescripcion } from "./prescription";
import { equipmentForEntorno } from "./types";

const NIVELES_ORDER: Nivel[] = ["principiante", "intermedio", "avanzado"];

function nivelAtLeast(ex: Nivel, floor: Nivel): boolean {
  return NIVELES_ORDER.indexOf(ex) >= NIVELES_ORDER.indexOf(floor);
}

function isCorePatron(p: Patron): boolean {
  return p.startsWith("core_");
}

function matchSlot(
  ex: ExerciseWithRelations,
  slot: Slot,
  nivel: Nivel,
): boolean {
  // Filtro por nivel (no sugerir ejercicios por encima del nivel del user)
  if (!nivelAtLeast(nivel, ex.nivel_minimo)) return false;

  if (slot.kind === "core") {
    if (!isCorePatron(ex.patron)) return false;
  } else if (slot.kind === "compuesto") {
    if (ex.tipo !== "compuesto") return false;
    if (isCorePatron(ex.patron)) return false;
  } else {
    // aislamiento
    if (ex.tipo !== "aislamiento") return false;
    if (isCorePatron(ex.patron)) return false;
  }

  if (slot.patrones && !slot.patrones.includes(ex.patron)) return false;

  if (slot.musculo && slot.musculo.length) {
    const mg = ex.muscle_group.slug;
    const matchPrimary = slot.musculo.includes(mg);
    if (!matchPrimary) return false;
  }
  return true;
}

function scoreCandidate(
  ex: ExerciseWithRelations,
  slot: Slot,
  opts: {
    bannedToday: Set<string>;
    bannedPrevDay: Set<string>;
    bannedSameWeekPatron: Set<string>;
    preferredPrevWeek?: string;
    avoidPrevWeeks?: Set<string>;
    forceCable: boolean;
    rng: () => number;
  },
): number {
  // Blockers (no eligibles):
  if (opts.bannedToday.has(ex.id)) return -Infinity;
  if (opts.bannedPrevDay.has(ex.id)) return -Infinity;

  let score = 0;

  // Mantener el compuesto principal de la semana previa (estabilidad para progresar)
  if (opts.preferredPrevWeek === ex.id) score += 50;

  // Rotación entre semanas para accesorios/core: evitar los ya usados
  if (opts.avoidPrevWeeks?.has(ex.id)) score -= 30;

  // Evitar repetir el mismo patrón en el día (para core, sobre todo)
  if (opts.bannedSameWeekPatron.has(ex.patron)) score -= 5;

  // Bonus si se prefiere polea para ese slot
  if (slot.preferirPolea && ex.equipment.slug === "polea") score += 10;

  // Si estamos forzando que haya polea hoy
  if (opts.forceCable && ex.equipment.slug === "polea") score += 100;

  // Tiebreak determinístico
  score += opts.rng() * 2;
  return score;
}

// --------------------------- Generador ----------------------------------

export const RuleBasedGenerator: RoutineGenerator = {
  generate(config, catalog, seed = 42): RoutinePlan {
    const rng = makeRng(seed);
    // Filtramos el catálogo según entorno. null → sin filtro (gym).
    const entorno = config.entorno ?? "gimnasio";
    const allowed = equipmentForEntorno(entorno);
    const usableCatalog = allowed
      ? catalog.filter((e) => allowed.includes(e.equipment.slug))
      : catalog;
    const { templates, split } = pickSplit(
      config.diasPorSemana,
      config.nivel,
      config.objetivo,
    );

    // Memoria entre semanas:
    //   usedByWeekSlot[week][dayIdx][slotIdx] = exerciseId
    const usedByWeekSlot: string[][][] = [];

    const dias: PlannedDay[] = [];

    for (let w = 0; w < config.semanas; w++) {
      usedByWeekSlot[w] = [];
      // "usada el día previo" → se vacía al cambiar de semana
      let prevDayExIds: Set<string> = new Set();
      // Patrón de core del día previo (evitar repetir)
      let prevCorePatron: Patron | null = null;

      for (let d = 0; d < templates.length; d++) {
        const template = templates[d];
        usedByWeekSlot[w][d] = [];

        const todayIds = new Set<string>();
        const todayPatrones = new Set<Patron>();
        const picked: PlannedExercise[] = [];
        let hasCableNonCore = false;

        // Core patrón "objetivo" para este día (rotar entre días)
        const basePatron = CORE_PATRON_ROTATION[(d + w) % CORE_PATRON_ROTATION.length];
        const corePatronesPreferidos = (
          prevCorePatron
            ? CORE_PATRON_ROTATION.filter((p) => p !== prevCorePatron)
            : CORE_PATRON_ROTATION
        );

        for (let s = 0; s < template.slots.length; s++) {
          const slot = template.slots[s];

          // Algún slot no-core queda sin cubrir y faltan opciones → se
          // intentará garantizar la polea con forceCable=true más abajo.
          // En casa no hay polea, así que no forzamos nada.
          const isLastNonCore =
            entorno === "gimnasio" &&
            slot.kind !== "core" &&
            !hasCableNonCore &&
            !template.slots
              .slice(s + 1)
              .some((rest) => rest.kind !== "core");
          const forceCable = isLastNonCore;

          // Candidatos base que matchean el slot
          let candidates = usableCatalog.filter((e) => matchSlot(e, slot, config.nivel));

          if (slot.kind === "core") {
            // Preferir el patrón rotacional del día; si no, cualquier core
            // distinto al del día anterior.
            const preferred = candidates.filter((e) => e.patron === basePatron);
            const alt = candidates.filter((e) =>
              corePatronesPreferidos.includes(e.patron),
            );
            candidates = preferred.length ? preferred : alt.length ? alt : candidates;
          }

          // Memoria entre semanas por (día, slot)
          const preferredPrevWeek =
            slot.kind === "compuesto" && w >= 1
              ? usedByWeekSlot[w - 1]?.[d]?.[s]
              : undefined;
          const avoidPrevWeeks =
            slot.kind !== "compuesto"
              ? new Set(
                  Array.from({ length: w }, (_, pw) => usedByWeekSlot[pw]?.[d]?.[s]).filter(
                    (x): x is string => !!x,
                  ),
                )
              : undefined;

          // Compuestos: hipertrofia/general rotan cada 2 semanas; fuerza los
          // mantiene todo el plan (sin rotación forzada) para medir
          // progresión linear sin cambiar el RM de comparación.
          let finalPreferredPrevWeek = preferredPrevWeek;
          if (
            preferredPrevWeek &&
            slot.kind === "compuesto" &&
            w >= 2 &&
            config.objetivo !== "fuerza"
          ) {
            const usedTwoWeeksStraight =
              usedByWeekSlot[w - 1]?.[d]?.[s] === preferredPrevWeek &&
              usedByWeekSlot[w - 2]?.[d]?.[s] === preferredPrevWeek;
            if (usedTwoWeeksStraight) finalPreferredPrevWeek = undefined;
          }

          // Elegir el mejor candidato
          const scored = candidates.map((e) => ({
            ex: e,
            score: scoreCandidate(e, slot, {
              bannedToday: todayIds,
              bannedPrevDay: prevDayExIds,
              bannedSameWeekPatron: todayPatrones,
              preferredPrevWeek: finalPreferredPrevWeek,
              avoidPrevWeeks,
              forceCable,
              rng,
            }),
          }));

          scored.sort((a, b) => b.score - a.score);
          const chosen = scored[0]?.score !== -Infinity ? scored[0]?.ex : undefined;

          // Fallback: si nada pegó, relajar restricciones (ignorar prev-day)
          const picked_ex =
            chosen ??
            (() => {
              const relaxed = usableCatalog.filter((e) =>
                matchSlot(e, slot, config.nivel),
              );
              return shuffle(relaxed, rng)[0];
            })();

          if (!picked_ex) continue;

          todayIds.add(picked_ex.id);
          todayPatrones.add(picked_ex.patron);
          usedByWeekSlot[w][d][s] = picked_ex.id;

          if (slot.kind !== "core" && picked_ex.equipment.slug === "polea") {
            hasCableNonCore = true;
          }

          const presc = prescripcion(
            config.objetivo,
            picked_ex.tipo,
            picked_ex.tipo_registro,
            config.nivel,
            picked_ex.muscle_group.slug,
          );

          picked.push({
            orden: s + 1,
            exercise_id: picked_ex.id,
            exercise_slug: picked_ex.slug,
            nombre: picked_ex.nombre,
            patron: picked_ex.patron,
            tipo: picked_ex.tipo,
            tipo_registro: picked_ex.tipo_registro,
            muscle_group_slug: picked_ex.muscle_group.slug,
            equipment_slug: picked_ex.equipment.slug,
            ...presc,
            rir_objetivo: presc.rir_objetivo ?? null,
          });

          if (slot.kind === "core") prevCorePatron = picked_ex.patron;
        }

        dias.push({
          semana: w + 1,
          orden: d + 1,
          nombre: `Semana ${w + 1} · Día ${String.fromCharCode(65 + d)} – ${template.split_label}`,
          split_label: template.split_label,
          ejercicios: picked,
        });

        prevDayExIds = todayIds;
      }
    }

    return {
      nombre: nombreRutina(config, split),
      split,
      dias_por_semana: config.diasPorSemana,
      semanas: config.semanas,
      nivel: config.nivel,
      objetivo: config.objetivo,
      entorno,
      dias,
    };
  },
};

function nombreRutina(cfg: GeneratorConfig, split: string): string {
  const objMap: Record<string, string> = {
    hipertrofia: "Hipertrofia",
    fuerza: "Fuerza",
    general: "Acondicionamiento",
  };
  return `${objMap[cfg.objetivo]} · ${cfg.diasPorSemana}d/sem · ${cfg.semanas} sem · ${split}`;
}

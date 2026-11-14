import type { DiasSemana, Nivel, Objetivo, Patron } from "./types";

export type SlotKind = "compuesto" | "aislamiento" | "core";

/**
 * Un "slot" describe qué ejercicio buscar para un hueco del día.
 * El selector del generador filtra el catálogo por los campos indicados.
 */
export type Slot = {
  kind: SlotKind;
  /** Si está vacío acepta cualquier patrón del `kind`. */
  patrones?: Patron[];
  /** Grupo muscular principal (slug). */
  musculo?: string[];
  /** Si true, intentará elegir un ejercicio con equipamiento "polea".
   *  El algoritmo ya se asegura de que haya al menos una polea por día. */
  preferirPolea?: boolean;
};

export type DayTemplate = {
  split_label: string; // ej "Empuje", "Torso", "Full A"
  slots: Slot[];
};

// --------------------------- Días base ----------------------------------

const DIA_EMPUJE: DayTemplate = {
  split_label: "Empuje",
  slots: [
    { kind: "compuesto", patrones: ["empuje_horizontal"], musculo: ["pecho"] },
    { kind: "compuesto", patrones: ["empuje_vertical"], musculo: ["hombros"] },
    { kind: "aislamiento", musculo: ["pecho"], preferirPolea: true },
    { kind: "aislamiento", musculo: ["hombros"], preferirPolea: true },
    { kind: "aislamiento", musculo: ["triceps"], preferirPolea: true },
    { kind: "core" },
  ],
};

const DIA_TIRON: DayTemplate = {
  split_label: "Tirón",
  slots: [
    { kind: "compuesto", patrones: ["traccion_vertical"], musculo: ["espalda"] },
    { kind: "compuesto", patrones: ["traccion_horizontal"], musculo: ["espalda"] },
    { kind: "aislamiento", musculo: ["espalda"], preferirPolea: true },
    { kind: "aislamiento", musculo: ["biceps"], preferirPolea: true },
    { kind: "aislamiento", musculo: ["hombros"] }, // trasero
    { kind: "core" },
  ],
};

const DIA_PIERNAS: DayTemplate = {
  split_label: "Piernas",
  slots: [
    { kind: "compuesto", patrones: ["sentadilla"], musculo: ["cuadriceps"] },
    { kind: "compuesto", patrones: ["bisagra"], musculo: ["isquios"] },
    { kind: "aislamiento", musculo: ["cuadriceps"] },
    { kind: "aislamiento", musculo: ["gluteos"], preferirPolea: true },
    { kind: "aislamiento", musculo: ["gemelos"] },
    { kind: "core" },
  ],
};

// Variante para FUERZA con peso muerto convencional como main lift
// (mg=espalda, patron=bisagra).
const DIA_PIERNAS_FUERZA: DayTemplate = {
  split_label: "Piernas · fuerza",
  slots: [
    { kind: "compuesto", patrones: ["sentadilla"], musculo: ["cuadriceps"] },
    { kind: "compuesto", patrones: ["bisagra"], musculo: ["espalda"] },
    { kind: "aislamiento", musculo: ["cuadriceps"] },
    { kind: "aislamiento", musculo: ["gluteos"], preferirPolea: true },
    { kind: "aislamiento", musculo: ["gemelos"] },
    { kind: "core" },
  ],
};

// Variante POSTERIOR-dominante para no pisar cuádriceps 2 días seguidos
// en el split de 5 días.
const DIA_PIERNAS_POST: DayTemplate = {
  split_label: "Pierna (posterior)",
  slots: [
    { kind: "compuesto", patrones: ["bisagra"], musculo: ["isquios"] },
    { kind: "compuesto", patrones: ["bisagra"], musculo: ["gluteos"] },
    { kind: "aislamiento", musculo: ["isquios"] },
    { kind: "aislamiento", musculo: ["gluteos"], preferirPolea: true },
    { kind: "aislamiento", musculo: ["gemelos"] },
    { kind: "core" },
  ],
};

const DIA_TORSO: DayTemplate = {
  split_label: "Torso",
  slots: [
    { kind: "compuesto", patrones: ["empuje_horizontal"], musculo: ["pecho"] },
    { kind: "compuesto", patrones: ["traccion_vertical", "traccion_horizontal"], musculo: ["espalda"] },
    { kind: "compuesto", patrones: ["empuje_vertical"], musculo: ["hombros"] },
    { kind: "aislamiento", musculo: ["pecho"], preferirPolea: true },
    { kind: "aislamiento", musculo: ["espalda"], preferirPolea: true },
    { kind: "aislamiento", musculo: ["hombros"] },
    { kind: "core" },
  ],
};

const DIA_FULL_A: DayTemplate = {
  split_label: "Full A",
  slots: [
    { kind: "compuesto", patrones: ["sentadilla"], musculo: ["cuadriceps"] },
    { kind: "compuesto", patrones: ["empuje_horizontal"], musculo: ["pecho"] },
    { kind: "compuesto", patrones: ["traccion_vertical", "traccion_horizontal"], musculo: ["espalda"] },
    { kind: "aislamiento", musculo: ["hombros"], preferirPolea: true },
    { kind: "aislamiento", musculo: ["biceps", "triceps"], preferirPolea: true },
    { kind: "core" },
  ],
};

const DIA_FULL_B: DayTemplate = {
  split_label: "Full B",
  slots: [
    { kind: "compuesto", patrones: ["bisagra"], musculo: ["isquios", "gluteos"] },
    { kind: "compuesto", patrones: ["empuje_vertical"], musculo: ["hombros"] },
    { kind: "compuesto", patrones: ["traccion_horizontal", "traccion_vertical"], musculo: ["espalda"] },
    { kind: "aislamiento", musculo: ["cuadriceps"] },
    { kind: "aislamiento", musculo: ["triceps", "biceps"], preferirPolea: true },
    { kind: "core" },
  ],
};

const DIA_FULL_C: DayTemplate = {
  split_label: "Full C",
  slots: [
    { kind: "compuesto", patrones: ["sentadilla"], musculo: ["cuadriceps"] },
    { kind: "compuesto", patrones: ["empuje_horizontal"], musculo: ["pecho"] },
    { kind: "compuesto", patrones: ["traccion_horizontal"], musculo: ["espalda"] },
    { kind: "aislamiento", musculo: ["isquios", "gluteos"], preferirPolea: true },
    { kind: "aislamiento", musculo: ["gemelos"] },
    { kind: "core" },
  ],
};

// --------------------------- Selección de split --------------------------

export function pickSplit(
  dias: DiasSemana,
  nivel: Nivel,
  objetivo: Objetivo = "hipertrofia",
): { split: string; templates: DayTemplate[] } {
  // Si el objetivo es fuerza y el user es int+, el día de pierna arranca
  // con peso muerto convencional.
  const legsMain =
    objetivo === "fuerza" && nivel !== "principiante"
      ? DIA_PIERNAS_FUERZA
      : DIA_PIERNAS;

  if (dias === 2) {
    return { split: "Full body A / B", templates: [DIA_FULL_A, DIA_FULL_B] };
  }
  if (dias === 3) {
    if (nivel === "principiante") {
      return {
        split: "Full body A / B / C",
        templates: [DIA_FULL_A, DIA_FULL_B, DIA_FULL_C],
      };
    }
    return {
      split: "Empuje / Tirón / Piernas",
      templates: [DIA_EMPUJE, DIA_TIRON, legsMain],
    };
  }
  if (dias === 4) {
    return {
      split: "Torso / Pierna / Torso / Pierna",
      templates: [DIA_TORSO, legsMain, DIA_TORSO, DIA_PIERNAS_POST],
    };
  }
  if (dias === 5) {
    return {
      split: "Empuje / Tirón / Piernas · cuád / Torso / Pierna · posterior",
      templates: [DIA_EMPUJE, DIA_TIRON, legsMain, DIA_TORSO, DIA_PIERNAS_POST],
    };
  }
  // 6 días: PPL duplicado (avanzados). Alternamos dominancia en los días
  // de pierna para no fatigar en exceso un mismo grupo.
  return {
    split: "Empuje / Tirón / Piernas · cuád / Empuje / Tirón / Pierna · posterior",
    templates: [
      DIA_EMPUJE,
      DIA_TIRON,
      legsMain,
      DIA_EMPUJE,
      DIA_TIRON,
      DIA_PIERNAS_POST,
    ],
  };
}

// --------------------------- Core rotation -------------------------------

/** Rota el patrón de core para no repetirlo en días seguidos. */
export const CORE_PATRON_ROTATION: Patron[] = [
  "core_antiextension",
  "core_flexion",
  "core_antirotacion",
  "core_lateral",
];

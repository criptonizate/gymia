// =========================================================================
// Reglas de progresión (SPEC §7). Lógica pura, 100% testeable.
// =========================================================================

export type TipoRegistro = "peso_reps" | "reps" | "tiempo";

export type SetResult = {
  completada: boolean;
  peso_kg?: number | null;
  reps?: number | null;
  duracion_seg?: number | null;
};

export type CurrentTarget = {
  tipo_registro: TipoRegistro;
  equipment_slug: string;
  peso_objetivo_kg?: number | null;
  reps_min?: number | null;
  reps_max?: number | null;
  duracion_seg?: number | null;
  series: number;
};

export type Suggestion =
  | {
      kind: "bajar_peso";
      nuevo_peso_kg: number;
      reps_min?: number | null;
      reps_max?: number | null;
      descripcion: string;
    }
  | {
      kind: "bajar_reps";
      nueva_reps_min: number;
      nueva_reps_max: number;
      peso_kg?: number | null;
      descripcion: string;
    }
  | {
      kind: "igual";
      descripcion: string;
    }
  | {
      kind: "subir_peso";
      nuevo_peso_kg: number;
      descripcion: string;
    }
  | {
      kind: "subir_tiempo";
      nueva_duracion_seg: number;
      descripcion: string;
    };

// --------------------------- Escalones de peso ---------------------------

/** 2,5 kg en mancuernas, polea y barra Z; 5 kg en barra/máquina/smith. */
export function weightStep(equipmentSlug: string): number {
  switch (equipmentSlug) {
    case "mancuernas":
    case "polea":
    case "barra-z":
      return 2.5;
    case "barra":
    case "maquina":
    case "smith":
      return 5;
    default:
      return 2.5;
  }
}

// --------------------------- Helpers -------------------------------------

function round(n: number, step: number): number {
  return Math.round(n / step) * step;
}

function sumTarget(cur: CurrentTarget): number {
  const target = cur.reps_max ?? cur.reps_min ?? 0;
  return target * cur.series;
}

function sumDone(results: SetResult[]): number {
  return results.reduce((acc, r) => acc + (r.reps ?? 0), 0);
}

// --------------------------- Análisis ------------------------------------

export type SessionAnalysis = {
  /** Todas las series alcanzaron o superaron el reps_max del objetivo. */
  supero: boolean;
  /** Al menos una serie no llegó al objetivo (todas las series marcadas). */
  noLlego: boolean;
  /** Fracción de reps faltantes vs objetivo total (0 = llegó, 1 = nada). */
  faltanteRatio: number;
  /** Para tiempo: completó todas las series según `completada`. */
  tiempoCompleto: boolean;
};

export function analyze(
  target: CurrentTarget,
  results: SetResult[],
): SessionAnalysis {
  if (target.tipo_registro === "tiempo") {
    const completas = results.filter((r) => r.completada).length;
    const tiempoCompleto =
      completas === target.series && results.length === target.series;
    return {
      supero: tiempoCompleto,
      noLlego: !tiempoCompleto,
      faltanteRatio: tiempoCompleto ? 0 : 1 - completas / target.series,
      tiempoCompleto,
    };
  }

  const topeReps = target.reps_max ?? target.reps_min ?? 0;
  const totalObjetivo = sumTarget(target);
  const totalHecho = sumDone(results);
  const faltante = Math.max(0, totalObjetivo - totalHecho);
  const faltanteRatio = totalObjetivo > 0 ? faltante / totalObjetivo : 0;
  const allAtOrAboveTope =
    topeReps > 0 &&
    results.length === target.series &&
    results.every((r) => (r.reps ?? 0) >= topeReps);

  return {
    supero: allAtOrAboveTope,
    noLlego: faltanteRatio > 0,
    faltanteRatio,
    tiempoCompleto: true,
  };
}

// --------------------------- Opciones del sheet --------------------------

/**
 * Las tres opciones que se muestran cuando el user NO llegó al objetivo.
 * No incluye la lógica de "superé" (eso va en `autoSuggestion` / `suggestOnSuperar`).
 */
export function suggestOnNoLlegar(
  target: CurrentTarget,
): { bajarPeso: Suggestion; bajarReps: Suggestion; igual: Suggestion } {
  const step = weightStep(target.equipment_slug);
  const curPeso = target.peso_objetivo_kg ?? 0;
  const nuevoPeso = Math.max(0, round(curPeso - step, step));
  const curRepsMin = target.reps_min ?? 8;
  const curRepsMax = target.reps_max ?? 12;
  const nuevaRepsMax = Math.max(curRepsMin, curRepsMax - 2);
  const nuevaRepsMin = Math.max(1, Math.min(curRepsMin, nuevaRepsMax));

  return {
    bajarPeso: {
      kind: "bajar_peso",
      nuevo_peso_kg: nuevoPeso,
      reps_min: curRepsMin,
      reps_max: curRepsMax,
      descripcion:
        target.tipo_registro === "peso_reps"
          ? `Bajar el peso a ${formatKg(nuevoPeso)} manteniendo ${curRepsMin}-${curRepsMax} reps`
          : `Bajar carga manteniendo ${curRepsMin}-${curRepsMax} reps`,
    },
    bajarReps: {
      kind: "bajar_reps",
      nueva_reps_min: nuevaRepsMin,
      nueva_reps_max: nuevaRepsMax,
      peso_kg: curPeso || null,
      descripcion: `Mantener el peso, bajar a ${nuevaRepsMin}-${nuevaRepsMax} reps`,
    },
    igual: { kind: "igual", descripcion: "Dejar igual y volver a intentar" },
  };
}

/** Sugerencia al superar el objetivo (todas las series ≥ reps_max). */
export function suggestOnSuperar(target: CurrentTarget): Suggestion {
  const step = weightStep(target.equipment_slug);
  const curPeso = target.peso_objetivo_kg ?? 0;
  const nuevoPeso = round(curPeso + step, step);
  return {
    kind: "subir_peso",
    nuevo_peso_kg: nuevoPeso,
    descripcion: `Superaste el objetivo. Subí a ${formatKg(nuevoPeso)} la próxima.`,
  };
}

/** Para tiempo: completó todas las series → +5 s. */
export function suggestOnTiempoCompleto(target: CurrentTarget): Suggestion {
  const cur = target.duracion_seg ?? 30;
  return {
    kind: "subir_tiempo",
    nueva_duracion_seg: cur + 5,
    descripcion: `Completaste. Subí a ${cur + 5} s la próxima.`,
  };
}

// --------------------------- Auto-regla 25 % -----------------------------

/**
 * Regla automática si el user no elige nada:
 *  - Faltó < 25 % del total → se mantiene el objetivo.
 *  - Faltó ≥ 25 %           → se baja un escalón de peso.
 *  - Tiempo completo        → +5 s.
 *  - Tiempo incompleto      → se mantiene.
 */
export function autoSuggestion(
  target: CurrentTarget,
  results: SetResult[],
): Suggestion {
  const a = analyze(target, results);

  if (target.tipo_registro === "tiempo") {
    return a.tiempoCompleto
      ? suggestOnTiempoCompleto(target)
      : { kind: "igual", descripcion: "Mantener el tiempo objetivo" };
  }

  if (a.supero) return suggestOnSuperar(target);
  if (a.faltanteRatio >= 0.25) return suggestOnNoLlegar(target).bajarPeso;
  return { kind: "igual", descripcion: "Mantener el objetivo" };
}

// --------------------------- Aplicar sobre target ------------------------

/**
 * Transforma un `CurrentTarget` aplicando la sugerencia.
 * Devuelve el objetivo nuevo listo para persistir en `routine_exercises`.
 */
export function applySuggestion(
  target: CurrentTarget,
  s: Suggestion,
): CurrentTarget {
  switch (s.kind) {
    case "bajar_peso":
      return { ...target, peso_objetivo_kg: s.nuevo_peso_kg };
    case "bajar_reps":
      return {
        ...target,
        reps_min: s.nueva_reps_min,
        reps_max: s.nueva_reps_max,
      };
    case "igual":
      return target;
    case "subir_peso":
      return { ...target, peso_objetivo_kg: s.nuevo_peso_kg };
    case "subir_tiempo":
      return { ...target, duracion_seg: s.nueva_duracion_seg };
  }
}

// --------------------------- Format utils --------------------------------

function formatKg(n: number): string {
  if (Number.isInteger(n)) return `${n} kg`;
  return `${n.toFixed(1).replace(".", ",")} kg`;
}

import { describe, it, expect } from "vitest";
import {
  analyze,
  applySuggestion,
  autoSuggestion,
  suggestOnNoLlegar,
  suggestOnSuperar,
  suggestOnTiempoCompleto,
  weightStep,
  type CurrentTarget,
  type SetResult,
} from "../index";

function target(overrides: Partial<CurrentTarget> = {}): CurrentTarget {
  return {
    tipo_registro: "peso_reps",
    equipment_slug: "mancuernas",
    peso_objetivo_kg: 20,
    reps_min: 8,
    reps_max: 12,
    series: 3,
    ...overrides,
  };
}

describe("weightStep", () => {
  it("2.5 kg para mancuernas, polea y barra Z", () => {
    expect(weightStep("mancuernas")).toBe(2.5);
    expect(weightStep("polea")).toBe(2.5);
    expect(weightStep("barra-z")).toBe(2.5);
  });
  it("5 kg para barra, máquina y smith", () => {
    expect(weightStep("barra")).toBe(5);
    expect(weightStep("maquina")).toBe(5);
    expect(weightStep("smith")).toBe(5);
  });
});

describe("analyze – peso_reps", () => {
  it("detecta cuando se supera el tope en todas las series", () => {
    const r: SetResult[] = [
      { completada: true, reps: 12, peso_kg: 20 },
      { completada: true, reps: 13, peso_kg: 20 },
      { completada: true, reps: 12, peso_kg: 20 },
    ];
    const a = analyze(target(), r);
    expect(a.supero).toBe(true);
    expect(a.noLlego).toBe(false);
  });

  it("calcula faltante correcto", () => {
    const r: SetResult[] = [
      { completada: true, reps: 10 },
      { completada: true, reps: 9 },
      { completada: true, reps: 8 },
    ];
    // objetivo 12*3 = 36, hecho 27, faltante 9/36 = 0.25
    const a = analyze(target(), r);
    expect(a.supero).toBe(false);
    expect(a.noLlego).toBe(true);
    expect(a.faltanteRatio).toBeCloseTo(0.25, 5);
  });
});

describe("suggestOnSuperar", () => {
  it("sube un escalón (mancuernas = +2.5 kg)", () => {
    const s = suggestOnSuperar(target({ peso_objetivo_kg: 20 }));
    expect(s.kind).toBe("subir_peso");
    if (s.kind === "subir_peso") expect(s.nuevo_peso_kg).toBe(22.5);
  });
  it("sube 5 kg para barra", () => {
    const s = suggestOnSuperar(
      target({ equipment_slug: "barra", peso_objetivo_kg: 60 }),
    );
    if (s.kind === "subir_peso") expect(s.nuevo_peso_kg).toBe(65);
  });
});

describe("suggestOnNoLlegar", () => {
  it("bajar peso respeta escalón", () => {
    const { bajarPeso } = suggestOnNoLlegar(target({ peso_objetivo_kg: 25 }));
    expect(bajarPeso.kind).toBe("bajar_peso");
    if (bajarPeso.kind === "bajar_peso")
      expect(bajarPeso.nuevo_peso_kg).toBe(22.5);
  });

  it("bajar reps propone un rango más bajo", () => {
    const { bajarReps } = suggestOnNoLlegar(
      target({ reps_min: 8, reps_max: 12 }),
    );
    if (bajarReps.kind === "bajar_reps") {
      expect(bajarReps.nueva_reps_max).toBe(10);
      expect(bajarReps.nueva_reps_min).toBeLessThanOrEqual(10);
    }
  });

  it("no baja debajo de 0 kg", () => {
    const { bajarPeso } = suggestOnNoLlegar(
      target({ peso_objetivo_kg: 2.5, equipment_slug: "mancuernas" }),
    );
    if (bajarPeso.kind === "bajar_peso")
      expect(bajarPeso.nuevo_peso_kg).toBe(0);
  });
});

describe("auto 25%", () => {
  it("todas ≥ mínimo pero no en tope → subir reps objetivo", () => {
    // reps_min=8, reps_max=12. Todas ≥ 8 pero debajo de 12 → progresar en reps.
    const r: SetResult[] = [
      { completada: true, reps: 10 },
      { completada: true, reps: 9 },
      { completada: true, reps: 8 },
    ];
    const s = autoSuggestion(target(), r);
    expect(s.kind).toBe("subir_reps");
    if (s.kind === "subir_reps") {
      expect(s.nueva_reps_min).toBe(9);
      expect(s.nueva_reps_max).toBe(12);
    }
  });

  it("última cae por debajo del mínimo y faltante grande → bajar peso", () => {
    // Objetivo 8-12. Última reps=4 (< min 8) y faltante total 60% → bajar.
    const r: SetResult[] = [
      { completada: true, reps: 8 },
      { completada: true, reps: 6 },
      { completada: true, reps: 4 },
    ];
    const s = autoSuggestion(target({ peso_objetivo_kg: 20 }), r);
    expect(s.kind).toBe("bajar_peso");
    if (s.kind === "bajar_peso") expect(s.nuevo_peso_kg).toBe(17.5);
  });

  it("última cae pero faltante moderado → mantener (no penalizar fatiga)", () => {
    // Última=6 (< min 8) pero sólo 22% faltante total — es una mala serie
    // suelta, mantener.
    const r: SetResult[] = [
      { completada: true, reps: 11 },
      { completada: true, reps: 11 },
      { completada: true, reps: 6 },
    ];
    const s = autoSuggestion(target(), r);
    expect(s.kind).toBe("igual");
  });

  it("supera → subir", () => {
    const r: SetResult[] = [
      { completada: true, reps: 12 },
      { completada: true, reps: 12 },
      { completada: true, reps: 12 },
    ];
    const s = autoSuggestion(target(), r);
    expect(s.kind).toBe("subir_peso");
  });
});

describe("tiempo", () => {
  it("todas las series completas → +5 s", () => {
    const t = target({ tipo_registro: "tiempo", duracion_seg: 30, series: 3 });
    const r: SetResult[] = [
      { completada: true, duracion_seg: 30 },
      { completada: true, duracion_seg: 30 },
      { completada: true, duracion_seg: 30 },
    ];
    const s = suggestOnTiempoCompleto(t);
    expect(s.kind).toBe("subir_tiempo");
    if (s.kind === "subir_tiempo") expect(s.nueva_duracion_seg).toBe(35);
    expect(autoSuggestion(t, r).kind).toBe("subir_tiempo");
  });
  it("incompleto → igual", () => {
    const t = target({ tipo_registro: "tiempo", duracion_seg: 40, series: 3 });
    const r: SetResult[] = [
      { completada: true },
      { completada: true },
      { completada: false },
    ];
    expect(autoSuggestion(t, r).kind).toBe("igual");
  });
});

describe("doble progresión", () => {
  it("al tocar el tope en todas las series → +peso", () => {
    const r: SetResult[] = [
      { completada: true, reps: 12 },
      { completada: true, reps: 12 },
      { completada: true, reps: 12 },
    ];
    const s = autoSuggestion(target(), r);
    expect(s.kind).toBe("subir_peso");
  });

  it("todas al tope menos una (mínimo) → sube reps, no peso", () => {
    const r: SetResult[] = [
      { completada: true, reps: 12 },
      { completada: true, reps: 12 },
      { completada: true, reps: 8 },
    ];
    const s = autoSuggestion(target(), r);
    expect(s.kind).toBe("subir_reps");
  });
});

describe("applySuggestion", () => {
  it("baja peso actualiza peso_objetivo_kg", () => {
    const t = target({ peso_objetivo_kg: 20 });
    const s = suggestOnNoLlegar(t).bajarPeso;
    const next = applySuggestion(t, s);
    expect(next.peso_objetivo_kg).toBe(17.5);
    expect(next.reps_min).toBe(8);
  });
  it("sube tiempo actualiza duracion_seg", () => {
    const t = target({
      tipo_registro: "tiempo",
      duracion_seg: 30,
    });
    const next = applySuggestion(t, suggestOnTiempoCompleto(t));
    expect(next.duracion_seg).toBe(35);
  });
});

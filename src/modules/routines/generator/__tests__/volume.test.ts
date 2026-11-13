import { describe, it, expect } from "vitest";
import {
  adjustPlanVolume,
  computeVolume,
  recommendVolume,
} from "../volume";
import { RuleBasedGenerator } from "../rule-based";
import { FIXTURE_CATALOG } from "./fixture";

describe("recommendVolume", () => {
  it("intermedio hipertrofia 3d → pecho 4, biceps 2, core 1/d", () => {
    const v = recommendVolume({
      diasPorSemana: 3,
      semanas: 2,
      nivel: "intermedio",
      objetivo: "hipertrofia",
    });
    expect(v.pecho).toBe(4);
    expect(v.biceps).toBe(2);
    expect(v.core).toBe(1);
  });
  it("principiante baja el volumen, avanzado lo sube", () => {
    const p = recommendVolume({
      diasPorSemana: 3, semanas: 1, nivel: "principiante", objetivo: "hipertrofia",
    });
    const a = recommendVolume({
      diasPorSemana: 3, semanas: 1, nivel: "avanzado", objetivo: "hipertrofia",
    });
    expect(p.pecho).toBeLessThan(a.pecho);
  });
});

describe("computeVolume", () => {
  it("cuenta ejercicios por grupo en el plan", () => {
    const plan = RuleBasedGenerator.generate(
      {
        diasPorSemana: 3, semanas: 1, nivel: "intermedio", objetivo: "hipertrofia",
      },
      FIXTURE_CATALOG,
      1,
    );
    const v = computeVolume(plan);
    expect(v.pecho).toBeGreaterThan(0);
    expect(v.cuadriceps).toBeGreaterThan(0);
    expect(v.core).toBeGreaterThanOrEqual(1);
  });
});

describe("adjustPlanVolume", () => {
  it("sube pecho y respeta el objetivo", () => {
    const cfg = {
      diasPorSemana: 3, semanas: 1, nivel: "intermedio", objetivo: "hipertrofia",
    } as const;
    const plan = RuleBasedGenerator.generate(cfg, FIXTURE_CATALOG, 1);
    const current = computeVolume(plan);
    const target = { ...recommendVolume(cfg), pecho: current.pecho + 2 };
    const adjusted = adjustPlanVolume(plan, target, FIXTURE_CATALOG, 7);
    const after = computeVolume(adjusted);
    expect(after.pecho).toBe(target.pecho);
  });

  it("baja biceps sin tocar compuestos", () => {
    const cfg = {
      diasPorSemana: 3, semanas: 1, nivel: "intermedio", objetivo: "hipertrofia",
    } as const;
    const plan = RuleBasedGenerator.generate(cfg, FIXTURE_CATALOG, 1);
    const target = { ...recommendVolume(cfg), biceps: 1 };
    const adjusted = adjustPlanVolume(plan, target, FIXTURE_CATALOG, 7);
    const after = computeVolume(adjusted);
    expect(after.biceps).toBeLessThanOrEqual(1);
    // compuestos del plan original siguen presentes
    const comps = plan.dias.flatMap((d) =>
      d.ejercicios.filter((e) => e.tipo === "compuesto"),
    );
    const compIds = new Set(comps.map((e) => e.exercise_id));
    const stillHasComps = adjusted.dias.flatMap((d) =>
      d.ejercicios.filter((e) => compIds.has(e.exercise_id)),
    );
    expect(stillHasComps.length).toBe(comps.length);
  });

  it("ajusta core por día", () => {
    const cfg = {
      diasPorSemana: 3, semanas: 1, nivel: "intermedio", objetivo: "hipertrofia",
    } as const;
    const plan = RuleBasedGenerator.generate(cfg, FIXTURE_CATALOG, 1);
    const target = { ...recommendVolume(cfg), core: 2 };
    const adjusted = adjustPlanVolume(plan, target, FIXTURE_CATALOG, 7);
    for (const d of adjusted.dias) {
      const cores = d.ejercicios.filter((e) => e.muscle_group_slug === "core");
      expect(cores.length).toBe(2);
    }
  });

  it("deja el orden: compuestos, aislamiento, core", () => {
    const cfg = {
      diasPorSemana: 3, semanas: 1, nivel: "intermedio", objetivo: "hipertrofia",
    } as const;
    const plan = RuleBasedGenerator.generate(cfg, FIXTURE_CATALOG, 1);
    const target = { ...recommendVolume(cfg), pecho: 5 };
    const adjusted = adjustPlanVolume(plan, target, FIXTURE_CATALOG, 7);
    for (const d of adjusted.dias) {
      let state: "comp" | "ais" | "core" = "comp";
      for (const e of d.ejercicios) {
        const kind = e.muscle_group_slug === "core" ? "core" : e.tipo === "compuesto" ? "comp" : "ais";
        if (state === "comp" && kind !== "comp") state = kind;
        else if (state === "ais" && kind === "comp") {
          throw new Error(`orden roto en ${d.nombre}: ${kind} después de aislamiento`);
        } else if (state === "core" && kind !== "core") {
          throw new Error(`orden roto en ${d.nombre}: ${kind} después de core`);
        } else if (state !== kind && kind === "core") {
          state = "core";
        }
      }
    }
  });
});

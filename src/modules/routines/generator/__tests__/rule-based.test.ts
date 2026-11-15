import { describe, it, expect } from "vitest";
import { RuleBasedGenerator } from "../rule-based";
import { FIXTURE_CATALOG } from "./fixture";
import type { GeneratorConfig, PlannedDay } from "../types";

function run(cfg: Partial<GeneratorConfig>, seed = 42) {
  return RuleBasedGenerator.generate(
    {
      diasPorSemana: 3,
      semanas: 2,
      nivel: "intermedio",
      objetivo: "hipertrofia",
      ...cfg,
    } as GeneratorConfig,
    FIXTURE_CATALOG,
    seed,
  );
}

// Warmup = primeros 3 ejercicios, Finisher = últimos 2. Los tests de
// invariantes de rutina sólo miran el bloque "main".
const WARMUP = 3;
const FINISHER = 2;
function mainOnly(d: PlannedDay) {
  return d.ejercicios.slice(WARMUP, d.ejercicios.length - FINISHER);
}

describe("RuleBasedGenerator", () => {
  it("es determinístico con la misma semilla", () => {
    const a = run({});
    const b = run({});
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("cambia con otra semilla", () => {
    const a = run({}, 42);
    const b = run({}, 7);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("tiene core en todos los días (main)", () => {
    const plan = run({});
    for (const d of plan.dias) {
      const tieneCore = mainOnly(d).some(
        (e) => e.muscle_group_slug === "core",
      );
      expect(tieneCore, `día ${d.nombre}`).toBe(true);
    }
  });

  it("el core va al final del main", () => {
    const plan = run({});
    for (const d of plan.dias) {
      const main = mainOnly(d);
      const last = main[main.length - 1];
      expect(last.muscle_group_slug).toBe("core");
    }
  });

  it("tiene al menos una polea por día (sin contar el core)", () => {
    const plan = run({});
    for (const d of plan.dias) {
      const nonCore = mainOnly(d).filter(
        (e) => e.muscle_group_slug !== "core",
      );
      const tienePolea = nonCore.some((e) => e.equipment_slug === "polea");
      expect(tienePolea, `día ${d.nombre}`).toBe(true);
    }
  });

  it("no repite el mismo ejercicio en días seguidos (main)", () => {
    const plan = run({ diasPorSemana: 4, semanas: 2 });
    const porSemana = new Map<number, typeof plan.dias>();
    for (const d of plan.dias) {
      const arr = porSemana.get(d.semana) ?? [];
      arr.push(d);
      porSemana.set(d.semana, arr);
    }
    for (const [, dias] of porSemana) {
      for (let i = 1; i < dias.length; i++) {
        const prev = new Set(mainOnly(dias[i - 1]).map((e) => e.exercise_id));
        for (const e of mainOnly(dias[i])) {
          expect(prev.has(e.exercise_id), `repetido en días seguidos: ${e.nombre}`).toBe(false);
        }
      }
    }
  });

  it("cubre los grupos grandes semanalmente", () => {
    const plan = run({});
    const porSemana = new Map<number, typeof plan.dias>();
    for (const d of plan.dias) {
      const arr = porSemana.get(d.semana) ?? [];
      arr.push(d);
      porSemana.set(d.semana, arr);
    }
    const grandes = ["pecho", "espalda", "hombros", "cuadriceps", "isquios"];
    for (const [sem, dias] of porSemana) {
      const presentes = new Set(
        dias.flatMap((d) => mainOnly(d).map((e) => e.muscle_group_slug)),
      );
      for (const g of grandes) {
        expect(presentes.has(g), `semana ${sem} no cubre ${g}`).toBe(true);
      }
    }
  });

  it("las series semanales de grupos grandes caen en [6, 24]", () => {
    const plan = run({});
    const grandes = ["pecho", "espalda", "cuadriceps"];
    const porSemana = new Map<number, Record<string, number>>();
    for (const d of plan.dias) {
      const acc = porSemana.get(d.semana) ?? {};
      for (const e of mainOnly(d)) {
        acc[e.muscle_group_slug] = (acc[e.muscle_group_slug] ?? 0) + e.series;
      }
      porSemana.set(d.semana, acc);
    }
    for (const [sem, acc] of porSemana) {
      for (const g of grandes) {
        const sets = acc[g] ?? 0;
        expect(sets, `semana ${sem} ${g}`).toBeGreaterThanOrEqual(6);
        expect(sets, `semana ${sem} ${g}`).toBeLessThanOrEqual(24);
      }
    }
  });

  it("los accesorios y el core rotan entre semanas", () => {
    const plan = run({ diasPorSemana: 3, semanas: 2 });
    // Comparar semana 1 vs semana 2 por mismo día+slot
    const porSemana: Record<number, (typeof plan.dias)[number][]> = {};
    for (const d of plan.dias) {
      (porSemana[d.semana] ??= []).push(d);
    }
    let accesoriosRotados = 0;
    let totalAccesorios = 0;
    for (let i = 0; i < porSemana[1].length; i++) {
      const w1 = mainOnly(porSemana[1][i]);
      const w2 = mainOnly(porSemana[2][i]);
      for (let s = 0; s < Math.min(w1.length, w2.length); s++) {
        const a = w1[s];
        const b = w2[s];
        const esAcc = a.tipo === "aislamiento" || a.muscle_group_slug === "core";
        if (!esAcc) continue;
        totalAccesorios++;
        if (a.exercise_id !== b.exercise_id) accesoriosRotados++;
      }
    }
    // Al menos la mitad de los accesorios cambian la 2a semana (con el fixture).
    expect(accesoriosRotados / totalAccesorios).toBeGreaterThanOrEqual(0.5);
  });

  it("los compuestos se mantienen entre semanas (estabilidad para progresar)", () => {
    const plan = run({ diasPorSemana: 3, semanas: 2 });
    const porSemana: Record<number, (typeof plan.dias)[number][]> = {};
    for (const d of plan.dias) {
      (porSemana[d.semana] ??= []).push(d);
    }
    let compEstables = 0;
    let totalComp = 0;
    for (let i = 0; i < porSemana[1].length; i++) {
      const w1 = mainOnly(porSemana[1][i]);
      const w2 = mainOnly(porSemana[2][i]);
      for (let s = 0; s < Math.min(w1.length, w2.length); s++) {
        if (w1[s].tipo !== "compuesto") continue;
        totalComp++;
        if (w1[s].exercise_id === w2[s].exercise_id) compEstables++;
      }
    }
    // La mayoría de los compuestos deberían quedarse iguales de semana a semana.
    expect(compEstables / totalComp).toBeGreaterThanOrEqual(0.6);
  });

  it("5 a 7 ejercicios por día (main)", () => {
    const plan = run({ diasPorSemana: 4 });
    for (const d of plan.dias) {
      const main = mainOnly(d);
      expect(main.length).toBeGreaterThanOrEqual(5);
      expect(main.length).toBeLessThanOrEqual(7);
    }
  });

  it("incluye warmup (3 ex × 2 series) y finisher (2 ex) de colchoneta", () => {
    const plan = run({});
    for (const d of plan.dias) {
      const warmup = d.ejercicios.slice(0, 3);
      expect(warmup, `warmup día ${d.nombre}`).toHaveLength(3);
      for (const w of warmup) {
        expect(w.series, `warmup ${w.nombre}`).toBe(2);
        expect(w.muscle_group_slug).toBe("core");
      }
      const finisher = d.ejercicios.slice(-2);
      expect(finisher, `finisher día ${d.nombre}`).toHaveLength(2);
      for (const f of finisher) {
        expect(f.muscle_group_slug).toBe("core");
      }
    }
  });

  it("filtra por nivel: principiante no recibe ejercicios avanzados", () => {
    const plan = RuleBasedGenerator.generate(
      {
        diasPorSemana: 3,
        semanas: 1,
        nivel: "principiante",
        objetivo: "hipertrofia",
      },
      FIXTURE_CATALOG,
      1,
    );
    const slugs = plan.dias.flatMap((d) => d.ejercicios.map((e) => e.exercise_slug));
    expect(slugs).not.toContain("dominadas");
  });

  it("aplica series/reps/descanso según objetivo", () => {
    const p = RuleBasedGenerator.generate(
      {
        diasPorSemana: 3,
        semanas: 1,
        nivel: "intermedio",
        objetivo: "fuerza",
      },
      FIXTURE_CATALOG,
      1,
    );
    const compPeso = p.dias[0].ejercicios.find(
      (e) => e.tipo === "compuesto" && e.tipo_registro === "peso_reps",
    )!;
    expect(compPeso.series).toBe(4);
    expect(compPeso.reps_min).toBe(4);
    expect(compPeso.reps_max).toBe(6);
    expect(compPeso.descanso_seg).toBe(150);
  });
});

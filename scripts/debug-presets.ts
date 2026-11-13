import { RuleBasedGenerator } from "@/modules/routines/generator/rule-based";
import { FIXTURE_CATALOG } from "@/modules/routines/generator/__tests__/fixture";
import type { GeneratorConfig } from "@/modules/routines/generator/types";

const CFGS: GeneratorConfig[] = [
  { diasPorSemana: 2, semanas: 2, nivel: "principiante", objetivo: "general" },
  { diasPorSemana: 3, semanas: 4, nivel: "principiante", objetivo: "hipertrofia" },
  { diasPorSemana: 3, semanas: 4, nivel: "intermedio", objetivo: "hipertrofia" },
  { diasPorSemana: 4, semanas: 4, nivel: "intermedio", objetivo: "hipertrofia" },
  { diasPorSemana: 5, semanas: 4, nivel: "avanzado", objetivo: "fuerza" },
];

for (const cfg of CFGS) {
  const p = RuleBasedGenerator.generate(cfg, FIXTURE_CATALOG, 42);
  const totalEx = p.dias.reduce((a, d) => a + d.ejercicios.length, 0);
  console.log(
    `${cfg.diasPorSemana}d ${cfg.nivel} ${cfg.objetivo} → ${p.dias.length} días, ${totalEx} ejercicios`,
  );
  for (const d of p.dias.slice(0, 3)) {
    console.log(`  ${d.nombre}: ${d.ejercicios.length}`);
  }
}

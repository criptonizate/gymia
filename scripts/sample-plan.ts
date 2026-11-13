import { RuleBasedGenerator } from "@/modules/routines/generator/rule-based";
import { FIXTURE_CATALOG } from "@/modules/routines/generator/__tests__/fixture";

const plan = RuleBasedGenerator.generate(
  { diasPorSemana: 3, semanas: 2, nivel: "intermedio", objetivo: "hipertrofia" },
  FIXTURE_CATALOG,
  42,
);

const compact = {
  nombre: plan.nombre,
  split: plan.split,
  nivel: plan.nivel,
  objetivo: plan.objetivo,
  dias: plan.dias.map((d) => ({
    semana: d.semana,
    nombre: d.nombre,
    ejercicios: d.ejercicios.map((e) => ({
      orden: e.orden,
      nombre: e.nombre,
      grupo: e.muscle_group_slug,
      equipo: e.equipment_slug,
      patron: e.patron,
      tipo: e.tipo,
      vol:
        e.tipo_registro === "tiempo"
          ? `${e.series}x${e.duracion_seg}s`
          : `${e.series}x${e.reps_min}-${e.reps_max}`,
      descanso: `${e.descanso_seg}s`,
    })),
  })),
};

console.log(JSON.stringify(compact, null, 2));

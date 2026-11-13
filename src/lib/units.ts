// Utilidades de unidades. La preferencia se guarda en localStorage;
// la base de datos sigue almacenando siempre kg.
export type Unit = "kg" | "lb";

export const KG_TO_LB = 2.2046226218;

export function readUnit(): Unit {
  if (typeof window === "undefined") return "kg";
  try {
    const v = localStorage.getItem("gymia-unit");
    return v === "lb" ? "lb" : "kg";
  } catch {
    return "kg";
  }
}

export function writeUnit(u: Unit): void {
  try {
    localStorage.setItem("gymia-unit", u);
  } catch {
    // noop
  }
}

export function formatWeight(kg: number | null | undefined, unit: Unit): string {
  if (kg == null) return "—";
  if (unit === "lb") {
    const lb = kg * KG_TO_LB;
    const rounded = Math.round(lb * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded} lb` : `${rounded.toString().replace(".", ",")} lb`;
  }
  if (Number.isInteger(kg)) return `${kg} kg`;
  return `${kg.toFixed(1).replace(".", ",")} kg`;
}

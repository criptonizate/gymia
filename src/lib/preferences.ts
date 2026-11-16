// Preferencias locales (no son críticas: localStorage).
export type PresetCountdown = 0 | 3 | 5 | 10;

export function readPresetCountdown(): PresetCountdown {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem("gymia-preset-countdown");
    const n = raw == null ? 0 : Number(raw);
    return (n === 3 || n === 5 || n === 10 ? n : 0) as PresetCountdown;
  } catch {
    return 0;
  }
}

export function writePresetCountdown(n: PresetCountdown): void {
  try {
    localStorage.setItem("gymia-preset-countdown", String(n));
  } catch {
    // noop
  }
}

// --------------------------------------------------------------------------
// Descanso entre series (override global para la sesión).
// null = usar el del ejercicio (routine_exercises.descanso_seg).
// --------------------------------------------------------------------------
const REST_KEY = "gymia-rest-seconds";

export function readRestSeconds(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REST_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.min(600, Math.round(n)) : null;
  } catch {
    return null;
  }
}

export function writeRestSeconds(n: number | null): void {
  try {
    if (n == null) localStorage.removeItem(REST_KEY);
    else localStorage.setItem(REST_KEY, String(n));
  } catch {
    // noop
  }
}

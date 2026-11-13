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

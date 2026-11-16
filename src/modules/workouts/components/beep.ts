// Mini helper para beep/vibración sin dependencias.

let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const W = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = W.AudioContext ?? W.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

/** Debe llamarse dentro de un gesto del usuario (tap). iOS/Safari suspenden
 * el AudioContext hasta que se resume con interacción real. Idempotente. */
export function unlockAudio(): void {
  if (unlocked) return;
  const c = getCtx();
  if (!c) return;
  const done = () => {
    unlocked = true;
  };
  if (c.state === "suspended") {
    c.resume().then(done).catch(() => {});
  } else {
    done();
  }
}

export function beep(ms = 150, freq = 880): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(c.destination);
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, c.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + ms / 1000);
    osc.start();
    osc.stop(c.currentTime + ms / 1000 + 0.05);
  } catch {
    // noop
  }
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // noop
  }
}

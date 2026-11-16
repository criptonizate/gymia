// Narración simple con Web Speech API. No bloquea nada si no está disponible.

let enabled: boolean | null = null;

function supported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function readVoiceEnabled(): boolean {
  if (enabled != null) return enabled;
  if (typeof localStorage === "undefined") return false;
  enabled = localStorage.getItem("gymia-voice") === "1";
  return enabled;
}

export function setVoiceEnabled(v: boolean): void {
  enabled = v;
  try {
    localStorage.setItem("gymia-voice", v ? "1" : "0");
  } catch {
    // noop
  }
}

export function say(text: string): void {
  if (!supported()) return;
  if (!readVoiceEnabled()) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-AR";
    u.rate = 1.05;
    u.volume = 0.9;
    // Cortar lo anterior: si está hablando, lo reemplazamos.
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    // noop
  }
}

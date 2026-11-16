"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

const KEY_TIME = "gymia-reminder-time";
const KEY_ENABLED = "gymia-reminder-enabled";

function scheduleNext(hhmm: string, body: string) {
  if (typeof window === "undefined") return;
  if (Notification.permission !== "granted") return;
  const [h, m] = hhmm.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  const ms = target.getTime() - now.getTime();
  window.setTimeout(() => {
    try {
      new Notification("GYMIA", {
        body,
        icon: "/icon-192.png",
      });
    } catch {
      // noop
    }
    // Reprograma el siguiente día (si la app sigue abierta).
    scheduleNext(hhmm, body);
  }, ms);
}

export function ReminderCard() {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState("19:00");
  const [perm, setPerm] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEnabled(localStorage.getItem(KEY_ENABLED) === "1");
    setTime(localStorage.getItem(KEY_TIME) ?? "19:00");
    if ("Notification" in window) {
      setPerm(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (perm !== "granted") return;
    scheduleNext(time, "Llegó la hora de entrenar. Dale 💪");
  }, [enabled, time, perm]);

  async function toggle() {
    if (!("Notification" in window)) return;
    const next = !enabled;
    if (next && perm !== "granted") {
      const r = await Notification.requestPermission();
      setPerm(r);
      if (r !== "granted") return;
    }
    setEnabled(next);
    localStorage.setItem(KEY_ENABLED, next ? "1" : "0");
  }

  function onTime(v: string) {
    setTime(v);
    localStorage.setItem(KEY_TIME, v);
  }

  const supported = typeof window !== "undefined" && "Notification" in window;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${
            enabled
              ? "bg-[var(--primary-soft)] text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-sm font-semibold">Recordatorio diario</span>
          <span className="text-xs text-muted-foreground">
            {supported
              ? "Aviso para no perder la racha. Funciona con la app abierta."
              : "Tu navegador no soporta notificaciones."}
          </span>
        </div>
        <button
          onClick={toggle}
          disabled={!supported}
          className={`min-h-11 rounded-xl px-3 text-xs font-semibold ${
            enabled
              ? "border border-border bg-background"
              : "bg-primary text-primary-foreground disabled:opacity-60"
          }`}
        >
          {enabled ? "Desactivar" : "Activar"}
        </button>
      </div>
      {enabled && (
        <label className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">Hora</span>
          <input
            type="time"
            value={time}
            onChange={(e) => onTime(e.target.value)}
            className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm tabular-nums outline-none focus:border-primary"
          />
        </label>
      )}
      {perm === "denied" && (
        <p className="text-[11px] text-destructive">
          Las notificaciones están bloqueadas. Activalas desde los permisos del
          sitio en tu navegador.
        </p>
      )}
    </section>
  );
}

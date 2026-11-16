"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Smartphone } from "lucide-react";

type Theme = "dark" | "light" | "auto";

function readTheme(): Theme {
  if (typeof window === "undefined") return "auto";
  const v = localStorage.getItem("gymia-theme") as Theme | null;
  return v ?? "auto";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(t: Theme) {
  const html = document.documentElement;
  const resolved: "dark" | "light" =
    t === "auto" ? (systemPrefersDark() ? "dark" : "light") : t;
  html.classList.toggle("dark", resolved === "dark");
  html.classList.toggle("light", resolved === "light");
  localStorage.setItem("gymia-theme", t);
}

const ORDER: Theme[] = ["auto", "dark", "light"];
const LABEL: Record<Theme, string> = {
  auto: "Automático",
  dark: "Oscuro",
  light: "Claro",
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("auto");

  useEffect(() => {
    const t = readTheme();
    setTheme(t);
    // Re-aplicar al montar para sincronizar con el sistema si está en auto.
    if (t === "auto") applyTheme("auto");
    // Escuchar cambios del sistema sólo en modo auto.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem("gymia-theme") as Theme | null) === "auto") {
        applyTheme("auto");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    applyTheme(next);
    setTheme(next);
  }

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Smartphone;

  return (
    <button
      onClick={cycle}
      className="flex min-h-12 w-full items-center justify-between rounded-xl bg-card px-4 text-left border border-border"
      aria-label="Cambiar tema"
    >
      <span className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <span className="text-base">Tema</span>
      </span>
      <span className="text-sm text-muted-foreground">{LABEL[theme]}</span>
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

function readTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("gymia-theme") as Theme) ?? "dark";
}

function applyTheme(t: Theme) {
  const html = document.documentElement;
  html.classList.toggle("dark", t === "dark");
  html.classList.toggle("light", t === "light");
  localStorage.setItem("gymia-theme", t);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      className="flex min-h-12 w-full items-center justify-between rounded-xl bg-card px-4 text-left border border-border"
      aria-label="Cambiar tema"
    >
      <span className="flex items-center gap-3">
        {theme === "dark" ? (
          <Moon className="h-5 w-5 text-primary" />
        ) : (
          <Sun className="h-5 w-5 text-primary" />
        )}
        <span className="text-base">Tema</span>
      </span>
      <span className="text-sm text-muted-foreground">
        {theme === "dark" ? "Oscuro" : "Claro"}
      </span>
    </button>
  );
}

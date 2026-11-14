"use client";

import { useEffect, useState } from "react";
import { readUnit, type Unit } from "./units";

export function useUnit(): Unit {
  const [unit, setUnit] = useState<Unit>("kg");
  useEffect(() => {
    setUnit(readUnit());
    // Si el user cambia el toggle en /cuenta en otra tab, lo detectamos.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "gymia-unit") setUnit(readUnit());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return unit;
}

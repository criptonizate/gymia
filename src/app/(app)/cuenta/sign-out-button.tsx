"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { clearOfflineQueue } from "@/modules/workouts/offline-queue";

export function SignOutButton() {
  const [pending, start] = useTransition();
  function onClick() {
    start(async () => {
      try {
        await clearOfflineQueue();
      } catch {
        /* noop */
      }
      await signOut();
    });
  }
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium text-destructive hover:bg-accent disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" />
      {pending ? "Cerrando…" : "Cerrar sesión"}
    </button>
  );
}

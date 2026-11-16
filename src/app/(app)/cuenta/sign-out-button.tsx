"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/button";
import { signOut } from "@/lib/auth/actions";
import { clearOfflineQueue } from "@/modules/workouts/offline-queue";
import { clearAllOfflineData } from "@/modules/workouts/offline-session";

export function SignOutButton() {
  const [pending, start] = useTransition();
  function onClick() {
    start(async () => {
      try {
        await Promise.all([clearOfflineQueue(), clearAllOfflineData()]);
      } catch {
        /* noop */
      }
      await signOut();
    });
  }
  return (
    <Button
      variant="outline"
      fullWidth
      onClick={onClick}
      loading={pending}
      loadingText="Cerrando…"
      className="text-destructive"
    >
      {!pending && <LogOut className="h-4 w-4" />}
      Cerrar sesión
    </Button>
  );
}

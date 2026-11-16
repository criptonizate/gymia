"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/button";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  type AuthState,
} from "@/lib/auth/actions";

type Mode = "signin" | "signup";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "signin" ? signInWithEmail : signUpWithEmail,
    undefined,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-3xl font-bold tracking-tight">GYMIA</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "signin" ? "Entrá a tu cuenta" : "Creá tu cuenta"}
        </p>
      </div>

      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent"
        >
          <GoogleIcon /> Continuar con Google
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />o<div className="h-px flex-1 bg-border" />
      </div>

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        {mode === "signup" && (
          <Field
            name="nombre"
            type="text"
            placeholder="Tu nombre"
            autoComplete="name"
            required
          />
        )}
        <Field
          name="email"
          type="email"
          placeholder="Email"
          autoComplete="email"
          required
        />
        <Field
          name="password"
          type="password"
          placeholder="Contraseña"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          minLength={mode === "signup" ? 8 : undefined}
        />

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <Button
          type="submit"
          fullWidth
          loading={pending}
          loadingText="Un momento..."
          className="mt-2"
        >
          {mode === "signin" ? "Entrar" : "Crear cuenta"}
        </Button>
      </form>

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "signin"
          ? "¿No tenés cuenta? Creá una"
          : "¿Ya tenés cuenta? Entrá"}
      </button>
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="min-h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none placeholder:text-muted-foreground focus:border-primary"
    />
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32 29.4 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.7l5.7-5.7C33.9 7.1 29.2 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19 19-8.5 19-19c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.6 19 13 24 13c2.8 0 5.3 1 7.3 2.7l5.7-5.7C33.9 7.1 29.2 5 24 5 16.3 5 9.7 9.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43c5.1 0 9.7-2 13.2-5.1l-6.1-5.2C29 34 26.6 35 24 35c-5.4 0-9.9-3-11.3-7.1l-6.5 5C9.6 38.7 16.2 43 24 43z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.8 4.9l6.1 5.2c-.4.3 6.4-4.7 6.4-14.1 0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}

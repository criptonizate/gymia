import { getProfile } from "@/lib/supabase/profile";
import { OnboardingForm } from "./onboarding-form";

export const instant = false;

export default async function OnboardingPage() {
  const profile = await getProfile();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-6 pt-8 sm:gap-10 sm:pt-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Te damos la bienvenida</h1>
        <p className="text-sm text-muted-foreground">
          Contanos un par de cosas para armar tu rutina.
        </p>
      </header>
      <OnboardingForm nombreInicial={profile?.nombre ?? ""} />
    </main>
  );
}

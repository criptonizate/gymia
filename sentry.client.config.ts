export {};

// Sentry en cliente. Sólo se carga (dynamic import) si NEXT_PUBLIC_SENTRY_DSN
// está presente, así no engorda el bundle si no lo usás.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
  });
}

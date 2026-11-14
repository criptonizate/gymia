export {}; // marcar como módulo para TS

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
      tracesSampleRate: 0.1,
    });
  });
}

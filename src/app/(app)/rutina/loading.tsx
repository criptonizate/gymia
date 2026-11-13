import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-2 px-2 pt-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-56" />
      </header>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
          <Skeleton className="h-4 w-40" />
          {Array.from({ length: 5 }).map((__, j) => (
            <Skeleton key={j} className="h-14" />
          ))}
        </div>
      ))}
    </main>
  );
}

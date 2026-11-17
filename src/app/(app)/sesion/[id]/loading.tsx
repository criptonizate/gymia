import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="flex flex-col gap-4 p-4 pb-24">
      <header className="flex items-center justify-between gap-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-14 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </header>

      <div className="flex flex-col gap-3 px-1">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-36" />
      </div>

      <Skeleton className="aspect-video w-full rounded-2xl" />

      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-xl border border-border bg-card p-2"
          >
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-11 flex-1 rounded-xl" />
            <Skeleton className="h-11 flex-1 rounded-xl" />
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-11 w-11 rounded-full" />
          </div>
        ))}
      </div>
    </main>
  );
}

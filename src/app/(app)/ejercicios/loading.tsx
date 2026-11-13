import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-2 px-2 pt-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-3 w-20" />
      </header>
      <Skeleton className="h-12 w-full" />
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <Skeleton className="h-16 w-16 flex-none rounded-xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

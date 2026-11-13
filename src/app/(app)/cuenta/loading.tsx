import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="flex flex-col gap-4 p-4">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-56" />
      <Skeleton className="h-56" />
      <Skeleton className="h-40" />
    </main>
  );
}

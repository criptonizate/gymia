import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  Icon,
  title,
  body,
  cta,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="mx-4 mt-10 flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
      <div className="rounded-full bg-[var(--primary-soft)] p-3">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      {cta && (
        <Link
          href={cta.href}
          className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-strong)]"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

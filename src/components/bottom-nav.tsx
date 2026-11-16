"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, ListTodo, Dumbbell, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/hoy", label: "Hoy", Icon: CalendarCheck },
  { href: "/rutina", label: "Rutina", Icon: ListTodo },
  { href: "/ejercicios", label: "Ejercicios", Icon: Dumbbell },
  { href: "/cuenta", label: "Cuenta", Icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="glass-nav fixed inset-x-0 bottom-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <span className="absolute inset-x-6 top-0 h-0.5 rounded-b bg-primary" />
                )}
                <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

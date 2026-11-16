"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import type { TrainingDay } from "@/modules/progress/queries";
import { Confetti } from "@/modules/workouts/components/Confetti";

function computeStreak(days: TrainingDay[]): {
  current: number;
  longest: number;
  thisWeek: number;
  weekTarget: number;
} {
  if (days.length === 0)
    return { current: 0, longest: 0, thisWeek: 0, weekTarget: 3 };
  const set = new Set(days.filter((d) => d.sesiones > 0).map((d) => d.dia));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  let current = 0;
  const cursor = new Date(today);
  if (!set.has(fmt(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (set.has(fmt(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const dates = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const s of dates) {
    const d = new Date(s + "T00:00:00");
    if (prev && (d.getTime() - prev.getTime()) / 86_400_000 === 1) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  const weekStart = new Date(today);
  const dow = (today.getDay() + 6) % 7;
  weekStart.setDate(today.getDate() - dow);
  let thisWeek = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    if (set.has(fmt(d))) thisWeek += 1;
  }

  return { current, longest, thisWeek, weekTarget: 3 };
}

export function StreakBadge({
  days,
  weekTarget = 3,
}: {
  days: TrainingDay[];
  weekTarget?: number;
}) {
  const { current, longest, thisWeek } = computeStreak(days);
  const hot = current > 0;
  const metaOk = thisWeek >= weekTarget;
  const [fire, setFire] = useState<number | null>(null);

  useEffect(() => {
    try {
      const key = "gymia-week-celebrated";
      const weekStart = new Date();
      const dow = (weekStart.getDay() + 6) % 7;
      weekStart.setDate(weekStart.getDate() - dow);
      weekStart.setHours(0, 0, 0, 0);
      const stamp = weekStart.toISOString().slice(0, 10);
      if (metaOk && localStorage.getItem(key) !== stamp) {
        setFire(Date.now());
        localStorage.setItem(key, stamp);
      }
    } catch {
      // noop
    }
  }, [metaOk]);

  return (
    <>
      {fire != null && <Confetti trigger={fire} />}
      <section className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <span
          className={`flex h-12 w-12 flex-none items-center justify-center rounded-xl ${
            hot
              ? "bg-[var(--warning-soft)] text-warning"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Flame className="h-6 w-6" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Racha
          </span>
          <span className="text-xl font-bold tabular-nums">
            {current} {current === 1 ? "día" : "días"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Meta semanal: {thisWeek}/{weekTarget}
            {metaOk ? " ✓" : ""} · récord {longest}
          </span>
        </div>
      </section>
    </>
  );
}

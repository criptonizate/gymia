"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/skeleton";

export const WeeklyVolumeChart = dynamic(
  () => import("./WeeklyVolumeChart").then((m) => m.WeeklyVolumeChart),
  { ssr: false, loading: () => <Skeleton className="h-56" /> },
);

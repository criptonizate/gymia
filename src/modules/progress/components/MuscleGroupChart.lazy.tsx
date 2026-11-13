"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/skeleton";

export const MuscleGroupChart = dynamic(
  () => import("./MuscleGroupChart").then((m) => m.MuscleGroupChart),
  { ssr: false, loading: () => <Skeleton className="h-64" /> },
);

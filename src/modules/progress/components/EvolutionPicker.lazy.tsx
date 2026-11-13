"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/skeleton";

export const EvolutionPicker = dynamic(
  () => import("./EvolutionPicker").then((m) => m.EvolutionPicker),
  { ssr: false, loading: () => <Skeleton className="h-64" /> },
);

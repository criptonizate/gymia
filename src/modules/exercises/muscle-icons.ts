import {
  Dumbbell,
  Hand,
  Flame,
  Zap,
  Footprints,
  Target,
  Shield,
  Activity,
  type LucideIcon,
} from "lucide-react";

export function muscleIcon(slug: string): LucideIcon {
  switch (slug) {
    case "pecho":
      return Shield;
    case "espalda":
      return Activity;
    case "hombros":
      return Flame;
    case "biceps":
    case "triceps":
      return Hand;
    case "cuadriceps":
    case "isquios":
    case "gluteos":
    case "gemelos":
      return Footprints;
    case "core":
      return Zap;
    default:
      return Target;
  }
}

export const DefaultIcon = Dumbbell;

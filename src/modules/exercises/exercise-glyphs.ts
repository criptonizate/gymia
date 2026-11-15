// Fallback visual por ejercicio cuando no hay media subida.
// Combina emoji específico por slug + fallback por patron + fallback por
// muscle_group, para que cada ejercicio tenga un glifo distinguible.

import type { Patron } from "@/modules/exercises/types";

const BY_SLUG: Record<string, string> = {
  // Core / colchoneta
  "plancha-frontal": "🧘",
  "plancha-lateral": "🪵",
  "plancha-lateral-reach": "🪵",
  "bird-dog": "🐦",
  "mountain-climbers": "🏃",
  "hollow-rocks": "🍌",
  "v-ups": "📐",
  "toe-touches": "🤸",
  "bicycle-crunches": "🚴",
  "leg-raises-piso": "🦵",
  "russian-twist": "🌀",
  "flutter-kicks": "🏊",
  "crunch-polea": "💥",
  "rueda-abdominal": "☸️",
  "pallof-press": "🛡️",
  "lenador-polea": "🪓",
  "elevacion-piernas-colgado": "🦵",

  // Pecho
  "press-banca-plano-barra": "🏋️",
  "press-banca-plano-mancuernas": "🏋️",
  "press-banca-inclinado-barra": "📈",
  "aperturas-mancuernas": "🫂",
  "cruce-poleas-alto": "✖️",
  "cruce-poleas-bajo": "✖️",
  "pec-deck": "🦋",
  "flexiones-brazo": "💪",
  "flexiones-amplias": "🙌",
  "flexiones-diamante": "💎",
  "flexiones-declinadas": "📉",

  // Espalda
  "jalon-al-pecho-ancho": "⬇️",
  "jalon-al-pecho-neutro": "⬇️",
  "dominadas": "🙋",
  "remo-con-barra": "🚣",
  "remo-mancuerna": "🚣",
  "remo-polea-baja": "🚣",
  "remo-invertido-mesa": "🪑",
  "remo-invertido": "🪑",
  "pullover-polea": "🏹",
  "face-pull": "👤",
  "superman": "🦸",

  // Hombros
  "press-militar-barra": "⬆️",
  "press-hombros-mancuernas": "⬆️",
  "press-hombros-maquina": "⬆️",
  "elevaciones-laterales-mancuernas": "🪽",
  "elevaciones-laterales-polea": "🪽",
  "vuelos-posteriores-mancuernas": "🪽",
  "pec-deck-invertido": "🔙",
  "pike-push-up": "🔺",

  // Brazos
  "curl-barra": "💪",
  "curl-alternado": "💪",
  "curl-polea": "💪",
  "curl-martillo": "🔨",
  "extension-polea-soga": "🪢",
  "extension-polea-barra": "➖",
  "press-frances": "🇫🇷",
  "fondos-banco": "🪑",
  "fondos-paralelas": "🤸",
  "isometria-curl-toalla": "✋",

  // Piernas
  "sentadilla-barra": "🏋️",
  "sentadilla-goblet": "🏺",
  "sentadilla-salto": "🦘",
  "sentadilla-bulgara": "🦵",
  "sentadilla-sumo": "🤼",
  "prensa-45": "📐",
  "hack-sentadilla": "📐",
  "extension-cuadriceps": "🦵",
  "peso-muerto-rumano": "🏋️",
  "curl-femoral-acostado": "🦵",
  "curl-femoral-sentado": "🦵",
  "hip-thrust": "🔥",
  "pull-through-polea": "🪝",
  "patada-gluteo-polea": "🦶",
  "gemelos-parado": "🦶",
  "gemelos-sentado": "🦶",
  "escalador": "🧗",
  "burpees": "💥",
  "zancadas": "🚶",
  "step-up": "📶",
  "puente-gluteo": "🌉",
};

const BY_PATRON: Record<Patron, string> = {
  empuje_horizontal: "🏋️",
  empuje_vertical: "⬆️",
  traccion_horizontal: "🚣",
  traccion_vertical: "⬇️",
  sentadilla: "🦵",
  bisagra: "🏋️",
  aislamiento: "🎯",
  core_antiextension: "🧘",
  core_antirotacion: "🌀",
  core_flexion: "📐",
  core_lateral: "🪵",
} as Record<Patron, string>;

export function exerciseGlyph(opts: {
  slug: string;
  patron?: string;
  muscleSlug?: string;
}): string {
  const bySlug = BY_SLUG[opts.slug];
  if (bySlug) return bySlug;
  if (opts.patron && BY_PATRON[opts.patron as Patron]) {
    return BY_PATRON[opts.patron as Patron];
  }
  // Último recurso por músculo
  switch (opts.muscleSlug) {
    case "core":
      return "🧘";
    case "pecho":
      return "💪";
    case "espalda":
      return "🏋️";
    case "hombros":
      return "⬆️";
    case "biceps":
    case "triceps":
      return "💪";
    case "cuadriceps":
    case "isquios":
    case "gluteos":
    case "gemelos":
      return "🦵";
    default:
      return "🏋️";
  }
}

// Sincroniza media de ejercicios usando free-exercise-db
// (https://github.com/yuhonas/free-exercise-db — dominio público).
// Cada ejercicio tiene 2 imágenes (posición inicial y final).
//
// Correr:
//   npm run sync-fed                 # dry-run, muestra match-rate
//   npm run sync-fed -- --write      # escribe media_frames en la DB
//   npm run sync-fed -- --write --force  # pisa los existentes
//
// Requiere .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (!m) continue;
    const [, k, v] = m;
    if (process.env[k]) continue;
    process.env[k] = v.replace(/^["'](.+)["']$/, "$1");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));
loadEnvFile(join(process.cwd(), ".env"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const WRITE = args.has("--write");
const FORCE = args.has("--force");
const FED_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMG_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Hints: slug nuestro -> término(s) de búsqueda en inglés que funcionan bien
// contra los nombres de free-exercise-db.
const HINTS: Record<string, string[]> = {
  // ---------- Pecho ----------
  "press-banca-plano-barra": ["Barbell Bench Press - Medium Grip", "Bench Press - Powerlifting"],
  "press-banca-plano-mancuernas": ["Dumbbell Bench Press"],
  "press-banca-inclinado-barra": ["Incline Bench Press"],
  "press-banca-inclinado-mancuernas": ["Incline Dumbbell Press"],
  "press-banca-declinado": ["Decline Barbell Bench Press"],
  "aperturas-mancuernas": ["Dumbbell Flyes", "Incline Dumbbell Flyes"],
  "cruce-poleas-alto": ["Cable Crossover"],
  "cruce-poleas-bajo": ["Low Cable Crossover"],
  "pec-deck": ["Butterfly"],
  "press-pecho-maquina": ["Chest Press"],
  "flexiones-brazo": ["Pushups"],
  "flexiones": ["Pushups"],
  "flexiones-amplias": ["Wide-Grip Pushup"],
  "flexiones-diamante": ["Close-Grip Pushup"],
  "flexiones-cerradas": ["Close-Grip Pushup"],
  "flexiones-declinadas": ["Decline Pushup"],
  "flexiones-inclinadas": ["Pushups - Close Triceps Position"],
  "flexiones-hindues": ["Pushups"],
  "flexiones-arqueras": ["Archer Pullup"],
  "flexiones-piramidales": ["Pushups"],
  "fondos-banco": ["Bench Dips"],
  "fondos-paralelas": ["Dips - Chest Version", "Dips - Triceps Version"],

  // ---------- Espalda ----------
  "jalon-al-pecho-ancho": ["Wide-Grip Lat Pulldown"],
  "jalon-al-pecho-neutro": ["V-Bar Pulldown"],
  "dominadas": ["Pullups"],
  "dominadas-asistidas": ["Pullups"],
  "remo-con-barra": ["Bent Over Barbell Row"],
  "remo-mancuerna": ["One-Arm Dumbbell Row"],
  "remo-polea-baja": ["Seated Cable Rows"],
  "remo-maquina": ["Machine-Assisted Pull-Up"],
  "remo-invertido": ["Bodyweight Row"],
  "remo-invertido-mesa": ["Bodyweight Row"],
  "pullover-polea": ["Straight-Arm Pulldown"],
  "pullover-mancuerna": ["Dumbbell Pullover"],
  "face-pull": ["Face Pull"],
  "superman": ["Flutter Kicks"],
  "superman-alternado": ["Flutter Kicks"],
  "peso-muerto-rumano": ["Romanian Deadlift"],
  "peso-muerto-barra": ["Barbell Deadlift"],
  "peso-muerto-una-pierna": ["Single-Leg Deadlift"],
  "good-morning-sin-peso": ["Barbell Good Morning"],
  "good-morning": ["Barbell Good Morning"],

  // ---------- Hombros ----------
  "press-militar-barra": ["Standing Military Press"],
  "press-hombros-mancuernas": ["Seated Dumbbell Press"],
  "press-hombros-maquina": ["Machine Shoulder (Military) Press"],
  "press-arnold": ["Arnold Press"],
  "elevaciones-laterales-mancuernas": ["Side Lateral Raise"],
  "elevaciones-laterales-polea": ["Cable Seated Lateral Raise"],
  "elevaciones-botellas": ["Side Lateral Raise"],
  "elevacion-frontal-mancuernas": ["Front Dumbbell Raise"],
  "elevacion-frontal-polea": ["Cable Rope Front Raise"],
  "vuelos-posteriores-mancuernas": ["Bent Over Dumbbell Rear Delt Raise"],
  "vuelos-posteriores-piso": ["Bent Over Dumbbell Rear Delt Raise"],
  "pec-deck-invertido": ["Reverse Machine Flyes"],
  "pike-push-up": ["Pushups"],

  // ---------- Bíceps ----------
  "curl-barra": ["Barbell Curl"],
  "curl-barra-z": ["EZ-Bar Curl"],
  "curl-alternado": ["Alternate Incline Dumbbell Curl", "Dumbbell Alternate Bicep Curl"],
  "curl-polea": ["Cable Curl"],
  "curl-martillo": ["Hammer Curls"],
  "curl-concentrado": ["Concentration Curls"],
  "curl-scott": ["Preacher Curl"],
  "curl-zottman": ["Zottman Curl"],
  "isometria-curl-toalla": ["Towel Pullup"],

  // ---------- Tríceps ----------
  "extension-polea-soga": ["Triceps Pushdown - Rope Attachment"],
  "extension-polea-barra": ["Triceps Pushdown"],
  "press-frances": ["Lying Triceps Press", "EZ-Bar Skullcrusher"],
  "patada-triceps-polea": ["Triceps Kickback"],

  // ---------- Cuádriceps / Piernas ----------
  "sentadilla-barra": ["Barbell Squat"],
  "sentadilla-goblet": ["Goblet Squat"],
  "sentadilla-bulgara": ["Bulgarian Split Squat"],
  "sentadilla-sumo": ["Sumo Deadlift"],
  "sentadilla-sin-peso": ["Bodyweight Squat"],
  "sentadilla-salto": ["Box Squat"],
  "wall-sit": ["Box Squat"],
  "prensa-45": ["Leg Press"],
  "hack-sentadilla": ["Hack Squat"],
  "extension-cuadriceps": ["Leg Extensions"],
  "zancadas": ["Dumbbell Lunges"],
  "zancadas-estaticas": ["Dumbbell Lunges"],
  "step-up": ["Dumbbell Step-Up"],
  "step-ups": ["Dumbbell Step-Up"],
  "nordic-curl": ["Lying Leg Curls"],
  "pistol-squat-asistida": ["Pistol Squat"],

  // ---------- Isquios / Glúteos ----------
  "curl-femoral-acostado": ["Lying Leg Curls"],
  "curl-femoral-sentado": ["Seated Leg Curl"],
  "hip-thrust": ["Hip Thrusts"],
  "hip-thrust-piso": ["Hip Thrusts"],
  "hip-bridge": ["Glute Bridge Two Legs On Bench (Male)"],
  "hip-bridge-una-pierna": ["Single Leg Glute Bridge"],
  "puente-gluteo": ["Glute Bridge Two Legs On Bench (Male)"],
  "pull-through-polea": ["Cable Pull Through"],
  "patada-gluteo-polea": ["Glute Kickback"],
  "donkey-kicks": ["Glute Kickback"],
  "fire-hydrant": ["Fire Hydrant"],
  "frog-pumps": ["Glute Bridge Two Legs On Bench (Male)"],

  // ---------- Gemelos ----------
  "gemelos-parado": ["Standing Calf Raises"],
  "gemelos-sentado": ["Seated Calf Raise"],
  "gemelos-escalon": ["Standing Calf Raises"],
  "gemelos-mancuerna": ["Standing Dumbbell Calf Raise"],
  "gemelos-una-pierna": ["Standing Dumbbell Calf Raise"],

  // ---------- Core ----------
  "plancha-frontal": ["Plank"],
  "plancha-lateral": ["Side Bridge"],
  "plancha-lateral-reach": ["Side Bridge"],
  "bird-dog": ["Alternating Superman"],
  "mountain-climbers": ["Mountain Climbers"],
  "escalador": ["Mountain Climbers"],
  "burpees": ["Push-Up Side Planks"],
  "russian-twist": ["Russian Twist"],
  "crunch": ["Crunches"],
  "crunch-polea": ["Cable Crunch"],
  "rueda-abdominal": ["Ab Roller"],
  "pallof-press": ["Cable Russian Twists"],
  "lenador-polea": ["Cable Russian Twists"],
  "elevacion-piernas-colgado": ["Hanging Leg Raise"],
  "leg-raises-piso": ["Lying Leg Raises"],
  "flutter-kicks": ["Flutter Kicks"],
  "hollow-rocks": ["Flat Bench Lying Leg Raise"],
  "v-ups": ["Weighted Crunches"],
  "toe-touches": ["Toe Touchers"],
  "bicycle-crunches": ["Air Bike"],
  "dead-bug": ["Alternating Superman"],
};

type FedExercise = {
  id: string;
  name: string;
  images: string[];
  equipment?: string | null;
  primaryMuscles?: string[];
  level?: string;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function score(a: string, b: string): number {
  const ta = new Set(normalize(a).split(" ").filter(Boolean));
  const tb = new Set(normalize(b).split(" ").filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

type Match = { fe: FedExercise; score: number };

function findExact(name: string, catalog: FedExercise[]): FedExercise | null {
  const target = normalize(name);
  return catalog.find((e) => normalize(e.name) === target) ?? null;
}

function bestFuzzy(terms: string[], catalog: FedExercise[]): Match | null {
  let best: Match | null = null;
  for (const t of terms) {
    for (const fe of catalog) {
      const s = score(t, fe.name);
      if (!best || s > best.score) best = { fe, score: s };
    }
  }
  return best;
}

async function main() {
  console.log("1/3 Descargando free-exercise-db…");
  const res = await fetch(FED_URL);
  if (!res.ok) throw new Error(`fetch FED ${res.status}`);
  const fed: FedExercise[] = await res.json();
  console.log(`   ${fed.length} ejercicios en el dataset`);

  console.log("2/3 Levantando ejercicios de la DB…");
  const { data: exs, error } = await supabase
    .from("exercises")
    .select("id, slug, nombre, media_url, media_frames");
  if (error) throw error;
  if (!exs) return;
  console.log(`   ${exs.length} ejercicios en DB`);

  console.log(`3/3 Match + ${WRITE ? "WRITE" : "DRY"}${FORCE ? " --force" : ""}…`);
  let matched = 0;
  let skipped = 0;
  let noMatch = 0;
  const unmatched: string[] = [];

  for (const ex of exs as {
    id: string;
    slug: string;
    nombre: string;
    media_url: string | null;
    media_frames: string[] | null;
  }[]) {
    const already =
      !!ex.media_url || (ex.media_frames && ex.media_frames.length > 0);
    if (already && !FORCE) {
      skipped++;
      continue;
    }

    const hints = HINTS[ex.slug] ?? [];
    // 1) Intento exact match (sobre hints o sobre nombre).
    let fe: FedExercise | null = null;
    for (const t of [...hints, ex.nombre]) {
      fe = findExact(t, fed);
      if (fe) break;
    }
    let matchScore = fe ? 1.0 : 0;

    // 2) Fallback fuzzy.
    if (!fe) {
      const best = bestFuzzy(hints.length ? hints : [ex.nombre], fed);
      if (best && best.score >= 0.5) {
        fe = best.fe;
        matchScore = best.score;
      }
    }

    if (!fe || fe.images.length === 0) {
      noMatch++;
      unmatched.push(`${ex.slug} (${hints.join(" | ") || ex.nombre})`);
      continue;
    }

    const urls = fe.images.slice(0, 3).map((p) => IMG_BASE + p);
    console.log(
      `  ✓ ${ex.slug} → "${fe.name}" (${(matchScore * 100).toFixed(0)}%) · ${urls.length} img`,
    );
    matched++;

    if (WRITE) {
      const { error: upErr } = await supabase
        .from("exercises")
        .update({
          media_url: null,
          media_frames: urls,
        })
        .eq("id", ex.id);
      if (upErr) console.warn(`    update falló:`, upErr.message);
    }
  }

  console.log("\n=== RESUMEN ===");
  console.log(`Matched:   ${matched}`);
  console.log(`Skipped:   ${skipped} (ya tenían media; usá --force para pisar)`);
  console.log(`Sin match: ${noMatch}`);
  if (unmatched.length) {
    console.log("\nSin match:");
    for (const u of unmatched) console.log(`  - ${u}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

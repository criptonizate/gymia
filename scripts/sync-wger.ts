// Sincroniza media_url de nuestros ejercicios desde wger.de (CC-BY-SA).
//
// Qué hace:
//   1. Baja TODOS los ejercicios de wger en inglés con sus imágenes.
//   2. Para cada slug nuestro, calcula el mejor match (hardcode map + fuzzy).
//   3. Sube la primera imagen a nuestro Storage (bucket exercise-media)
//      o guarda la URL directa de wger si --remote está presente.
//   4. Update exercises.media_url en la DB.
//
// Correr con:
//   npm run sync-wger            # descarga y re-hostea en Supabase Storage
//   npm run sync-wger -- --remote   # solo guarda la URL de wger (sin copiar)
//   npm run sync-wger -- --dry       # dry-run, no escribe nada
//   npm run sync-wger -- --force     # sobrescribe media_url existente
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
const DRY = args.has("--dry");
const FORCE = args.has("--force");
const REMOTE_ONLY = args.has("--remote");
const BUCKET = "exercise-media";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Hints manuales slug -> término de búsqueda en inglés. Mejora la match-rate
// para los ejercicios con nombres en español que no tienen traducción obvia.
const HINTS: Record<string, string[]> = {
  "press-banca-plano-barra": ["bench press"],
  "press-banca-plano-mancuernas": ["dumbbell bench press"],
  "press-banca-inclinado-barra": ["incline bench press"],
  "press-banca-inclinado-mancuernas": ["incline dumbbell press"],
  "aperturas-mancuernas": ["dumbbell fly"],
  "cruce-poleas-alto": ["cable crossover"],
  "cruce-poleas-bajo": ["low cable fly"],
  "pec-deck": ["pec deck", "chest fly machine"],
  "flexiones-brazo": ["push up"],
  "flexiones-amplias": ["wide push up"],
  "flexiones-diamante": ["diamond push up"],
  "flexiones-declinadas": ["decline push up"],
  "fondos-banco": ["bench dip"],
  "fondos-paralelas": ["dips"],
  "jalon-al-pecho-ancho": ["lat pulldown wide"],
  "jalon-al-pecho-neutro": ["lat pulldown neutral"],
  "dominadas": ["pull up"],
  "remo-con-barra": ["barbell row", "bent over row"],
  "remo-mancuerna": ["dumbbell row", "one arm row"],
  "remo-polea-baja": ["seated cable row"],
  "remo-invertido": ["inverted row"],
  "remo-invertido-mesa": ["inverted row"],
  "pullover-polea": ["cable pullover", "straight arm pulldown"],
  "face-pull": ["face pull"],
  "superman": ["superman"],
  "press-militar-barra": ["overhead press", "military press"],
  "press-hombros-mancuernas": ["dumbbell shoulder press"],
  "press-hombros-maquina": ["machine shoulder press"],
  "elevaciones-laterales-mancuernas": ["lateral raise"],
  "elevaciones-laterales-polea": ["cable lateral raise"],
  "vuelos-posteriores-mancuernas": ["rear delt fly", "bent over lateral raise"],
  "pec-deck-invertido": ["reverse pec deck", "reverse fly machine"],
  "pike-push-up": ["pike push up"],
  "curl-barra": ["barbell curl"],
  "curl-alternado": ["alternating dumbbell curl"],
  "curl-polea": ["cable curl"],
  "curl-martillo": ["hammer curl"],
  "extension-polea-soga": ["rope tricep pushdown"],
  "extension-polea-barra": ["tricep pushdown"],
  "press-frances": ["skull crusher", "lying tricep extension"],
  "isometria-curl-toalla": ["isometric curl"],
  "sentadilla-barra": ["back squat"],
  "sentadilla-goblet": ["goblet squat"],
  "sentadilla-salto": ["jump squat"],
  "sentadilla-bulgara": ["bulgarian split squat"],
  "sentadilla-sumo": ["sumo squat"],
  "prensa-45": ["leg press"],
  "hack-sentadilla": ["hack squat"],
  "extension-cuadriceps": ["leg extension"],
  "zancadas": ["lunge"],
  "step-up": ["step up"],
  "peso-muerto-rumano": ["romanian deadlift"],
  "curl-femoral-acostado": ["lying leg curl"],
  "curl-femoral-sentado": ["seated leg curl"],
  "hip-thrust": ["hip thrust"],
  "pull-through-polea": ["cable pull through"],
  "patada-gluteo-polea": ["cable kickback", "glute kickback"],
  "puente-gluteo": ["glute bridge"],
  "gemelos-parado": ["standing calf raise"],
  "gemelos-sentado": ["seated calf raise"],
  "escalador": ["mountain climber"],
  "mountain-climbers": ["mountain climber"],
  "burpees": ["burpee"],
  "bird-dog": ["bird dog"],
  "plancha-frontal": ["plank"],
  "plancha-lateral": ["side plank"],
  "plancha-lateral-reach": ["side plank reach"],
  "russian-twist": ["russian twist"],
  "crunch-polea": ["cable crunch"],
  "rueda-abdominal": ["ab wheel"],
  "pallof-press": ["pallof press"],
  "lenador-polea": ["cable woodchopper"],
  "elevacion-piernas-colgado": ["hanging leg raise"],
  "leg-raises-piso": ["lying leg raise"],
  "hollow-rocks": ["hollow rock", "hollow body"],
  "v-ups": ["v up", "v sit"],
  "toe-touches": ["toe touch", "lying toe touch"],
  "bicycle-crunches": ["bicycle crunch", "crunch"],
  "flutter-kicks": ["flutter kick", "scissor kick"],

  // Segundo lote (los que fallaron en la primera corrida)
  "cruce-poleas-alto": ["crossover cable", "cable crossover high"],
  "jalon-al-pecho-ancho": ["lat pulldown", "pulldown"],
  "press-frances": ["lying triceps", "french press"],
  "fondos-banco": ["bench dips"],
  "sentadilla-barra": ["squats", "barbell squat"],
  "hack-sentadilla": ["hack squat"],
  "pull-through-polea": ["pull through", "cable pull"],
  "dead-bug": ["dead bug"],
  "lenador-polea": ["wood chopper", "woodchop"],
  "flexiones-hindues": ["hindu push up"],
  "flexiones": ["push up", "push ups"],
  "flexiones-inclinadas": ["incline push up"],
  "flexiones-arqueras": ["archer push up"],
  "remo-invertido": ["inverted rows"],
  "superman": ["back extension", "superman"],
  "superman-alternado": ["superman alternating", "bird dog"],
  "elevaciones-botellas": ["lateral raise"],
  "press-arnold": ["arnold press"],
  "vuelos-posteriores-piso": ["rear delt raise", "reverse fly"],
  "curl-concentrado": ["concentration curl"],
  "curl-zottman": ["zottman curl"],
  "isometria-curl-toalla": ["towel curl", "isometric biceps"],
  "flexiones-cerradas": ["close grip push up", "diamond push up"],
  "flexiones-piramidales": ["pyramid push up"],
  "sentadilla-sin-peso": ["bodyweight squat", "air squat"],
  "sentadilla-salto": ["jump squat", "squat jump"],
  "wall-sit": ["wall sit", "wall squat"],
  "zancadas-estaticas": ["static lunge", "split squat"],
  "hip-bridge": ["glute bridge", "hip bridge"],
  "hip-bridge-una-pierna": ["single leg glute bridge"],
  "hip-thrust-piso": ["floor hip thrust", "glute bridge"],
  "donkey-kicks": ["donkey kick", "glute kickback"],
  "fire-hydrant": ["fire hydrant", "hip abduction"],
  "frog-pumps": ["frog pump", "frog bridge"],
  "gemelos-una-pierna": ["single leg calf raise"],
  "plancha-lateral-reach": ["side plank reach", "side plank"],
  "step-ups": ["step up"],
};

type WgerImage = { image: string; is_main?: boolean };
type WgerExerciseInfo = {
  id: number;
  name: string;
  images: WgerImage[];
};
type WgerTranslation = { language: number; name: string };
type WgerExerciseBase = {
  id: number;
  translations: WgerTranslation[];
  images: WgerImage[];
};

async function fetchAllWger(): Promise<Array<{ name: string; image: string }>> {
  const out: Array<{ name: string; image: string }> = [];
  let url: string | null =
    "https://wger.de/api/v2/exerciseinfo/?limit=100&offset=0";
  let page = 0;
  while (url) {
    page++;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`wger ${res.status}: ${url}`);
    const json: { next: string | null; results: WgerExerciseBase[] } =
      await res.json();
    for (const e of json.results) {
      const mainImg =
        e.images?.find((i) => i.is_main)?.image ?? e.images?.[0]?.image;
      if (!mainImg) continue;
      // Sólo inglés (2) y español (4) para evitar falsos matches con
      // nombres en otros idiomas que comparten tokens cortos tipo "v" o "ab".
      for (const t of e.translations ?? []) {
        if (!t.name) continue;
        if (t.language !== 2 && t.language !== 4) continue;
        out.push({ name: t.name, image: mainImg });
      }
    }
    url = json.next;
    process.stdout.write(`  wger page ${page} (${out.length} con img)\r`);
  }
  process.stdout.write("\n");
  return out;
}

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
  const union = ta.size + tb.size - inter;
  return inter / union;
}

function bestMatch(
  terms: string[],
  index: Array<{ name: string; image: string }>,
): { image: string; score: number; matched: string } | null {
  let best: { image: string; score: number; matched: string } | null = null;
  for (const t of terms) {
    for (const row of index) {
      const s = score(t, row.name);
      if (!best || s > best.score) {
        best = { image: row.image, score: s, matched: row.name };
      }
    }
  }
  return best;
}

async function copyToStorage(
  srcUrl: string,
  slug: string,
): Promise<string | null> {
  const ext = srcUrl.split("?")[0].split(".").pop()?.toLowerCase() ?? "jpg";
  const key = `wger/${slug}.${ext}`;
  const res = await fetch(srcUrl);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") ?? `image/${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(key, buf, {
    contentType: ct,
    upsert: true,
  });
  if (error) {
    console.warn(`  ↑ upload falló ${key}:`, error.message);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

async function main() {
  console.log("1/3 Descargando catálogo wger…");
  const wger = await fetchAllWger();

  console.log(`2/3 Levantando ejercicios de la DB…`);
  const { data: exs, error } = await supabase
    .from("exercises")
    .select("id, slug, nombre, media_url");
  if (error) throw error;
  if (!exs) return;
  console.log(`   ${exs.length} ejercicios en DB`);

  console.log(`3/3 Match + update ${DRY ? "(DRY)" : ""}${REMOTE_ONLY ? " [remote-only]" : ""}…`);
  let matched = 0;
  let skipped = 0;
  let noMatch = 0;
  let uploaded = 0;
  const unmatched: string[] = [];

  for (const ex of exs as { id: string; slug: string; nombre: string; media_url: string | null }[]) {
    if (ex.media_url && !FORCE) {
      skipped++;
      continue;
    }
    const terms = HINTS[ex.slug] ?? [ex.nombre];
    const m = bestMatch(terms, wger);
    if (!m || m.score < 0.35) {
      noMatch++;
      unmatched.push(`${ex.slug} (buscado: ${terms.join(" | ")})`);
      continue;
    }
    matched++;
    let finalUrl = m.image;
    if (!REMOTE_ONLY && !DRY) {
      const uploadedUrl = await copyToStorage(m.image, ex.slug);
      if (uploadedUrl) {
        finalUrl = uploadedUrl;
        uploaded++;
      }
    }
    console.log(
      `  ✓ ${ex.slug} → "${m.matched}" (${(m.score * 100).toFixed(0)}%)`,
    );
    if (!DRY) {
      const { error: upErr } = await supabase
        .from("exercises")
        .update({ media_url: finalUrl })
        .eq("id", ex.id);
      if (upErr) console.warn(`    update falló:`, upErr.message);
    }
  }

  console.log("\n=== RESUMEN ===");
  console.log(`Matched:   ${matched}`);
  console.log(`Uploaded:  ${uploaded}`);
  console.log(`Skipped:   ${skipped} (ya tenían media_url; usá --force para pisar)`);
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

/**
 * scripts/check-media.ts
 *
 * Verifica que todas las URLs de media_frames del seed respondan 200.
 * Lee /supabase/seed.sql, extrae cada id del dataset free-exercise-db,
 * arma las URLs 0.jpg/1.jpg y las consulta con HEAD en paralelo (concurrencia 8).
 *
 * Uso:
 *   npx tsx scripts/check-media.ts
 *   npx tsx scripts/check-media.ts --fix-suggest   # imprime grep-friendly
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = join(__dirname, "..", "supabase", "seed.sql");
const BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";
const CONCURRENCY = 8;

type Row = { slug: string; freedbId: string };

function parseSeed(sql: string): Row[] {
  // Capturamos cada llamada a _ins_ex con un regex sobre la lista de argumentos.
  // El id del dataset es el penúltimo string antes del yt_query.
  const rows: Row[] = [];
  const callRe = /select\s+_ins_ex\s*\(([\s\S]*?)\);/gi;
  let m: RegExpExecArray | null;
  while ((m = callRe.exec(sql)) !== null) {
    const body = m[1];
    const strings = [...body.matchAll(/'((?:''|[^'])*)'/g)].map((x) =>
      x[1].replace(/''/g, "'"),
    );
    // Posición esperada: [nombre, slug, mg, eq, ...secondary..., inst..., err..., freedb_id, yt_query]
    // Los literales de array se concatenan en el regex como strings sueltos,
    // así que los dos últimos literales de texto siguen siendo freedb_id y yt_query.
    if (strings.length < 2) continue;
    const freedbId = strings[strings.length - 2];
    const slug = strings[1];
    rows.push({ slug, freedbId });
  }
  return rows;
}

async function head(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.status;
  } catch {
    return 0;
  }
}

async function runPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  const sql = await readFile(SEED_PATH, "utf8");
  const rows = parseSeed(sql);

  const mapped = rows.filter((r) => r.freedbId.length > 0);
  const empty = rows.filter((r) => r.freedbId.length === 0);

  console.log(`Ejercicios en seed: ${rows.length}`);
  console.log(`  con media:   ${mapped.length}`);
  console.log(`  sin media:   ${empty.length}`);
  if (empty.length) {
    console.log("  sin mapeo:");
    empty.forEach((r) => console.log(`    - ${r.slug}`));
  }

  const urls: { slug: string; url: string }[] = mapped.flatMap((r) => [
    { slug: r.slug, url: `${BASE}/${r.freedbId}/0.jpg` },
    { slug: r.slug, url: `${BASE}/${r.freedbId}/1.jpg` },
  ]);

  console.log(`\nVerificando ${urls.length} URLs (concurrencia ${CONCURRENCY})...`);
  const results = await runPool(urls, CONCURRENCY, async (u) => {
    const status = await head(u.url);
    return { ...u, status };
  });

  const ok = results.filter((r) => r.status === 200);
  const bad = results.filter((r) => r.status !== 200);

  console.log(`\n OK: ${ok.length}   FALLAN: ${bad.length}`);
  if (bad.length) {
    console.log("\nURLs que no respondieron 200:");
    const bySlug = new Map<string, number[]>();
    bad.forEach((b) => {
      const arr = bySlug.get(b.slug) ?? [];
      arr.push(b.status);
      bySlug.set(b.slug, arr);
    });
    for (const [slug, statuses] of bySlug) {
      console.log(`  ${slug}  [${statuses.join(", ")}]`);
    }
    process.exitCode = 1;
  } else {
    console.log("\nTodas las URLs respondieron 200.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

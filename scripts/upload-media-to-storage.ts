// Sube las imágenes del seed (free-exercise-db) a Supabase Storage
// y actualiza exercises.media_frames con las URLs del bucket GYMIA.
//
// Correr con:
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npx tsx scripts/upload-media-to-storage.ts
//
// Requiere crear el bucket 'exercise-media' (PÚBLICO) en Supabase Storage.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const BUCKET = "exercise-media";
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

type Ex = { id: string; slug: string; media_frames: string[] };

async function main() {
  const { data: exs, error } = await supabase
    .from("exercises")
    .select("id, slug, media_frames")
    .not("media_frames", "eq", "{}");
  if (error) throw error;
  if (!exs) return;

  // Asegurar bucket
  const { data: buckets } = await supabase.storage.listBuckets();
  const has = buckets?.some((b) => b.name === BUCKET);
  if (!has) {
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 2_000_000,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    console.log(`Bucket ${BUCKET} creado.`);
  }

  let ok = 0;
  let fail = 0;
  for (const ex of exs as Ex[]) {
    const newUrls: string[] = [];
    for (let i = 0; i < ex.media_frames.length; i++) {
      const src = ex.media_frames[i];
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const path = `${ex.slug}/${i}.jpg`;
        const up = await supabase.storage
          .from(BUCKET)
          .upload(path, buf, { contentType: "image/jpeg", upsert: true });
        if (up.error) throw up.error;
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        newUrls.push(pub.publicUrl);
      } catch (e) {
        console.warn(`FAIL ${ex.slug} [${i}]:`, (e as Error).message);
      }
    }
    if (newUrls.length === ex.media_frames.length) {
      const { error: errUpd } = await supabase
        .from("exercises")
        .update({ media_frames: newUrls })
        .eq("id", ex.id);
      if (errUpd) {
        console.warn(`UPDATE fail ${ex.slug}:`, errUpd.message);
        fail++;
      } else {
        ok++;
      }
    } else {
      fail++;
    }
    if ((ok + fail) % 10 === 0) console.log(`Progreso: ${ok + fail}/${exs.length}`);
  }
  console.log(`\nListo. OK: ${ok}  FAIL: ${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

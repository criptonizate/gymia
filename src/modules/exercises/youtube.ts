export function extractYouTubeId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  // ID directo
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const url = new URL(s);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.slice(1);
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = url.pathname.match(/\/(shorts|embed|v)\/([\w-]{11})/);
      if (m) return m[2];
    }
  } catch {
    // fallthrough
  }
  return null;
}

/**
 * Canal preferido para videos de técnica. Se usa como prefix en el search
 * para que YouTube priorice contenido de ese canal.
 */
export const PREFERRED_YT_CHANNEL = "@oscarmolina6867";

/**
 * Busca en YouTube filtrando por el canal preferido. Si YouTube no tiene
 * resultados del canal, igual muestra resultados generales abajo.
 */
export function youtubeSearchUrl(query: string): string {
  const q = `${PREFERRED_YT_CHANNEL} ${query}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

/** Search sin filtro de canal — fallback cuando el canal no tiene el ejercicio. */
export function youtubeSearchUrlGlobal(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/** Link al canal preferido. */
export function preferredChannelUrl(): string {
  return `https://www.youtube.com/${PREFERRED_YT_CHANNEL}/videos`;
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}`;
}

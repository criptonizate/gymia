// Genera un PNG 1080×1920 (formato historia) con los stats de la sesión.
// Lo intenta compartir con Web Share nivel 2 (files); si no, descarga.

export type SnapshotData = {
  duracionMin: number;
  seriesCompletas: number;
  seriesPlanificadas: number;
  volumen: number;
  records: string[];
  diasRacha?: number;
};

const W = 1080;
const H = 1920;

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, cy);
      line = w;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
  return cy + lineHeight;
}

export async function buildSnapshot(d: SnapshotData): Promise<Blob | null> {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  // Fondo gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0f172a");
  g.addColorStop(1, "#1e293b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 72px system-ui, sans-serif";
  ctx.fillText("GYMIA", 80, 200);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "40px system-ui, sans-serif";
  ctx.fillText("Resumen de hoy", 80, 270);

  // Big stats
  const cards: { label: string; value: string }[] = [
    { label: "Duración", value: `${d.duracionMin} min` },
    { label: "Series", value: `${d.seriesCompletas}/${d.seriesPlanificadas}` },
    { label: "Volumen", value: `${Math.round(d.volumen)} kg` },
    { label: "Récords", value: `${d.records.length} ✨` },
  ];

  const cardW = (W - 80 * 2 - 40) / 2;
  const cardH = 280;
  for (let i = 0; i < cards.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 80 + col * (cardW + 40);
    const y = 400 + row * (cardH + 40);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, cardW, cardH, 32);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "32px system-ui, sans-serif";
    ctx.fillText(cards[i].label, x + 40, y + 70);
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 92px system-ui, sans-serif";
    ctx.fillText(cards[i].value, x + 40, y + 190);
  }

  // Récords
  if (d.records.length) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 44px system-ui, sans-serif";
    ctx.fillText("✨ Récords de hoy", 80, 1340);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "36px system-ui, sans-serif";
    let y = 1410;
    for (const r of d.records.slice(0, 4)) {
      y = wrap(ctx, "• " + r, 80, y, W - 160, 52);
    }
  }

  // Footer racha
  if (d.diasRacha && d.diasRacha > 0) {
    ctx.fillStyle = "#f97316";
    ctx.font = "bold 52px system-ui, sans-serif";
    ctx.fillText(`🔥 ${d.diasRacha} días seguidos`, 80, 1780);
  }
  ctx.fillStyle = "#64748b";
  ctx.font = "32px system-ui, sans-serif";
  ctx.fillText("gymia.app", 80, 1860);

  return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}

export async function shareSnapshot(d: SnapshotData): Promise<string> {
  const blob = await buildSnapshot(d);
  if (!blob) return "No pude generar la imagen";

  const file = new File([blob], `gymia-${Date.now()}.png`, {
    type: "image/png",
  });

  const nav = navigator as unknown as {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; text?: string }) => Promise<void>;
  };
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], text: "Mi entrenamiento con GYMIA" });
      return "";
    } catch {
      // cancelado o fallback
    }
  }

  // Fallback: descargar
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2_000);
  return "Imagen descargada";
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

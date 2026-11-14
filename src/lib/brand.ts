// Constantes de identidad. Cualquier color que pinte el logo o el
// theme-color de la PWA sale de acá.
export const BRAND = {
  name: "GYMIA",
  bg: "#0A0A0B",
  primary: "#38BDF8",
} as const;

export function brandLogoSvg(size = 512, radius?: number): string {
  // SVG string reusable para páginas /icon y /apple-icon.
  const r = radius ?? Math.round(size * 0.187);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <rect width="${size}" height="${size}" rx="${r}" fill="${BRAND.bg}"/>
    <g>
      <line x1="${size * 0.1875}" y1="${size / 2}" x2="${size * 0.8125}" y2="${size / 2}" stroke="${BRAND.primary}" stroke-width="${size * 0.055}" stroke-linecap="round"/>
      <rect x="${size * 0.23}" y="${size * 0.35}" width="${size * 0.06}" height="${size * 0.297}" rx="${size * 0.02}" fill="${BRAND.primary}"/>
      <rect x="${size * 0.301}" y="${size * 0.39}" width="${size * 0.043}" height="${size * 0.22}" rx="${size * 0.015}" fill="${BRAND.primary}"/>
      <rect x="${size * 0.711}" y="${size * 0.35}" width="${size * 0.06}" height="${size * 0.297}" rx="${size * 0.02}" fill="${BRAND.primary}"/>
      <rect x="${size * 0.656}" y="${size * 0.39}" width="${size * 0.043}" height="${size * 0.22}" rx="${size * 0.015}" fill="${BRAND.primary}"/>
    </g>
  </svg>`;
}

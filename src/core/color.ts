// Owner: Core (reine Farb-Utils). LOC ≤ 100.
// EINE Quelle pro Wahrheit: hexToRgb/rgbToHex/shiftChannels/shiftFactor — die
// Duplikate in visual/generator.ts, render/layers/primitives.ts und
// render/layers/enemies.ts sind hier zusammengeführt (AGENTS Regel 2.3).
// Rein: kein RNG, kein State, kein Render-Zugriff.

/** '#rrggbb' → [r, g, b] (0–255). */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** [r, g, b] → '#rrggbb' (geklemmt, gerundet). */
export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Kanalweiser Shift (Δ pro Kanal, additiv) — Palette-Mutation im VisualGenerator. */
export function shiftChannels(hex: string, dr: number, dg: number, db: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + dr, g + dg, b + db);
}

/** Faktor-Shift: f ≥ 0 aufhellen (zum Weiß), f < 0 abdunkeln (multiplikativ) — CGI-Shading. */
function shiftFactor(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  if (f >= 0) return rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
  return rgbToHex(r * (1 + f), g * (1 + f), b * (1 + f));
}

/** Aufhellen (Faktor 0..1) — Alias für shiftFactor ≥ 0 (Lesbarkeit an den Call-Sites). */
export function lighten(hex: string, f: number): string { return shiftFactor(hex, f); }

/** Abdunkeln (Faktor 0..1) — Alias für shiftFactor < 0 (Lesbarkeit an den Call-Sites). */
export function darken(hex: string, f: number): string { return shiftFactor(hex, -f); }

// Owner: UI (Tutorial-Blasenlayout). LOC ≤ 200.
// Reine Geometrie ohne DOM: Der Overlay misst, diese Funktion wählt eine Position außerhalb der
// als `data-tut-avoid` markierten Karten. Dadurch bleibt die Layouthilfe unabhängig testbar.

export interface TutorialRect { x: number; y: number; w: number; h: number }

const EDGE = 12;
const GAP = 10;
const STEP = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function rectsOverlap(a: TutorialRect, b: TutorialRect, gap = 0): boolean {
  return a.x < b.x + b.w + gap
    && a.x + a.w + gap > b.x
    && a.y < b.y + b.h + gap
    && a.y + a.h + gap > b.y;
}

function candidateSet(size: TutorialRect, stage: TutorialRect, bounds: TutorialRect, preferred: TutorialRect): TutorialRect[] {
  const maxX = Math.max(EDGE, bounds.w - size.w - EDGE);
  const maxY = Math.max(EDGE, bounds.h - size.h - EDGE);
  const clampX = (x: number) => clamp(x, EDGE, maxX);
  const clampY = (y: number) => clamp(y, EDGE, maxY);
  const xs = [preferred.x, stage.x + EDGE, stage.x + stage.w - size.w - EDGE, EDGE, bounds.w - size.w - EDGE];
  const ys = [preferred.y, stage.y - size.h - EDGE, stage.y + EDGE, stage.y + stage.h - size.h - EDGE, EDGE, bounds.h - size.h - EDGE];
  const out: TutorialRect[] = [];
  const seen = new Set<string>();
  const add = (x: number, y: number) => {
    const next = { x: clampX(x), y: clampY(y), w: size.w, h: size.h };
    const key = `${next.x}:${next.y}`;
    if (!seen.has(key)) { seen.add(key); out.push(next); }
  };
  for (const y of ys) for (const x of xs) add(x, y);
  // Dichte Karten brauchen mehr als die vier Ankerpositionen. Das Raster ist klein genug für
  // einen Render-Takt und verhindert hier den früheren "closest candidate" über einer Karte.
  for (let y = EDGE; y <= maxY; y += STEP) for (let x = EDGE; x <= maxX; x += STEP) add(x, y);
  return out;
}

/** Wählt eine freie Position; `preferred` bleibt bevorzugt, Karten sind harte Ausschlussflächen. */
export function placeBubble(
  size: TutorialRect,
  bounds: TutorialRect,
  stage: TutorialRect,
  preferred: TutorialRect,
  avoid: readonly TutorialRect[],
): TutorialRect {
  const candidates = candidateSet(size, stage, bounds, preferred);
  const valid = candidates.filter(candidate => !avoid.some(rect => rectsOverlap(candidate, rect, GAP)));
  const pool = valid.length > 0 ? valid : candidates;
  return pool.reduce((best, candidate) => {
    const distance = Math.abs(candidate.x - preferred.x) + Math.abs(candidate.y - preferred.y);
    const bestDistance = Math.abs(best.x - preferred.x) + Math.abs(best.y - preferred.y);
    return distance < bestDistance ? candidate : best;
  }, pool[0]);
}

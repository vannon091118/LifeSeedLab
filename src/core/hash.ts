// Owner: HashSystem (core). LOC ≤ 300.
// Deterministic FNV-1a over the canonical gameplay state fields.
// Contract Phase 2.6: same seed + same commands = same hash.

import type { ClockState } from './clock';
// Kanonische Sortierung: Code-Unit-Vergleich statt localeCompare — die Anzeige-Sprache des
// Spielers darf den Zustands-Hash nicht ändern (Befund 20.09.2026, s. `order.ts`).
import { compareCodeUnits } from './order';

export interface HashableState {
  seed: number;
  clock: ClockState;
  wave: { number: number };
  // KEIN `resources`-Feld: der Hash las es nie, und seit der Entscheidung 19.09.2026
  // („Feld streichen") existiert der zweite Kontostand gar nicht mehr — der SimState trägt im
  // Run nur noch Wertung (Score/Combo/Nektar-Ertrag). Frühere Falle: ein deklariertes, aber
  // ignoriertes Feld („warum ändert sich mein Hash nicht?").
  plants: { id: string; gx: number; gy: number; hp: number; variantId: string; lastShot: number }[];
  enemies: { id: string; hp: number; px: number; py: number; pathIndex: number }[];
  // Ballistik ist spielfähige Divergenz: Geschwindigkeit, Durchschlag und Effekte entscheiden
  // über Treffer und Schaden. Deshalb gehören sie in den Hash (sonst könnten zwei Läufe mit
  // unterschiedlichem Ausgang denselben Hash tragen).
  projectiles: { id: string; px: number; py: number; dx: number; dy: number; speed?: number; pierce?: number; effects?: string[] }[];
  // Vector-Engine: Flags pro Zelle + Attraktoren (vergänglich, aber spielfähig divergierend).
  vectors: { key: string; cells: { vectorId: string; intensity: number; ttl: number }[] }[];
  attractors: { id: string; x: number; y: number; strength: number; radius: number; ttl: number }[];
  score: number;
  // P-29: `waveBestMult`/`waveBestMultWave` bleiben BEWUSST außerhalb — sie sind vollständig
  // aus dem Event-Strom (Kills je Welle) ableitbar und tragen KEINE eigene Zufallsentscheidung;
  // der Hash gewinnt keine Detektionskraft, aber würde den Golden-Vector-Anker drift lassen.
  combo: { count: number; multiplier: number; timer: number; highest: number };
}

/** SHA-256 über WebCrypto — asynchron, weil `crypto.subtle.digest` bewusst asynchron ist. */
export async function sha256Hex(input: string): Promise<string> {
  const subtle = (globalThis as unknown as { crypto?: { subtle?: { digest: (algorithm: string, data: BufferSource) => Promise<ArrayBuffer> } } }).crypto?.subtle;
  if (!subtle) throw new Error('WebCrypto SHA-256 ist in dieser Laufzeit nicht verfügbar.');
  const bytes = new TextEncoder().encode(input);
  const digest = new Uint8Array(await subtle.digest('SHA-256', bytes));
  let out = '';
  for (const byte of digest) out += byte.toString(16).padStart(2, '0');
  return out;
}

/**
 * Canonical FNV-1a as 8-digit hex — bleibt für State-/Migrations- und Referenzhashes.
 * Der UNIQUE-Genom-Hash nutzt dagegen `sha256Hex`; zwei verschiedene Hash-Verträge dürfen
 * nicht als derselbe Identifier missverstanden werden.
 */
export function fnv1aHex(input: string): string {
  return fnv1a(0x811c9dc5, input).toString(16).padStart(8, '0');
}

/** FNV-1a core (raw u32) — single implementation for all identity/mixing hashes. */
export function fnv1a(h0: number, str: string): number {
  let h = h0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const NUM = (n: number) => {
  // stable numeric formatting: integers exact, floats quantized to 1e-4
  const q = Math.round(n * 10000) / 10000;
  return Number.isInteger(q) ? String(q) : q.toFixed(4);
};

export function hashState(s: HashableState): string {
  let h = fnv1a(0x811c9dc5, `v1|seed:${s.seed}`);
  h = fnv1a(h, `tick:${NUM(s.clock.tick)}|phase:${s.clock.phase}|prog:${NUM(s.clock.phaseProgress)}|waveTime:${NUM(s.clock.waveTime)}`);
  h = fnv1a(h, `wave:${NUM(s.wave.number)}|score:${NUM(s.score)}`);
  h = fnv1a(h, `combo:${s.combo.count}|${NUM(s.combo.multiplier)}|${NUM(s.combo.timer)}|${NUM(s.combo.highest)}`);

  // canonical ordering: sort by id so insertion order never affects the hash
  const plants = [...s.plants].sort((a, b) => compareCodeUnits(a.id, b.id));
  h = fnv1a(h, `plants:${plants.length}`);
  for (const p of plants) {
    h = fnv1a(h, `${p.id}|${p.variantId}|${NUM(p.gx)},${NUM(p.gy)}|hp:${NUM(p.hp)}|ls:${NUM(p.lastShot)}`);
  }

  const enemies = [...s.enemies].sort((a, b) => compareCodeUnits(a.id, b.id));
  h = fnv1a(h, `enemies:${enemies.length}`);
  for (const e of enemies) {
    h = fnv1a(h, `${e.id}|hp:${NUM(e.hp)}|pos:${NUM(e.px)},${NUM(e.py)}|path:${NUM(e.pathIndex)}`);
  }

  const projs = [...s.projectiles].sort((a, b) => compareCodeUnits(a.id, b.id));
  h = fnv1a(h, `projs:${projs.length}`);
  for (const p of projs) {
    h = fnv1a(h, `${p.id}|pos:${NUM(p.px)},${NUM(p.py)}|dir:${NUM(p.dx)},${NUM(p.dy)}`);
    // Additiv-optional (D8): nur wenn vorhanden. Bestehende Szenarien hashen damit unverändert
    // (ihre Projektile tragen die Felder nicht), neue Schüsse hashen ihre Wirkung mit.
    if (p.speed !== undefined) h = fnv1a(h, `sp:${NUM(p.speed)}`);
    if (p.pierce !== undefined) h = fnv1a(h, `pie:${NUM(p.pierce)}`);
    if (p.effects && p.effects.length > 0) h = fnv1a(h, `fx:${p.effects.join('+')}`);
  }

  const vKeys = [...s.vectors].sort((a, b) => compareCodeUnits(a.key, b.key));
  h = fnv1a(h, `vec:${vKeys.length}`);
  for (const v of vKeys) {
    const cells = [...v.cells].sort((a, b) => compareCodeUnits(a.vectorId, b.vectorId));
    h = fnv1a(h, `${v.key}|${cells.length}`);
    for (const c of cells) h = fnv1a(h, `${c.vectorId}|${NUM(c.intensity)}|${NUM(c.ttl)}`);
  }
  const attrs = [...s.attractors].sort((a, b) => compareCodeUnits(a.id, b.id));
  h = fnv1a(h, `attr:${attrs.length}`);
  for (const a of attrs) h = fnv1a(h, `${a.id}|${NUM(a.x)},${NUM(a.y)}|${NUM(a.strength)}|${NUM(a.radius)}|${NUM(a.ttl)}`);

  return (h >>> 0).toString(16).padStart(8, '0');
}

// Owner: VectorAttractor (attractors slice). LOC ≤ 300.
// Einziger Writer von SimState.attractors. Gravity als State, wiederverwendbar
// für Gegner/Projektile/Orbits. Richtung via DIR_TABLE (gebackene Literale, kein sin/cos in Sim).
// 8-Fragen: Existiert? nein · Owner VectorAttractor · Schicht Sim · Event? nein · Seed 'world' ·
// Regel in Source? ja (vector_logic VECTOR_ATTRACTOR + VECTOR_ATTRACTOR_CONFIG · Cap 300 · Zweite Quelle? nein.

import type { SimState, AttractorEntity } from './state';
import { nextId } from '../core/ids';
import { VECTOR_ATTRACTOR_CONFIG } from '../config/vector_logic.source';
import { ENEMIES_SOURCE, type EnemySource } from '../config/enemies.source';

/**
 * Der Zug EINES Feldes auf einen Punkt — EINE Formel für Gegner und Projektile:
 * 0 am Rand, linear zur Feldmitte wachsend, nach oben durch `pullMax` begrenzt.
 *
 * Vorher stand hier `strength * 0.1 / d`. Der Term wuchs zur Feldmitte unbeschränkt: gemessen
 * am 20.09.2026 (Welle 2, Feld auf einer Wegzelle, alle 30 Ticks erneuert, 600 Ticks) flogen
 * Gegner auf x = -519, 256, 382 — sie liefen den Weg nicht mehr („auf einmal folgt kein Creep
 * mehr dem Weg"). Der Weg-Vertrag braucht eine BEGRENZTE Kraft, keine Spitze.
 */
function pullAt(a: AttractorEntity, d: number): number {
  if (d >= a.radius) return 0;
  return a.strength * VECTOR_ATTRACTOR_CONFIG.pullMax * (1 - d / a.radius);
}

export class VectorAttractor {
  /** Pflanze/Projektil legt Attraktor (Gravity). Aufgerufen aus PlantSystem. */
  spawn(state: SimState, x: number, y: number, strength: number, radius: number, ttl: number): AttractorEntity {
    const e: AttractorEntity = { id: nextId('system'), x, y, strength, radius, ttl };
    state.attractors.push(e);
    return e;
  }

  /** Ein Tick: Attraktoren altern (TTL), Gegner/Projektile werden gezogen. Deterministisch. */
  update(state: SimState): void {
    // Kein plantId auf dem Attraktor — seine Lebenszeit ist reines ttl (Vergänglichkeits-Vertrag,
    // Gate (d)). Entfernen passiert ausschließlich hier: ttl 0 ⇒ gefiltert.
    for (const a of state.attractors) a.ttl -= 1;
    state.attractors = state.attractors.filter(a => a.ttl > 0);

    // Gegner ziehen. Die Zug-Summe aller Felder wird auf einen Anteil des EIGENEN Tempos
    // begrenzt (`maxShare`): der Gegner behält immer (1 - maxShare) seines Tempos in
    // Weg-Richtung. Das Feld verlangsamt und krümmt den Lauf — es fängt ihn nicht.
    for (const e of state.enemies) {
      const src = (ENEMIES_SOURCE as Record<string, EnemySource>)[e.typeId];
      const cap = (src?.speed ?? 0) * VECTOR_ATTRACTOR_CONFIG.maxShare;
      const pull = this.accumulate(state, e.px, e.py);
      const m = Math.sqrt(pull.x * pull.x + pull.y * pull.y);
      if (m <= 0) continue;
      const step = Math.min(m, cap);
      e.px += (pull.x / m) * step;
      e.py += (pull.y / m) * step;
    }

    // Projektile: dieselbe Formel; der Deckel ist ebenfalls der Anteil ihres EIGENEN Tempos.
    // Der Orbit (90°-Quer-Anteil, Tisch-Lookup) und die Schlieren bleiben Beobachter-Sache
    // (trail_fast) — die Sim zieht radial, kein Sim-State für Optik.
    for (const p of state.projectiles) {
      const cap = p.speed * VECTOR_ATTRACTOR_CONFIG.maxShare;
      const pull = this.accumulate(state, p.px, p.py);
      const m = Math.sqrt(pull.x * pull.x + pull.y * pull.y);
      if (m <= 0) continue;
      const step = Math.min(m, cap);
      p.px += (pull.x / m) * step;
      p.py += (pull.y / m) * step;
    }
  }

  /** Zug-Summe ALLER Felder an einem Ort (rein: kein Zustand, kein RNG, eine Formel). */
  private accumulate(state: SimState, x: number, y: number): { x: number; y: number } {
    let sx = 0;
    let sy = 0;
    for (const a of state.attractors) {
      const dx = a.x - x;
      const dy = a.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= 0) continue; // exakt im Zentrum: keine Richtung, kein Zug
      const d = Math.sqrt(d2);
      const pull = pullAt(a, d);
      if (pull > 0) { sx += (dx / d) * pull; sy += (dy / d) * pull; }
    }
    return { x: sx, y: sy };
  }
}

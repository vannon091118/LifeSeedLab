// Owner: PlantShot (Pflanzenschuss-Auflösung). LOC ≤ 160.
// Extraktion aus root.ts (Regel 1): was dort als Callback an `PlantSystem.update` hing, war keine
// Verdrahtung, sondern Gameplay — die Auflösung EINES Schusses: Blitz-Ableiter, Projektilstart und
// der Vector-Deposit je Schuss.
//
// OWNERSHIP-VERTRAG (wer schreibt was — nichts davon liegt hier):
//   Dieses Modul BESITZT KEINEN State: keine Felder, kein Cache, keine zweite Wahrheit über
//   Pflanze, Gegner oder Vektor. Es löst einen Schuss auf und schreibt ausschließlich über die
//   übergebenen Ports:
//     · VectorSystem.deposit    — der EINZIGE Vector-Writer bleibt VectorSystem,
//     · VectorAttractor.spawn   — der EINZIGE Attraktor-Writer bleibt VectorAttractor,
//     · ProjectileSystem.fire   — der EINZIGE Projektil-Writer bleibt ProjectileSystem,
//     · EnemySystem.apply*      — der EINZIGE Gegner-Writer bleibt EnemySystem.
//   root.ts bleibt die EINZIGE Verdrahtung und ruft pro Pflanzenschuss genau einmal hier hinein.
//   Die REIHENFOLGE der Aufrufe ist Teil des Vertrags und bit-identisch zur Pipeline vor der
//   Extraktion: erst die Blitz-Ableitung (sie beendet den Schuss), sonst Projektil + Deposit.
//   Nicht angefasst: state.plants, Clock, Bus, RNG — kein Event, kein Math.random/Date.now,
//   keine Transzendente (Float-Exaktheit: nur Math.sqrt).
//
// 8-Fragen: Existiert? nein (war Callback in root.ts) · Owner PlantShot · Schicht Sim ·
//   Event? nein (der Schuss stößt Projektile/Flags an, der Observer sieht sie) · Seed-Namespace?
//   keiner (geometrische Entscheidung, kein Zufall) · Regel in Source? ja
//   (vector_logic/ballistics/potBoost) · Cap 300, belegt 76 Code-Zeilen · Zweite Quelle? nein.

import type { SimState, PlantEntity, EnemyEntity } from './state';
import type { VectorSystem } from './vectorSystem';
import type { VectorAttractor } from './vectorAttractor';
import type { ProjectileSystem } from './projectileSystem';
import type { EnemySystem } from './enemySystem';
import { resolvePlantStats } from './plantSystem';
import { potBoostAt } from './potBoost';
import { vectorForEffect, VECTOR_ATTRACTOR_CONFIG } from '../config/vector_logic.source';

/** Die vier Writer, die ein Schuss braucht — hereingereicht, nie hier erzeugt. */
export interface ShotPorts {
  vectors: VectorSystem;
  attractors: VectorAttractor;
  projectiles: ProjectileSystem;
  enemies: EnemySystem;
}

/**
 * Löst genau einen Pflanzenschuss auf. `damage` ist bereits die effektive Schadenszahl des
 * PlantSystem (Weakened/Growth sind dort entschieden) — hier wird sie nur noch zugestellt.
 */
export function resolvePlantShot(
  state: SimState,
  ports: ShotPorts,
  plant: PlantEntity,
  target: EnemyEntity,
  damage: number,
): void {
  const stats = resolvePlantStats(state, plant.variantId);
  if (!stats) return;
  const hasCharge = stats.effects.some(id => vectorForEffect(id) === 'VECTOR_CHARGE');
  // Blitz-Trace: Dijkstra cost=1/conductivity — Wasser leitet, Ableiter emergent
  if (hasCharge) {
    const plantGx = plant.gx;
    const plantGy = plant.gy;
    const targetGx = Math.floor(target.px);
    const targetGy = Math.floor(target.py);
    const trace = ports.vectors.traceCharge(state, plantGx, plantGy, targetGx, targetGy);
    if (trace && trace.path.length > 1) {
      let divert: { x: number; y: number } | null = null;
      for (let i = 1; i < trace.path.length - 1; i++) {
        const p = trace.path[i]!;
        const flags = state.vectors[`${p.x},${p.y}`];
        if (flags?.some(c => c.vectorId === 'VECTOR_WET')) { divert = p; break; }
      }
      if (divert) {
        const extra = potBoostAt(state.mapTiles, plant.gx, plant.gy) ? 1 : 0;
        ports.vectors.deposit(state, divert.x, divert.y, 'VECTOR_CHARGE', 1.5, extra);
        return;
      }
      for (const pt of trace.path) {
        const extra = potBoostAt(state.mapTiles, plant.gx, plant.gy) ? 1 : 0;
        ports.vectors.deposit(state, pt.x, pt.y, 'VECTOR_CHARGE', 1.0, extra);
      }
      ports.enemies.applyDamage(state, target.id, damage, false, stats.effects[0] ?? null, plant.id);
      if (stats.effects[1]) ports.enemies.applyEffect(state, target.id, stats.effects[1]);
      return;
    }
  }
  // B6/Ballistik: Durchschlag, Krit und Geschwindigkeit kommen aus dem GENOM
  // (`stats.ballistics`), nicht mehr aus Konstanten hier. ALLE Effekte des Genoms
  // reisen mit (bis EFFECT_SLOTS) — vorher war `effects[1]` toter Content.
  ports.projectiles.fire(state, plant, target, damage, stats.ballistics, stats.effects);
  // Vector-Deposit per Schuss: Topf->Radius, Größe implizit via stats.range/ballistics
  const tgx = Math.floor(target.px);
  const tgy = Math.floor(target.py);
  const extra = potBoostAt(state.mapTiles, plant.gx, plant.gy) ? 1 : 0;
  for (const eff of stats.effects) {
    const vid = vectorForEffect(eff);
    if (!vid) continue;
    if (vid === 'VECTOR_ATTRACTOR') {
      const sp = VECTOR_ATTRACTOR_CONFIG.spawn;
      ports.attractors.spawn(state, plant.gx + 0.5, plant.gy + 0.5, sp.strength, sp.radius, sp.ttl);
    } else if (vid === 'VECTOR_CHARGE') {
      ports.vectors.deposit(state, tgx, tgy, vid, 1.0, extra);
    } else {
      ports.vectors.deposit(state, tgx, tgy, vid, 1.0, extra);
      if (vid === 'VECTOR_OIL' || vid === 'VECTOR_WET' || vid === 'VECTOR_TOX') {
        const dx = tgx - plant.gx;
        const dy = tgy - plant.gy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const frontGx = plant.gx + Math.round(dx / len);
        const frontGy = plant.gy + Math.round(dy / len);
        if (frontGx !== tgx || frontGy !== tgy) ports.vectors.deposit(state, frontGx, frontGy, vid, 1.0, extra);
      }
    }
  }
}

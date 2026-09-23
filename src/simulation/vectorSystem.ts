// Owner: VectorSystem (vectors slice). LOC ≤ 300.
// Einziger Writer von SimState.vectors. Vergängliche Flags pro Zelle, double-buffered,
// deterministisch via rng(cell,tick). Bridging via Addition, Drift skaliert nur Faktor.
// 8-Fragen: Existiert? nein (rg vectors nur State neu) · Owner VectorSystem · Schicht Sim ·
// Event/Command? nein (nur state.vectors + Ticks) · Seed 'world' (Gameplay-NS) · Regel in Source? ja
// (vector_logic) · LOC-Cap 300 · Zweite Quelle? nein (einzige Vector-Truth neben Attr).

import type { SimState, VectorCell } from './state';
import { VECTOR_LOGIC_SOURCE, VECTOR_DRIFT_CAP, VECTOR_DRIFT_STAR_WEIGHT } from '../config/vector_logic.source';
import { driftFor } from '../config/phenotype.source';
import { deriveSeed, makeRng } from '../core/rng';
import { fnv1a } from '../core/hash';
// Tie-Break des Leitfähigkeits-Dijkstra: Code-Units statt Locale (Befund 20.09.2026) —
// sonst hinge der gewählte Blitzpfad an der Browsersprache.
import { compareCodeUnits } from '../core/order';


export class VectorSystem {
  /** Drift-Start aus erstem Genome-Hash (falls vorhanden) oder 0 — deterministisch. */
  private starNorm(state: SimState): number {
    const ids = Object.keys(state.bredStats ?? {});
    if (ids.length === 0) return 0;
    const k = ids.slice().sort()[0] ?? '';
    const h = fnv1a(0x811c9dc5, k);
    return (h % 1000) / 1000;
  }

  private drift(state: SimState): number {
    const active = Object.keys(state.vectors).length + state.attractors.length;
    const base = driftFor(Math.max(1, active + 1));
    const d = base + this.starNorm(state) * VECTOR_DRIFT_STAR_WEIGHT;
    return d > VECTOR_DRIFT_CAP ? VECTOR_DRIFT_CAP : d;
  }

  /** Extern aufgerufen von PlantSystem/Projectile: Flag setzen auf Zelle (inkl. Nachbarn Radius). extraRadius aus Topf/Größe (violet 1.2 → +1). */
  deposit(state: SimState, gx: number, gy: number, vectorId: string, intensity: number, extraRadius = 0): void {
    const src = VECTOR_LOGIC_SOURCE[vectorId as keyof typeof VECTOR_LOGIC_SOURCE];
    if (!src) return;
    const r = src.radius + Math.max(0, Math.floor(extraRadius));
    const ttl = src.ttl;
    // Nachbarschaft rein über Chebyshev-Distanz (max(|dx|,|dy|) ≤ r): Radius 1 = 8 Nachbarn,
    // Radius 2 = 5×5-Feld (24 Nachbarn). Deterministisch, keine sqrt, keine Sonderfälle.
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) {
        this.addCell(state, gx, gy, vectorId, intensity, ttl);
        continue;
      }
      if (r === 0) continue;
      if (Math.abs(dx) > r || Math.abs(dy) > r) continue;
      // Addition = Bridging: zwei Feuer flaggen Mitte, Summe überschreitet threshold
      this.addCell(state, gx + dx, gy + dy, vectorId, intensity * 0.6, ttl);
    }
  }

  /** Ein Schreibpfad für eine Zelle — Deposit und Diffusion teilen ihn (keine zweite Rechnung).
   *  Bounds-Klemme (Befund 21.09.2026): außerhalb der Welt wird NICHT geschrieben — der
   *  Chebyshev-Radius eines Rand-Deposits darf keine Geister-Zellen (−2,20) erzeugen. Gemessen:
   *  ohne Klemme wuchsen 2600 Ticks mit Deposits auf 4,97 Mio. Zellen (bis −19/37 · −24/38),
   *  Out-of-Bounds-Zellen sterben nie (TTL-Refresh) und frieren die Sim ein. */
  private addCell(state: SimState, gx: number, gy: number, vectorId: string, amount: number, ttl: number): void {
    if (amount <= 0) return;
    if (gx < 0 || gy < 0 || gx >= state.cols || gy >= state.rows) return;
    const key = `${gx},${gy}`;
    const cell = state.vectors[key];
    const existing = cell?.find(c => c.vectorId === vectorId);
    if (existing) {
      existing.intensity += amount;
      existing.ttl = ttl; // refresh
    } else {
      const entry: VectorCell = { vectorId, intensity: amount, ttl };
      if (cell) cell.push(entry);
      else state.vectors[key] = [entry];
    }
  }

  /**
   * Ein Tick: Würfel je Zelle+Tick, Schwelle zündet (Diffusion), decay, ttl--, cleanup.
   * Double-buffered: gelesen wird der ALTE State, geschrieben ein neuer — die Zell-Reihenfolge
   * ist damit gleichgültig (Diffusionen werden in sortierter Schlüssel-Reihenfolge gemergt).
   * Kein `if(Paar)`: ob eine Zelle weiterreicht, folgt NUR aus threshold + Würfel + Drift.
   */
  update(state: SimState): void {
    const drift = this.drift(state);
    const next: typeof state.vectors = {};
    /** Diffusionen je Zielzelle — Addition erst nach dem Lesen (Reihenfolge-unabhängig). */
    const spread: Record<string, { vectorId: string; amount: number; ttl: number }[]> = {};
    const tick = state.clock.tick;
    const seed = state.seed;

    for (const key of Object.keys(state.vectors).sort()) {
      const cells = state.vectors[key]!;
      const out: VectorCell[] = [];
      const [gxStr, gyStr] = key.split(',');
      const gx = Number(gxStr), gy = Number(gyStr);
      for (const cell of cells) {
        const src = VECTOR_LOGIC_SOURCE[cell.vectorId as keyof typeof VECTOR_LOGIC_SOURCE];
        if (!src) continue;
        // Würfel pro Zelle+Tick: rng(cell,tick) < base*(1+drift*localCharge) — emergent, reproduzierbar
        const roll = makeRng('world', deriveSeed(seed, 'world', `vector:${key}:${cell.vectorId}`, tick, 1)).next();
        const localCharge = cell.intensity > 1 ? 1 : cell.intensity < 0 ? 0 : cell.intensity;
        const p = src.base * (1 + drift * localCharge);
        // Zündung: nur wenn Content-Schwelle erreicht UND Würfel trifft. Diffusion ist SCHWACH
        // (12% der Intensität) und vergänglich (ttl-6), damit nicht exponentiell explodiert.
        // Brücken tragen trotzdem: die Mitte addiert zwei 0.6 → 1.2 ≥ threshold, zündet einmalig.
        if (src.radius > 0 && src.threshold !== null && cell.intensity >= src.threshold && roll < p) {
          const carry = cell.intensity * 0.12;
          const carryTtl = cell.ttl > 6 ? cell.ttl - 6 : 1;
          if (Number.isFinite(gx) && Number.isFinite(gy)) {
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
              const nk = `${gx + dx},${gy + dy}`;
              (spread[nk] ??= []).push({ vectorId: cell.vectorId, amount: carry, ttl: carryTtl });
            }
          }
        }
        const nextTTL = cell.ttl - 1;
        const nextInt = cell.intensity * src.decay;
        if (nextTTL > 0 && nextInt > 0.01) {
          out.push({ vectorId: cell.vectorId, intensity: nextInt, ttl: nextTTL });
        }
      }
      if (out.length > 0) next[key] = out;
    }

    // Diffusion in sortierter Ziel-Reihenfolge anwenden (deterministisch, keine Float-Assoziativität).
    // Spread kann nicht explodieren, weil Diffusion schwächer ist als der Zerfall der Quelle und
    // jede Generation eine kürzere TTL bekommt (carryTtl -6). Test: 34270 Explosion verhindern.
    for (const key of Object.keys(spread).sort()) {
      // Dieselbe Klemme für Diffusions-Ziele: eine Rand-Zelle diffusionert sonst eine Zeile
      // außerhalb (gx+1 bei gx=cols−1) — dort würde sie nie zerfallen.
      const [sgx, sgy] = key.split(',').map(Number);
      if (sgx < 0 || sgy < 0 || sgx >= state.cols || sgy >= state.rows) continue;
      for (const s of spread[key]!) {
        if (s.amount < 0.01) continue;
        const existing = next[key]?.find(c => c.vectorId === s.vectorId);
        if (existing) {
          existing.intensity += s.amount;
        } else {
          const entry: VectorCell = { vectorId: s.vectorId, intensity: s.amount, ttl: s.ttl };
          if (next[key]) next[key]!.push(entry);
          else next[key] = [entry];
        }
      }
    }
    // Kausalitäts-Kleber: alle Zellen < 0.01 aufräumen — sonst leben Mikro-Reste als Geister-Keys.
    for (const key of Object.keys(next)) {
      const filtered = next[key]!.filter(c => c.intensity >= 0.01 && c.ttl > 0);
      if (filtered.length === 0) delete next[key];
      else next[key] = filtered;
    }

    state.vectors = next;
  }

  /** Lesender Helfer: Flags unter Füßen einer Entität (für enemySystem/plantSystem). */
  flagsAt(state: SimState, gx: number, gy: number): readonly VectorCell[] {
    return state.vectors[`${gx},${gy}`] ?? [];
  }

  /** Blitz-Trace: Dijkstra cost = 1 / conductivity (null → 10). Wasser (0.9 → 1.11) leitet → billigster Pfad nimmt Pfütze. Deterministisch. */
  traceCharge(state: SimState, fromGx: number, fromGy: number, toGx: number, toGy: number): { path: { x: number; y: number }[]; cost: number } | null {
    const cols = state.cols, rows = state.rows;
    const inBounds = (x: number, y: number): boolean => x >= 0 && x < cols && y >= 0 && y < rows;
    if (!inBounds(fromGx, fromGy) || !inBounds(toGx, toGy)) return null;
    const key = (x: number, y: number): string => `${x},${y}`;
    const cellCost = (x: number, y: number): number => {
      const cells = state.vectors[key(x, y)];
      if (!cells || cells.length === 0) return 10;
      let best = 0;
      for (const c of cells) {
        const src = VECTOR_LOGIC_SOURCE[c.vectorId as keyof typeof VECTOR_LOGIC_SOURCE];
        if (src?.conductivity != null && src.conductivity > best) best = src.conductivity;
      }
      return best > 0 ? 1 / best : 10;
    };
    const dist: Record<string, number> = {};
    const prev: Record<string, string | null> = {};
    const startK = key(fromGx, fromGy);
    dist[startK] = 0;
    prev[startK] = null;
    const open: string[] = [startK];
    const visited = new Set<string>();
    while (open.length > 0) {
      open.sort((a, b) => {
        const da = dist[a] ?? Infinity, db = dist[b] ?? Infinity;
        if (da !== db) return da - db;
        return compareCodeUnits(a, b);
      });
      const cur = open.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      if (cur === key(toGx, toGy)) break;
      const [cx, cy] = cur.split(',').map(Number) as [number, number];
      const curD = dist[cur]!;
      const neigh: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of neigh) {
        const nx = cx + dx, ny = cy + dy;
        if (!inBounds(nx, ny)) continue;
        const nk = key(nx, ny);
        if (visited.has(nk)) continue;
        const nd = curD + cellCost(nx, ny);
        if (dist[nk] == null || nd < dist[nk]!) {
          dist[nk] = nd;
          prev[nk] = cur;
          if (!open.includes(nk)) open.push(nk);
        }
      }
    }
    const targetK = key(toGx, toGy);
    if (dist[targetK] == null) return null;
    const path: { x: number; y: number }[] = [];
    let cur: string | null = targetK;
    while (cur) {
      const [x, y] = cur.split(',').map(Number) as [number, number];
      path.push({ x, y });
      cur = prev[cur] ?? null;
    }
    path.reverse();
    return { path, cost: dist[targetK]! };
  }
}

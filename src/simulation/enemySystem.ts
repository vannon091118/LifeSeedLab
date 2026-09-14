// Owner: EnemySystem (enemies slice). LOC ≤ 300.
// May: move, target, receive damage, die, carry statuses.
// May not: render, spawn particles, shake camera (contract Phase 4.2).

import type { SimState, EnemyEntity } from './state';
import { ENEMIES_SOURCE, type EnemySource } from '../config/enemies.source';
import { ENEMY_PATH } from '../config/world.source';
import { makeEvent, type GameEvent } from '../bus/events';
import { nextId } from '../core/ids';
import { makeRng } from '../core/rng';

/** Deploy-Spezifikation (Root leitet sie aus dem Meta-Brutling ab — P6). */
export interface BeetleDeploySpec {
  id: string;
  specimenId: string;
  name: string;
  hp: number;
  attack: number;
  speed: number;
  taunt: boolean;
  deathSpawnX: number;
  color: string;
  spawnX: number;
  cost: number;
}

export class EnemySystem {
  private seq = 0;
  /** Aktive Route (P5): vom Map-Grid abgeleitet oder null = DEFAULT (ENEMY_PATH). */
  private route: ReadonlyArray<{ x: number; y: number }> | null = null;

  constructor(private emit: (e: GameEvent) => void) {}

  /** P5: Route vom MapSystem setzen (SimulationRoot ruft das bei START_WAVE). */
  setRoute(route: ReadonlyArray<{ x: number; y: number }> | null): void {
    this.route = route && route.length >= 2 ? route : null;
  }

  /** Aktive Wegpunkte (Renderer zeigt die Route — read-only). */
  getRoute(): ReadonlyArray<{ x: number; y: number }> | null {
    return this.route;
  }

  /** Wegpunkte dieser Welle: Map-Route wenn vorhanden, sonst DEFAULT-Pfad. */
  private activePath(): ReadonlyArray<{ x: number; y: number }> {
    return this.route ?? ENEMY_PATH;
  }

  /** Deterministic per (rootSeed, waveNumber, spawnIndex) — no stream state (A4-6 pattern). */
  spawn(state: SimState, typeId: string, spawnIndex: number): EnemyEntity | null {
    const src = (ENEMIES_SOURCE as Record<string, EnemySource>)[typeId as keyof typeof ENEMIES_SOURCE];
    if (!src) return null;

    const seed = makeRng('enemy', (state.seed ^ Math.imul(state.wave.number, 0x454e454d) ^ spawnIndex) >>> 0);
    const mult = 1 + state.wave.number * 0.15;
    const hp = Math.round(src.hp * mult);
    const reward = src.reward + Math.floor(seed.next() * 6); // ± deterministic jitter

    const e: EnemyEntity = {
      id: nextId('enemy'),
      typeId: typeId as EnemyEntity['typeId'],
      hp, maxHp: hp,
      px: this.activePath()[0].x, py: this.activePath()[0].y,
      pathIndex: 0,
      pathProgress: 0,
      damage: src.damage,
      reward,
      scoreValue: src.scoreValue,
      slowUntil: 0,
      burnTicks: 0,
      poisonTicks: 0,
      lastHitByPlantId: null,
    };
    state.enemies.push(e);
    return e;
  }

  /** Move all enemies along the ACTIVE path; returns lives leaked this tick. */
  update(state: SimState): number {
    let leaked = 0;
    const path = this.activePath();
    for (const e of state.enemies) {
      if (e.pathIndex >= path.length - 1) {
        leaked += e.damage;
        e.hp = 0;
        continue;
      }
      const target = path[e.pathIndex + 1];
      const dx = target.x - e.px;
      const dy = target.y - e.py;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;

      const src = (ENEMIES_SOURCE as Record<string, EnemySource>)[e.typeId];
      const slowed = state.clock.tick < e.slowUntil;
      const speed = (src?.speed ?? 0.02) * (slowed ? 0.5 : 1);
      if (d < speed) {
        e.pathIndex++;
        e.px = target.x;
        e.py = target.y;
      } else {
        e.px += (dx / d) * speed;
        e.py += (dy / d) * speed;
      }
      e.pathProgress = e.pathIndex / (path.length - 1);
    }

    state.enemies = state.enemies.filter(e => e.hp > 0);
    return leaked;
  }

  /** Damage-over-time + expiry for statuses (deterministic — no per-enemy streams). */
  applyStatusTicks(state: SimState): void {
    for (const e of state.enemies) {
      if (e.burnTicks > 0) {
        e.burnTicks--;
        this.damage(state, e, 2, false);
      }
      if (e.poisonTicks > 0) {
        e.poisonTicks--;
        this.damage(state, e, 1, false);
      }
    }
    state.enemies = state.enemies.filter(e => e.hp > 0);
  }

  /** Chain effect (B6): 50% damage arc to the nearest other enemy within range cells. */
  chainFrom(state: SimState, fromX: number, fromY: number, amount: number, range: number): void {
    let best: EnemyEntity | null = null;
    let bestD = Infinity;
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.px - fromX, dy = e.py - fromY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= range && d < bestD) { best = e; bestD = d; }
    }
    if (best) this.damage(state, best, amount, false);
    state.enemies = state.enemies.filter(e => e.hp > 0);
  }

  /** Called by ProjectileSystem via callback: apply damage, return true if died. */
  applyDamage(
    state: SimState,
    enemyId: string,
    amount: number,
    critical: boolean,
    effectId: string | null,
    sourcePlantId: string | null = null
  ): { died: boolean } {
    const e = state.enemies.find(x => x.id === enemyId);
    if (!e || e.hp <= 0) return { died: false };
    e.hp -= amount;
    if (sourcePlantId) e.lastHitByPlantId = sourcePlantId;

    this.emit(makeEvent(state.clock.tick, 'DAMAGE_DEALT', e.id, ++this.seq, {
      enemyId: e.id, amount, critical, hp: Math.max(0, e.hp), px: e.px, py: e.py,
    }));

    // status application (B6) — deterministic expiry ticks
    if (effectId === 'EFFECT_SLOW') e.slowUntil = state.clock.tick + 90;
    if (effectId === 'EFFECT_BURN') e.burnTicks = 3;
    if (effectId === 'EFFECT_POISON') e.poisonTicks = 5;

    if (e.hp <= 0) {
      this.emit(makeEvent(state.clock.tick, 'ENEMY_DIED', e.id, ++this.seq, {
        enemyId: e.id, px: e.px, py: e.py, reward: e.reward, killerPlantId: e.lastHitByPlantId,
      }));
      return { died: true };
    }
    return { died: false };
  }

  private damage(state: SimState, e: EnemyEntity, amount: number, critical: boolean): void {
    e.hp -= amount;
    this.emit(makeEvent(state.clock.tick, 'DAMAGE_DEALT', e.id, ++this.seq, {
      enemyId: e.id, amount, critical, hp: Math.max(0, e.hp), px: e.px, py: e.py,
    }));
  }

  // ── P6: Eingesetzter Brutling (allierter Kämpfer) ─────────────────
  // Keine zweite Gegnerlogik: der Brutling kämpft GEGEN state.enemies und
  // nutzt dieselben applyDamage/damage-Pfade. Owner: EnemySystem (ein Writer).

  /** Deploy: setzt den gezüchteten Brutling (Spawn 1×–5× = erste Welle an Brutlingen). */
  deployBeetle(state: SimState, spec: BeetleDeploySpec): { ok: boolean; reason?: 'already_deployed' | 'no_energy' } {
    if (state.deployedBeetle) return { ok: false, reason: 'already_deployed' };
    if (state.resources.energy < spec.cost) return { ok: false, reason: 'no_energy' };
    state.resources.energy -= spec.cost;
    const start = this.activePath()[0];
    state.deployedBeetle = {
      id: `beetle_${spec.id}`,
      specimenId: spec.specimenId,
      name: spec.name,
      hp: spec.hp, maxHp: spec.hp,
      attack: spec.attack,
      speed: spec.speed,
      taunt: spec.taunt,
      deathSpawnX: spec.deathSpawnX,
      color: spec.color,
      px: start.x, py: start.y,
      targetId: null,
      biteCooldown: 0,
      freezeTicksLeft: 0,
      broodlings: [],
    };
    // Spawn 1×–5×: X−1 zusätzliche Mini-Brutlinge mit halbierten Werten (P6-Spec).
    // EIGENER Slice (deployedBeetle.broodlings), NICHT state.enemies — sonst
    // beschießen die eigenen Pflanzen die Verbündeten (Befund aus dem Integrationstest).
    for (let i = 1; i < spec.spawnX; i++) {
      this.spawnBroodling(state, 0.5, i);
    }
    this.emit(makeEvent(state.clock.tick, 'BEETLE_DEPLOYED', spec.id, ++this.seq, {
      beetleId: state.deployedBeetle!.id, name: spec.name, px: start.x, py: start.y, spawnCount: spec.spawnX,
    }));
    return { ok: true };
  }

  /** Ein halbwertiger Brutling (Einsatz-Multiplikation oder Todes-Spawn) im Käfer-Slice. */
  private spawnBroodling(state: SimState, factor: number, seq: number): void {
    const b = state.deployedBeetle;
    if (!b) return;
    b.broodlings.push({
      id: `${b.id}_brood${seq}`,
      px: b.px + (seq % 2 === 0 ? 0.3 : -0.3),
      py: b.py + (seq > 1 ? 0.2 : -0.2),
      hp: Math.max(1, Math.round(b.maxHp * factor)),
      maxHp: Math.max(1, Math.round(b.maxHp * factor)),
    });
  }

  /** Brutlings-KI (alliert): friert bei Deploy, sucht Ziel, beißt, stirbt mit Death-Spawn. */
  updateBeetle(state: SimState): void {
    const b = state.deployedBeetle;
    if (!b) return;

    if (b.freezeTicksLeft > 0) { b.freezeTicksLeft--; return; }

    // Ziel: nächster lebender Gegner (Taunt: der Brutling sucht BEWAUSST den vordersten)
    let target: EnemyEntity | null = null;
    let bestD = Infinity;
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      const d = Math.sqrt((e.px - b.px) ** 2 + (e.py - b.py) ** 2);
      const score = b.taunt ? e.pathProgress * 10 - d : d; // Taunt: Priorität auf Weg-Fortschritt
      if (score < bestD) { bestD = score; target = e; }
    }
    b.targetId = target?.id ?? null;
    if (!target) return;

    const dx = target.px - b.px, dy = target.py - b.py;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d > 0.55) {
      b.px += (dx / d) * b.speed;
      b.py += (dy / d) * b.speed;
    } else if (b.biteCooldown <= 0) {
      b.biteCooldown = 30;
      const died = this.applyDamage(state, target.id, b.attack, false, null, null).died;
      if (died && b.deathSpawnX > 0) {
        // „Beim Tod des Gegners" — der Brutling teilt sich (halbe Werte, P6-Spec).
        for (let i = 0; i < b.deathSpawnX; i++) this.spawnBroodling(state, 0.5, 10 + i);
      }
    }
    if (b.biteCooldown > 0) b.biteCooldown--;

    // Mit-Brutlinge folgen dem Leader (eigener Slice — keine Gegner-Logik):
    for (const br of b.broodlings) {
      const bdx = b.px - br.px, bdy = b.py - br.py;
      const bd = Math.sqrt(bdx * bdx + bdy * bdy) || 1;
      if (bd > 0.4) { br.px += (bdx / bd) * b.speed; br.py += (bdy / bd) * b.speed; }
    }

    // Gegenseitiger Schaden: Gegner beißen zurück (Brutling-HP sinkt)
    if (d <= 0.55 && state.clock.tick % 30 === 0) {
      const src = (ENEMIES_SOURCE as Record<string, EnemySource>)[target.typeId];
      b.hp -= Math.max(1, Math.round((src?.damage ?? 5) * 0.2));
      // Splash trifft auch die Mit-Brutlinge (halber Schaden) — sie sind sterblich.
      for (const br of b.broodlings) br.hp -= Math.max(1, Math.round((src?.damage ?? 5) * 0.1));
      b.broodlings = b.broodlings.filter(br => br.hp > 0);
    }

    if (b.hp <= 0) {
      this.emit(makeEvent(state.clock.tick, 'BEETLE_DOWN', b.id, ++this.seq, {
        beetleId: b.id, px: b.px, py: b.py,
      }));
      state.deployedBeetle = null; // Mit-Brutlinge fallen mit dem Leader (ein Slice, ein Schicksal)
    }
  }
}

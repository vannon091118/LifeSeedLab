// Owner: EnemySystem (enemies slice). LOC ≤ 300.
// May: move, target, receive damage, die, carry statuses. May not: render, spawn
// particles, shake camera (contract Phase 4.2).
// B16.1: die aktive Route liegt im State (`currentRoute`, Writer: SimulationRoot) —
// dieses System hält KEINE zweite Kopie mehr (A14: drei Tode derselben Wahrheit).

import type { SimState, EnemyEntity } from './state';
import { ENEMIES_SOURCE, ENEMY_BITE, type EnemySource } from '../config/enemies.source';
import type { RoutePoint } from '../config/world.source';
import { makeEvent, type GameEvent } from '../bus/events';
import { nextId } from '../core/ids';
import { makeRng } from '../core/rng';
import { StatusSystem } from './statusSystem';

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
  /** Status-Writer als eigenes Modul (Regel-1-Split): dieses System bleibt Fassade,
   *  der Schreiber der drei Status-Felder ist der StatusSystem. Der Direkt-Schaden (DoT)
   *  läuft über `damageDirect` — EIN DAMAGE_DEALT-Schreiber, Reihenfolge unverändert. */
  readonly status = new StatusSystem({ damage: (s, e, amt, crit) => this.damageDirect(s, e, amt, crit) });

  constructor(private readonly emit: (e: GameEvent) => void) {}

  /** Aktive Wegpunkte DIESER Tick: aus dem State — dieselbe Wahrheit wie Rendering/UI (B16.1).
   *  R2: die Route ist DAS Pathfinding-Ergebnis; fehlt sie (vor der ersten Berechnung),
   *  fällt der Spawn auf die linke Rand-Spalte zurück (die Quelle des Wegs). */
  activePath(state: SimState): ReadonlyArray<RoutePoint> {
    return state.currentRoute ?? [{ x: 0.5, y: 0.5 }];
  }

  /** Deterministic per (rootSeed, waveNumber, spawnIndex) — no stream state (A4-6 pattern). */
  spawn(state: SimState, typeId: string, spawnIndex: number): EnemyEntity | null {
    const src = (ENEMIES_SOURCE as Record<string, EnemySource>)[typeId as keyof typeof ENEMIES_SOURCE];
    if (!src) return null;

    const seed = makeRng('enemy', (state.seed ^ Math.imul(state.wave.number, 0x454e454d) ^ spawnIndex) >>> 0);
    const mult = 1 + state.wave.number * 0.15;
    const hp = Math.round(src.hp * mult);
    const reward = src.reward + Math.floor(seed.next() * 6); // ± deterministic jitter

    const start = this.activePath(state)[0];
    const e: EnemyEntity = {
      id: nextId('enemy'),
      typeId: typeId as EnemyEntity['typeId'],
      hp, maxHp: hp,
      px: start.x, py: start.y,
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

  /** Move all enemies along the ACTIVE path; returns lives leaked this tick.
   *  P-26: ein Gegner mit `stopsToEat` (Tank/Boss) bleibt stehen, solange eine Pflanze
   *  in Biss-Reichweite steht — die Bewegung wird übersprungen, der Biss landet auf der
   *  Kadenz (biteIntents, Root bucht). Ist die Pflanze tot, läuft er weiter. */
  update(state: SimState): number {
    let leaked = 0;
    const path = this.activePath(state);
    for (const e of state.enemies) {
      if (e.pathIndex >= path.length - 1) {
        leaked += e.damage;
        e.hp = 0;
        continue;
      }
      const src = (ENEMIES_SOURCE as Record<string, EnemySource>)[e.typeId];
      if (src?.stopsToEat && this.biteTarget(state, e)) continue;
      const target = path[e.pathIndex + 1];
      const dx = target.x - e.px;
      const dy = target.y - e.py;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
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

  /**
   * P-26: Biss-Absichten DIESER Tick — reine Daten, kein Zustand. Die Geometrie hat EINEN
   * Eigentümer (`biteTarget`), den Beißen (hier) und das Halten (`update`) gemeinsam lesen;
   * sonst wären „in Reichweite“ und „hält an“ zwei Wahrheiten, die auseinanderlaufen können.
   * Kadenz und Reichweite stehen in `ENEMY_BITE` (Content).
   */
  biteIntents(state: SimState): Array<{ enemyId: string; plantId: string; amount: number }> {
    if (state.clock.tick % ENEMY_BITE.cooldownTicks !== 0) return [];
    const intents: Array<{ enemyId: string; plantId: string; amount: number }> = [];
    for (const e of state.enemies) {
      const src = (ENEMIES_SOURCE as Record<string, EnemySource>)[e.typeId];
      if (!src?.stopsToEat) continue;
      const plantId = this.biteTarget(state, e);
      if (plantId) intents.push({ enemyId: e.id, plantId, amount: ENEMY_BITE.damage });
    }
    return intents;
  }

  /** Nächste Pflanze in Biss-Reichweite (Zellmitte-Distanz, Ties: erste im Array — deterministisch). */
  private biteTarget(state: SimState, e: EnemyEntity): string | null {
    const reach2 = ENEMY_BITE.reach * ENEMY_BITE.reach;
    let bestId: string | null = null;
    let bestD = Infinity;
    for (const p of state.plants) {
      const dx = p.gx + 0.5 - e.px;
      const dy = p.gy + 0.5 - e.py;
      const d = dx * dx + dy * dy;
      if (d <= reach2 && d < bestD) { bestD = d; bestId = p.id; }
    }
    return bestId;
  }

  /** Damage-over-time + expiry — delegiert an den Status-Writer (Regel-1-Split).
   *  root.ts ruft weiterhin DIESE Methode (Fassade); die Rechnung wohnt im StatusSystem. */
  applyStatusTicks(state: SimState): void {
    this.status.tickStatusesOf(state);
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
    if (best) this.damageDirect(state, best, amount, false);
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

    this.setStatus(state, e, effectId);

    if (e.hp <= 0) {
      this.emit(makeEvent(state.clock.tick, 'ENEMY_DIED', e.id, ++this.seq, {
        enemyId: e.id, px: e.px, py: e.py, reward: e.reward, killerPlantId: e.lastHitByPlantId,
      }));
      return { died: true };
    }
    return { died: false };
  }

  /**
   * Zweiter Effekt eines Schusses: Wirkung OHNE Schaden. Ein Schuss trägt bis zu zwei Effekte
   * (`EFFECT_SLOTS`) — vorher reichte `root.ts` nur `effects[0]` durch, der zweite Effekt eines
   * Genoms war damit toter Content. Schaden bleibt einmalig, deshalb getrennt vom Treffer.
   */
  applyEffect(state: SimState, enemyId: string, effectId: string | null): void {
    const e = state.enemies.find(x => x.id === enemyId);
    if (!e || e.hp <= 0) return;
    this.setStatus(state, e, effectId);
  }

  /**
   * Status setzen — delegiert an den Status-Writer. WELCHER Effekt welchen Status setzt,
   * steht in `effectSupport.ts` (Sim-Vertrag); WIE LANGE er wirkt, in `config/effects.source.ts`
   * (Content). Vorher stand hier eine `if`-Kette mit den Literalen 90/3/5, die jeden neuen
   * Effekt still fallen ließ — genau der Grund, warum die acht Gene der zweiten Gruppe
   * unsichtbar gewirkt hätten.
   */
  private setStatus(state: SimState, e: EnemyEntity, effectId: string | null): void {
    this.status.setStatusOf(state, e, effectId);
  }

  /** Direkt-Schaden ohne Status-Wirkung (DoT-Pfad des StatusSystem; ein Emit-Punkt).
   *  Ein Tod wird HIER genauso gemeldet wie in `applyDamage` — vorher fehlte das:
   *  Gift/Brand/Vektor töteten lautlos (HP 0, `statusSystem` filterte den Gegner weg),
   *  also ohne `ENEMY_DIED` und damit ohne Score, Nektar, Kill-Zähler und Todes-FX.
   *  Gemessen 21.09.2026 (Balance-Lauf, ein Leih-Spross): 107 Gegner gestartet,
   *  42 `ENEMY_DIED`, **63 stille Abgänge** — der DoT-Pfad meldete keinen einzigen Tod.
   *  Der Guard oben hält die Invariante „ein toter Gegner stirbt genau einmal" (ein Tick
   *  kann Brand UND Gift ticken; ohne ihn käme der zweite Tod auf denselben Gegner). */
  damageDirect(state: SimState, e: EnemyEntity, amount: number, critical: boolean): void {
    if (e.hp <= 0) return;
    e.hp -= amount;
    this.emit(makeEvent(state.clock.tick, 'DAMAGE_DEALT', e.id, ++this.seq, {
      enemyId: e.id, amount, critical, hp: Math.max(0, e.hp), px: e.px, py: e.py,
    }));
    if (e.hp <= 0) {
      this.emit(makeEvent(state.clock.tick, 'ENEMY_DIED', e.id, ++this.seq, {
        enemyId: e.id, px: e.px, py: e.py, reward: e.reward, killerPlantId: e.lastHitByPlantId,
      }));
    }
  }

  // ── P6: Eingesetzter Brutling (allierter Kämpfer) ────────────────
  // Keine zweite Gegnerlogik: er kämpft GEGEN state.enemies über dieselben
  // applyDamage/damage-Pfade. Owner: EnemySystem (ein Writer).

  /** Deploy: setzt den gezüchteten Brutling (Spawn 1×–5×). */
  deployBeetle(state: SimState, spec: BeetleDeploySpec): { ok: boolean; reason?: 'already_deployed' } {
    if (state.deployedBeetle) return { ok: false, reason: 'already_deployed' };
    const start = this.activePath(state)[0];
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
    // Spawn 1×–5×: X−1 Mini-Brutlinge, halbe Werte. EIGENER Slice (deployedBeetle.
    // broodlings), NICHT state.enemies — sonst beschiesen die Pflanzen die Verbündeten.
    for (let i = 1; i < spec.spawnX; i++) {
      this.spawnBroodling(state, 0.5, i);
    }
    this.emit(makeEvent(state.clock.tick, 'BEETLE_DEPLOYED', spec.id, ++this.seq, {
      beetleId: state.deployedBeetle!.id, name: spec.name, px: start.x, py: start.y, spawnCount: spec.spawnX,
    }));
    return { ok: true };
  }

  /** Halbwertiger Brutling (Einsatz-Multiplikation oder Todes-Spawn). */
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

  /** Brutlings-KI (alliert): friert bei Deploy, sucht Ziel, beißt, Death-Spawn. */
  updateBeetle(state: SimState): void {
    const b = state.deployedBeetle;
    if (!b) return;

    if (b.freezeTicksLeft > 0) { b.freezeTicksLeft--; return; }

    // Ziel: nächster lebender Gegner (Taunt: BEWUSST der vorderste)
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

    // Gegenseitiger Schaden: Gegner beißen zurück (Brutling-HP sinkt; Splash auf Mit-Brutlinge)
    if (d <= 0.55 && state.clock.tick % 30 === 0) {
      const src = (ENEMIES_SOURCE as Record<string, EnemySource>)[target.typeId];
      // Gegenzahn aus dem Content (ENEMY_BITE.share) statt Literale im Code.
      b.hp -= Math.max(1, Math.round((src?.damage ?? 5) * ENEMY_BITE.share));
      for (const br of b.broodlings) br.hp -= Math.max(1, Math.round((src?.damage ?? 5) * ENEMY_BITE.share * 0.5));
      b.broodlings = b.broodlings.filter(br => br.hp > 0);
    }

    if (b.hp <= 0) {
      this.emit(makeEvent(state.clock.tick, 'BEETLE_DOWN', b.id, ++this.seq, {
        beetleId: b.id, px: b.px, py: b.py,
      }));
      state.deployedBeetle = null; // Mit-Brutlinge fallen mit dem Leader (ein Slice)
    }
  }
}

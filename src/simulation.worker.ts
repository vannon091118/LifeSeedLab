import type { GameState, Tower, Enemy, Projectile, WaveConfig, EnemyType, Position, RunStartConfig, WorkerInMessage, WorkerOutMessage } from './types';
import { GRID_COLS, GAME_SEED } from './config';
import { makeRng } from './genome';

// ── Determinism ──────────────────────────────────────────────
// All randomness derives from runSeed (GAME_SEED + run counter).
// No Math.random. No Date.now. Fully reproducible runs.

const GRID_ROWS = 8;
const TICK_MS = 1000 / 30; // 30 ticks per second
const BREED_BASE_COST = 40;

function makePath(): Position[] {
  return [
    { x: 0, y: 3.5 },
    { x: 2.5, y: 3.5 },
    { x: 2.5, y: 1.5 },
    { x: 5.5, y: 1.5 },
    { x: 5.5, y: 5.5 },
    { x: 8.5, y: 5.5 },
    { x: 8.5, y: 2.5 },
    { x: 11.5, y: 2.5 },
    { x: 12, y: 2.5 },
  ];
}

function dist(a: Position, b: Position): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ── Endless wave generation (deterministic per wave number) ──
function generateWave(n: number): WaveConfig {
  const rng = makeRng((GAME_SEED ^ Math.imul(n, 2654435761)) >>> 0);
  const enemies: WaveConfig['enemies'] = [];

  const grunts = 4 + Math.floor(n * 1.5 + rng() * 3);
  enemies.push({ type: 'grunt', count: grunts, delay: Math.max(6, 18 - n) });

  if (n >= 3) {
    enemies.push({ type: 'fast', count: 2 + Math.floor(n * 0.8), delay: Math.max(4, 12 - Math.floor(n / 2)) });
  }
  if (n >= 6) {
    enemies.push({ type: 'tank', count: 1 + Math.floor(n / 5), delay: 20 });
  }
  if (n >= 9) {
    enemies.push({ type: 'swarm', count: 4 + n * 2, delay: 2 });
  }
  if (n % 10 === 0) {
    enemies.push({ type: 'boss', count: 1, delay: 40 });
  }

  return { waveNumber: n, enemies, reward: 20 + n * 10 };
}

// ── Enemy factory ────────────────────────────────────────────
let enemyCounter = 0;

function createEnemy(type: EnemyType, waveNum: number, rng: () => number): Enemy {
  const mult = 1 + waveNum * 0.15;
  const base: Record<EnemyType, { hp: number; speed: number; damage: number; reward: number; color: string }> = {
    grunt: { hp: 40,  speed: 0.02,  damage: 10,  reward: 10,  color: '#f87171' },
    fast:  { hp: 25,  speed: 0.045, damage: 5,   reward: 15,  color: '#fbbf24' },
    tank:  { hp: 150, speed: 0.012, damage: 25,  reward: 30,  color: '#60a5fa' },
    swarm: { hp: 15,  speed: 0.035, damage: 3,   reward: 5,   color: '#a78bfa' },
    boss:  { hp: 800, speed: 0.008, damage: 100, reward: 150, color: '#f472b6' },
  };
  const b = base[type];
  const hp = Math.round(b.hp * mult);
  return {
    id: `e_${++enemyCounter}`,
    type,
    hp,
    maxHp: hp,
    speed: b.speed,
    damage: b.damage,
    pathIndex: 0,
    pathProgress: 0,
    pos: { x: 0, y: 3.5 },
    reward: b.reward + Math.floor(rng() * 6),
    color: b.color,
  };
}

// ── State ────────────────────────────────────────────────────
let runCounter = 0;

function freshState(): GameState {
  return {
    tick: 0,
    money: 150,
    lives: 20,
    wave: 0,
    phase: 'prep',
    towers: [],
    enemies: [],
    projectiles: [],
    discoveredVariants: [],
    inventory: {},
    waveConfigs: [generateWave(1)],
    spawnQueue: [],
    lastSpawnTick: 0,
    path: makePath(),
    nektarEarned: 0,
    runSeed: (GAME_SEED + runCounter) >>> 0,
    breedCounter: 0,
  };
}

let state: GameState = freshState();
let rng = makeRng(state.runSeed);

let lastTime = 0;
let tickCount = 0;
let running = false;

function cloneState(s: GameState): GameState {
  return {
    ...s,
    towers: s.towers.map(t => ({ ...t, pos: { ...t.pos } })),
    enemies: s.enemies.map(e => ({ ...e, pos: { ...e.pos } })),
    projectiles: s.projectiles.map(p => ({ ...p, pos: { ...p.pos } })),
    path: s.path.map(p => ({ ...p })),
    waveConfigs: s.waveConfigs,
    inventory: { ...s.inventory },
  };
}

// ── Tick ─────────────────────────────────────────────────────
function tick(): void {
  state.tick++;
  tickCount++;

  if (state.phase === 'wave') {
    spawnEnemies();
    moveEnemies();

    // moveEnemies can end the game mid-wave
    if (state.phase === 'wave') {
      towerShoot();
      moveProjectiles();
      checkWaveComplete();
    }
  } else if (state.phase === 'prep') {
    // heal aura towers heal neighbours during prep
    for (const t of state.towers) {
      if (t.variant.stats.special === 'heal_aura') {
        for (const other of state.towers) {
          if (other !== t && dist(t.pos, other.pos) <= t.variant.stats.range) {
            other.hp = Math.min(other.variant.stats.hp, other.hp + 2);
          }
        }
      }
    }
    // passive energy drip: +2 every 30 ticks (1s) during prep
    if (state.tick % 30 === 0) {
      state.money += 2;
    }
  }

  self.postMessage({ type: 'state', state: cloneState(state) } as WorkerOutMessage);
}

// ── Spawn ────────────────────────────────────────────────────
function spawnEnemies(): void {
  if (state.spawnQueue.length === 0) return;

  const next = state.spawnQueue[0];
  if (state.tick - state.lastSpawnTick >= next.delay) {
    state.enemies.push(createEnemy(next.type, state.wave, rng));
    state.spawnQueue.shift();
    state.lastSpawnTick = state.tick;
  }
}

// ── Move enemies ─────────────────────────────────────────────
function moveEnemies(): void {
  const path = state.path;
  for (const e of state.enemies) {
    if (e.pathIndex >= path.length - 1) {
      state.lives = Math.max(0, state.lives - e.damage);
      e.hp = 0;
      continue;
    }

    const target = path[e.pathIndex + 1];
    const dx = target.x - e.pos.x;
    const dy = target.y - e.pos.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;

    if (d < e.speed) {
      e.pathIndex++;
      e.pos.x = target.x;
      e.pos.y = target.y;
    } else {
      e.pos.x += (dx / d) * e.speed;
      e.pos.y += (dy / d) * e.speed;
    }
    e.pathProgress = e.pathIndex / (path.length - 1);
  }

  state.enemies = state.enemies.filter(e => e.hp > 0);

  if (state.lives <= 0 && state.phase === 'wave') {
    endRun();
  }
}

function endRun(): void {
  state.phase = 'gameover';
  self.postMessage({
    type: 'game_over',
    nektarEarned: state.nektarEarned,
    waveReached: state.wave,
  } as WorkerOutMessage);
}

// ── Tower shooting ───────────────────────────────────────────
function towerShoot(): void {
  for (const t of state.towers) {
    if (t.variant.stats.damage <= 0) continue;
    if (state.tick - t.lastShot < t.variant.stats.cooldown) continue;

    let nearest: Enemy | null = null;
    let nearDist = Infinity;

    for (const e of state.enemies) {
      const d = dist(t.pos, e.pos);
      if (d <= t.variant.stats.range && d < nearDist) {
        nearest = e;
        nearDist = d;
      }
    }

    if (nearest) {
      t.lastShot = state.tick;
      const dx = nearest.pos.x - t.pos.x;
      const dy = nearest.pos.y - t.pos.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;

      state.projectiles.push({
        id: `p_${state.tick}_${t.id}`,
        pos: { x: t.pos.x, y: t.pos.y },
        dx: dx / d,
        dy: dy / d,
        speed: 0.15,
        damage: t.variant.stats.damage,
        targetId: nearest.id,
        color: t.variant.color,
        pierce: t.variant.genome.some(g => g.id === 'pierce' && g.power > 0.3) ? 2 : 0,
      });
    }
  }
}

// ── Projectiles ──────────────────────────────────────────────
function moveProjectiles(): void {
  for (const p of state.projectiles) {
    p.pos.x += p.dx * p.speed;
    p.pos.y += p.dy * p.speed;

    for (const e of state.enemies) {
      if (e.hp <= 0) continue; // no double kill reward
      if (dist(p.pos, e.pos) < 0.4) {
        e.hp -= p.damage;
        if (p.pierce <= 0) {
          p.pos.x = -999;
        } else {
          p.pierce--;
        }
        if (e.hp <= 0) {
          state.money += e.reward;
          state.nektarEarned += Math.max(1, Math.floor(e.reward / 5));
        }
        break;
      }
    }
  }

  state.enemies = state.enemies.filter(e => e.hp > 0);
  state.projectiles = state.projectiles.filter(p => p.pos.x > -100);
}

// ── Wave completion ──────────────────────────────────────────
function checkWaveComplete(): void {
  if (state.phase !== 'wave') return;
  if (state.lives <= 0) return;

  if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
    const cfg = state.waveConfigs[state.wave - 1];
    if (cfg) state.money += cfg.reward;

    // endless: always generate the next wave
    state.waveConfigs.push(generateWave(state.wave + 1));
    state.phase = 'prep';
    self.postMessage({ type: 'wave_complete', wave: state.wave } as WorkerOutMessage);
  }
}

// ── Game loop (setTimeout chain — workers have no rAF) ───────
function gameLoop(): void {
  if (!running) return;

  const now = performance.now();
  const elapsed = now - lastTime;

  if (elapsed >= TICK_MS) {
    lastTime = now;
    tick();
    const fps = Math.round(1000 / Math.max(elapsed, 1));
    if (tickCount % 30 === 0) {
      self.postMessage({ type: 'tick_done', tick: state.tick, fps } as WorkerOutMessage);
    }
  }

  const drift = performance.now() - now;
  setTimeout(gameLoop, Math.max(1, TICK_MS - drift));
}

// ── Message handler ──────────────────────────────────────────
self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'init':
      if (msg.state) state = { ...state, ...msg.state };
      break;

    case 'tick':
      if (!running) {
        running = true;
        lastTime = performance.now() - TICK_MS;
        gameLoop();
      }
      break;

    case 'place_tower': {
      const inv = state.inventory[msg.variant.id] || 0;
      if (inv <= 0) break;
      if (state.money < msg.variant.cost) break;

      const occupied = state.towers.some(t => t.gridX === msg.gridX && t.gridY === msg.gridY);
      if (occupied) break;

      const cellCenter = { x: msg.gridX + 0.5, y: msg.gridY + 0.5 };
      const onPath = state.path.some(p => dist(p, cellCenter) < 1.2);
      if (onPath) break;

      state.money -= msg.variant.cost;
      state.inventory[msg.variant.id]--;

      state.towers.push({
        id: `t_${state.tick}_${msg.gridX}_${msg.gridY}`,
        variant: msg.variant,
        pos: cellCenter,
        hp: msg.variant.stats.hp,
        lastShot: 0,
        gridX: msg.gridX,
        gridY: msg.gridY,
      });
      break;
    }

    case 'remove_tower': {
      const idx = state.towers.findIndex(t => t.id === msg.towerId);
      if (idx >= 0) {
        const t = state.towers[idx];
        state.money += Math.floor(t.variant.cost * 0.5);
        state.inventory[t.variant.id] = (state.inventory[t.variant.id] || 0) + 1;
        state.towers.splice(idx, 1);
      }
      break;
    }

    case 'start_wave': {
      if (state.phase !== 'prep') break;
      state.wave++;
      state.phase = 'wave';
      const cfg = state.waveConfigs[state.wave - 1] || generateWave(state.wave);
      if (state.waveConfigs.length < state.wave) {
        state.waveConfigs.push(cfg);
      }
      state.spawnQueue = [];
      for (const group of cfg.enemies) {
        for (let i = 0; i < group.count; i++) {
          state.spawnQueue.push({ type: group.type, delay: group.delay });
        }
      }
      // deterministic shuffle from run seed state
      for (let i = state.spawnQueue.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [state.spawnQueue[i], state.spawnQueue[j]] = [state.spawnQueue[j], state.spawnQueue[i]];
      }
      break;
    }

    case 'set_state':
      state = { ...state, ...msg.state };
      rng = makeRng(state.runSeed ^ state.tick);
      break;

    case 'add_variant':
      if (!state.discoveredVariants.includes(msg.variant.id)) {
        state.discoveredVariants.push(msg.variant.id);
      }
      state.inventory[msg.variant.id] = (state.inventory[msg.variant.id] || 0) + msg.count;
      break;

    case 'breed': {
      if (state.money < msg.energyCost) break;
      state.money -= msg.energyCost;
      state.breedCounter++;
      if (!state.discoveredVariants.includes(msg.child.id)) {
        state.discoveredVariants.push(msg.child.id);
      }
      state.inventory[msg.child.id] = (state.inventory[msg.child.id] || 0) + 1;
      break;
    }

    case 'reset_run': {
      runCounter++;
      state = freshState();
      state.runSeed = (GAME_SEED + runCounter) >>> 0;
      rng = makeRng(state.runSeed);
      state.phase = 'prep';
      void msg.config; // loadout applied by main thread via set_state right after
      break;
    }
  }

  self.postMessage({ type: 'state', state: cloneState(state) } as WorkerOutMessage);
};

self.postMessage({ type: 'state', state: cloneState(state) } as WorkerOutMessage);

// Owner: VisualObserverSystem. LOC ≤ 400.
// Reads gameplay events, emits visual commands. May NOT: damage, heal,
// giveScore, spawnEnemy, changeWave (contract Phase 8.2).

import type { GameEvent } from '../bus/events';
import type { Camera } from '../render/camera';

// ── Visual Commands (Phase 8.1) ─────────────────────────────
export type VisualCommand =
  | { type: 'SpawnParticleBurst'; profile: string; x: number; y: number; seed: number; intensity: number }
  | { type: 'SpawnFloatingNumber'; text: string; x: number; y: number; color: string; intensity: number }
  | { type: 'PunchScale'; entityId: string; strength: number }
  | { type: 'CameraShake'; intensity: number }
  | { type: 'ScreenFlash'; color: string; alpha: number; ticks: number }
  | { type: 'ShowMangaText'; text: 'CRITICAL' | 'KO' | 'WAVE CLEAR' | 'BONUS'; x: number; y: number; intensity: number }
  | { type: 'PlayAnimation'; entityId: string; anim: 'attack' | 'hit' | 'recoil' | 'death' | 'grow' | 'placement'; ticks: number };

export type Intensity = 0 | 1 | 2 | 3 | 4 | 5; // none/normal/strong/critical/elite/major (Phase 10.1)

const INTENSITY_PARTICLES: Record<Intensity, number> = { 0: 0, 1: 6, 2: 10, 3: 16, 4: 24, 5: 36 };

export class VisualObserver {
  private queue: VisualCommand[] = [];
  private seq = 0;

  constructor(
    private camera: Camera,
    private fxEnabled: boolean
  ) {}

  setFxEnabled(on: boolean): void {
    this.fxEnabled = on;
  }

  /** Consume a gameplay event → emit visual commands. */
  observe(e: GameEvent): void {
    switch (e.type) {
      case 'PROJECTILE_HIT':
        this.push({
          type: 'SpawnParticleBurst',
          profile: 'impact_ring',
          x: e.payload.px, y: e.payload.py,
          seed: (e.tick * 31 + this.seq * 7) | 0,
          intensity: e.payload.critical ? 3 : 1,
        });
        if (!e.payload.critical) break;
        this.push({ type: 'ShowMangaText', text: 'CRITICAL', x: e.payload.px, y: e.payload.py, intensity: 3 });
        this.push({ type: 'CameraShake', intensity: 4 });
        break;

      case 'ENEMY_DIED':
        this.push({ type: 'SpawnParticleBurst', profile: 'death_pop', x: e.payload.px, y: e.payload.py, seed: (e.tick * 17 + this.seq * 3) | 0, intensity: 2 });
        this.push({ type: 'SpawnFloatingNumber', text: `+${e.payload.reward}`, x: e.payload.px, y: e.payload.py, color: '#fbbf24', intensity: 1 });
        break;

      case 'PLANT_PLACED':
        this.push({ type: 'PlayAnimation', entityId: e.payload.plantId, anim: 'placement', ticks: 12 });
        this.push({ type: 'SpawnParticleBurst', profile: 'dust_puff', x: e.payload.gx + 0.5, y: e.payload.gy + 0.5, seed: (e.tick * 13 + this.seq) | 0, intensity: 1 });
        break;

      case 'WAVE_COMPLETED':
        this.push({ type: 'ShowMangaText', text: 'WAVE CLEAR', x: 6, y: 4, intensity: 5 });
        this.push({ type: 'CameraShake', intensity: 2 });
        break;

      case 'GAME_OVER':
        this.push({ type: 'ScreenFlash', color: '#7f1d1d', alpha: 0.5, ticks: 30 });
        this.push({ type: 'CameraShake', intensity: 8 });
        break;

      case 'CRITICAL_HIT':
        this.push({ type: 'SpawnFloatingNumber', text: 'CRIT', x: 0, y: 0, color: '#fda4af', intensity: 3 });
        break;

      case 'PLACEMENT_REJECTED':
        this.push({ type: 'CameraShake', intensity: 1 });
        break;

      default:
        break; // observed, no FX
    }
  }

  private push(c: VisualCommand): void {
    // FX OFF = strictly no cosmetic commands queue up (clean Test C semantics)
    if (!this.fxEnabled) return;
    this.queue.push(c);
    this.seq++;
  }

  drain(): VisualCommand[] {
    const out = this.queue;
    this.queue = [];
    return out;
  }

  get pending(): number {
    return this.queue.length;
  }
}

export { INTENSITY_PARTICLES };

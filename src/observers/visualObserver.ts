// Owner: VisualObserverSystem. LOC ≤ 400.
// Reads gameplay events, emits visual commands. May NOT: damage, heal,
// giveScore, spawnEnemy, changeWave (contract Phase 8.2).
// B5: vollständige Event→FX-Matrix; Farben werden HIER aus den Sources aufgelöst —
// Executors reichen sie nur durch (Defect A5: keine Farblogik im UI).

import type { GameEvent } from '../bus/events';
import type { Camera } from '../render/camera';
import { EFFECTS_SOURCE } from '../config/effects.source';
import { VECTOR_VISUAL_SOURCE } from '../config/vector_visual.source';
import { vectorForEffect } from '../config/vector_logic.source';

// ── Visual Commands (Phase 8.1) ─────────────────────────────
export type VisualCommand =
  | { type: 'SpawnParticleBurst'; profile: string; x: number; y: number; seed: number; intensity: number; color: string }
  | { type: 'SpawnFloatingNumber'; text: string; x: number; y: number; color: string; intensity: number; crit: boolean }
  | { type: 'PunchScale'; entityId: string; strength: number }
  | { type: 'CameraShake'; intensity: number }
  | { type: 'ScreenFlash'; color: string; alpha: number; ticks: number }
  | { type: 'SpawnRewardFlight'; x: number; y: number; color: string }
  | { type: 'ShowMangaText'; text: string; x: number; y: number; intensity: number }
  | { type: 'PlayAnimation'; entityId: string; anim: 'attack' | 'hit' | 'recoil' | 'death' | 'grow' | 'placement'; ticks: number };

const INK = '#2b2b26';

function effectColor(effectId: string | null): string {
  if (!effectId) return '#d9c9a3'; // neutral paper dust
  const vid = vectorForEffect(effectId);
  if (vid && VECTOR_VISUAL_SOURCE[vid as keyof typeof VECTOR_VISUAL_SOURCE]) return VECTOR_VISUAL_SOURCE[vid as keyof typeof VECTOR_VISUAL_SOURCE].paletteModifier;
  return EFFECTS_SOURCE[effectId as keyof typeof EFFECTS_SOURCE]?.paletteModifier ?? '#d9c9a3';
}
function effectProfile(effectId: string | null): string | null {
  if (!effectId) return null;
  const vid = vectorForEffect(effectId);
  if (vid && VECTOR_VISUAL_SOURCE[vid as keyof typeof VECTOR_VISUAL_SOURCE]) return VECTOR_VISUAL_SOURCE[vid as keyof typeof VECTOR_VISUAL_SOURCE].particleProfile;
  return null;
}

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

  /** Consume a gameplay event → emit visual commands (B5 matrix). */
  observe(e: GameEvent): void {
    switch (e.type) {
      case 'DAMAGE_DEALT':
        this.push({ type: 'SpawnFloatingNumber', text: String(e.payload.amount), x: e.payload.px, y: e.payload.py, color: INK, intensity: 1, crit: false });
        this.push({ type: 'PunchScale', entityId: e.payload.enemyId, strength: 0.15 });
        this.push({ type: 'SpawnParticleBurst', profile: 'impact_ring', x: e.payload.px, y: e.payload.py, seed: (e.tick * 31 + this.seq * 7) | 0, intensity: 1, color: '#d9c9a3' });
        break;

      case 'CRITICAL_HIT':
        this.push({ type: 'SpawnFloatingNumber', text: String(e.payload.amount), x: e.payload.px, y: e.payload.py, color: '#c96f8e', intensity: 3, crit: true });
        this.push({ type: 'ShowMangaText', text: 'KRIT!', x: e.payload.px, y: e.payload.py, intensity: 3 });
        this.push({ type: 'CameraShake', intensity: 3 });
        this.push({ type: 'ScreenFlash', color: '#f5efdc', alpha: 0.12, ticks: 3 });
        this.push({ type: 'SpawnParticleBurst', profile: 'burst_star', x: e.payload.px, y: e.payload.py, seed: (e.tick * 13 + this.seq * 5) | 0, intensity: 1.5, color: '#c96f8e' });
        break;

      case 'PROJECTILE_HIT': {
        const color = effectColor(e.payload.effectId);
        const vecProfile = effectProfile(e.payload.effectId);
        const profile = vecProfile ?? (e.payload.effectId === 'EFFECT_BURN' ? 'ember_burst'
          : e.payload.effectId === 'EFFECT_SLOW' ? 'frost_mist'
          : e.payload.effectId === 'EFFECT_POISON' ? 'bubble_pop'
          : e.payload.effectId === 'EFFECT_CHAIN' ? 'chain_arc'
          : 'impact_ring');
        this.push({ type: 'SpawnParticleBurst', profile, x: e.payload.px, y: e.payload.py, seed: (e.tick * 17 + this.seq * 3) | 0, intensity: e.payload.critical ? 1.5 : 1, color });
        break;
      }

      case 'PROJECTILE_FIRED':
        this.push({ type: 'PlayAnimation', entityId: e.payload.plantId, anim: 'attack', ticks: 8 });
        break;

      case 'ENEMY_DIED':
        this.push({ type: 'SpawnParticleBurst', profile: 'death_pop', x: e.payload.px, y: e.payload.py, seed: (e.tick * 17 + this.seq * 3) | 0, intensity: 2, color: '#a94438' });
        this.push({ type: 'SpawnFloatingNumber', text: `+${e.payload.reward}`, x: e.payload.px, y: e.payload.py, color: '#d9a441', intensity: 1, crit: false });
        this.push({ type: 'PunchScale', entityId: e.payload.enemyId, strength: 0.3 });
        break;

      case 'REWARD_GRANTED':
        // B5.1: die Belohnung REIST — vom Ort ihrer Ursache zum Zähler im HUD. Der Ort kommt aus
        // dem Payload, nie aus einer Annahme: hier stand früher ein Burst in der Rastermitte
        // (`x: 6, y: 4`), also eine Behauptung über die Welt, die niemand geprüft hat. Fehlt der
        // Ort (Wellen-Bonus), unterbleibt die Reise statt zu erfinden, wo sie begann.
        if (e.payload.px === null || e.payload.py === null) break;
        this.push({ type: 'SpawnRewardFlight', x: e.payload.px, y: e.payload.py, color: '#d9a441' });
        break;

      case 'WAVE_STARTED':
        // P3QA-06: der Banner-Text lag mittig über der Platzierungszone (x=6,y=3 ist die
        // Mitte des 12×12-Rasters und genau die Baufreie Mitte). Er sitzt jetzt oben links
        // im HUD-freien Rand (y=0.6), wo keine Bauzelle verloren geht.
        this.push({ type: 'ShowMangaText', text: `WELLE ${e.payload.wave}`, x: 3, y: 0.6, intensity: 4 });
        this.push({ type: 'SpawnParticleBurst', profile: 'warn_pulse', x: 0, y: 3.5, seed: (e.tick * 23) | 0, intensity: 1, color: '#a94438' });
        break;

      case 'LAYOUT_DONE':
        // R1: die Build-Sequenz ist abgeschlossen — ein beruhigender Puls signalisiert
        // den Übergang in die erste Vorbereitung (denselben Kanal wie der Wellen-Warncall).
        this.push({ type: 'ShowMangaText', text: 'BAUPHASE BEENDET', x: 3, y: 0.6, intensity: 3 });
        this.push({ type: 'SpawnParticleBurst', profile: 'warn_pulse', x: 0, y: 3.5, seed: (e.tick * 23) | 0, intensity: 1, color: '#a94438' });
        break;

      case 'WAVE_COMPLETED':
        // P3QA-06: auch Clear/K.O. nicht mehr über der Bau-Mitte, sondern im HUD-freien Rand.
        this.push({ type: 'ShowMangaText', text: 'CLEAR!', x: 3, y: 0.6, intensity: 5 });
        this.push({ type: 'ScreenFlash', color: '#5a8f4e', alpha: 0.10, ticks: 6 });
        this.push({ type: 'SpawnParticleBurst', profile: 'confetti_leaf', x: 6, y: 2, seed: (e.tick * 29) | 0, intensity: 1.5, color: '#5a8f4e' });
        break;

      case 'PLANT_PLACED':
        this.push({ type: 'PlayAnimation', entityId: e.payload.plantId, anim: 'placement', ticks: 12 });
        this.push({ type: 'SpawnParticleBurst', profile: 'dust_puff', x: e.payload.gx + 0.5, y: e.payload.gy + 0.5, seed: (e.tick * 13 + this.seq) | 0, intensity: 1, color: '#b7a986' });
        break;

      // ── Pflanzenlebenszyklus (B4): Wachstum, Schwäche, Welken, Vermehrung ──
      case 'PLANT_GROWN':
        // Reife: Blattgrün steigt vom Boden auf — die Pflanze „erhebt sich aufs Papier“.
        this.push({ type: 'PlayAnimation', entityId: e.payload.plantId, anim: 'grow', ticks: 14 });
        this.push({ type: 'SpawnParticleBurst', profile: 'glow_rise', x: e.payload.gx + 0.5, y: e.payload.gy + 0.5, seed: (e.tick * 37 + this.seq) | 0, intensity: 1, color: '#86efac' });
        break;

      case 'PLANT_WEAKENED':
        // Kein gx/gy im Payload: das Welken zeigt sich als sichtbares Einsacken der Entity.
        this.push({ type: 'PunchScale', entityId: e.payload.plantId, strength: -0.12 });
        break;

      case 'PLACEMENT_REJECTED':
      // B29: dieselbe Ablehnungssprache für den Karten-Bau. Der Controller delegiert die
      // Map-Regeln bewusst an die Sim — die Antwort muss dort ankommen, wo der Finger war.
      case 'TILE_REJECTED':
        this.push({ type: 'SpawnParticleBurst', profile: 'warn_pulse', x: e.payload.gx + 0.5, y: e.payload.gy + 0.5, seed: (e.tick * 7) | 0, intensity: 1, color: '#a94438' });
        break;

      // B29: pflanzgebundene Ablehnung. Diese Payloads tragen keinen Ort, sondern die Entity —
      // also antwortet die Pflanze selbst (Rückstoß), und der Grund steht im Notice-Text.
      // `recoil` war im Command-Vertrag längst vorgesehen, aber im Renderer nie umgesetzt:
      // die Animation muss auch sichtbar sein, sonst wäre die Ablehnung erneut stumm.
      case 'FERTILIZE_REJECTED':
      case 'PROPAGATE_REJECTED':
        this.push({ type: 'PlayAnimation', entityId: e.payload.plantId, anim: 'recoil', ticks: 10 });
        break;

      case 'PLANT_PROPAGATED':
        // Setzling: ein sanfter Papierring um die neue Position, im Blattton.
        this.push({ type: 'SpawnParticleBurst', profile: 'ring_soft', x: e.payload.gx + 0.5, y: e.payload.gy + 0.5, seed: (e.tick * 41 + this.seq) | 0, intensity: 1, color: '#a7c08a' });
        this.push({ type: 'PlayAnimation', entityId: e.payload.plantId, anim: 'placement', ticks: 10 });
        break;

      case 'PLANT_WITHERED':
        // Verwelkt: Papierstaub sinkt zu Boden (schwerkraftbetont), entsättigt Rot-Braun.
        this.push({ type: 'SpawnParticleBurst', profile: 'wither_dust', x: e.payload.gx + 0.5, y: e.payload.gy + 0.5, seed: (e.tick * 43 + this.seq) | 0, intensity: 1.5, color: '#9c8464' });
        this.push({ type: 'PlayAnimation', entityId: e.payload.plantId, anim: 'death', ticks: 12 });
        break;

      case 'PLANT_FERTILIZED':
        // Kein gx/gy im Payload: der Dünger-Kick zeigt sich als kräftiger Puls der Entity.
        this.push({ type: 'PunchScale', entityId: e.payload.plantId, strength: 0.18 });
        break;

      case 'NIGHT_STARTED':
        this.push({ type: 'ShowMangaText', text: 'NACHT …', x: 6, y: 2.5, intensity: 2 });
        this.push({ type: 'SpawnParticleBurst', profile: 'spawn_spore', x: 6, y: 4, seed: (e.tick * 19) | 0, intensity: 1, color: '#8fa3c0' });
        break;

      case 'DAY_STARTED':
        this.push({ type: 'SpawnParticleBurst', profile: 'spawn_spore', x: 6, y: 4, seed: (e.tick * 19) | 0, intensity: 1, color: '#e8dfc8' });
        break;

      // ── P6/P8: Käfer (Brutling) — eigene Bernstein/Tusche-FX-Sprache, deutlich
      // unterscheidbar von der Pflanzenpräsentation (kein Grün, kein chime): ──
      case 'BEETLE_DEPLOYED':
        // Einsatz: bernsteinfarbener Puls-Ring am Pfadkopf — „das Tier tritt an".
        this.push({ type: 'SpawnParticleBurst', profile: 'ring_soft', x: e.payload.px + 0.5, y: e.payload.py + 0.5, seed: (e.tick * 47 + this.seq) | 0, intensity: 2, color: '#d9a441' });
        this.push({ type: 'ShowMangaText', text: e.payload.name.toUpperCase() + '!', x: e.payload.px, y: e.payload.py - 1, intensity: 3 });
        break;

      case 'BEETLE_DOWN':
        // K.O.: Tusche-Fleck zerfällt — kalt, asymmetrisch, kein Blattstaub.
        this.push({ type: 'SpawnParticleBurst', profile: 'wither_dust', x: e.payload.px + 0.5, y: e.payload.py + 0.5, seed: (e.tick * 53 + this.seq) | 0, intensity: 2, color: '#5b5348' });
        break;

      case 'GAME_OVER':
        this.push({ type: 'ScreenFlash', color: '#a94438', alpha: 0.35, ticks: 30 });
        this.push({ type: 'CameraShake', intensity: 8 });
        this.push({ type: 'ShowMangaText', text: 'K.O.', x: 3, y: 0.6, intensity: 5 });
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

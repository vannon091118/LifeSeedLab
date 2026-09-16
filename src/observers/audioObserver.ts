// Owner: AudioObserverSystem. LOC ≤ 250.
// Zweiter Observer (B8): liest Events, spielt synthetisierte SFX.
// Emittiert NICHTS, erzeugt KEIN RNG, verändert kein Gameplay.
// Lazy AudioContext beim ersten User-Gesture (iOS-Unlock). FX OFF = stumm.

import type { GameEvent } from '../bus/events';

type SynthProfile = 'shot_sharp' | 'thud' | 'chime' | 'frost' | 'fire' | 'zap'
  | 'blub' | 'hum' | 'whoosh' | 'crit' | 'wave_horn' | 'ko' | 'place';

export class AudioObserver {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled: boolean;
  private lastPlayTick = new Map<string, number>();

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.05);
  }

  /** Call from a user gesture once (pointerdown anywhere). */
  unlock(): void {
    if (this.ctx) return;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.5 : 0;
      this.master.connect(this.ctx.destination);
      // shared noise buffer
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      let v = 0;
      for (let i = 0; i < len; i++) { v = (v * 0.98) + (Math.sin(i * 12.9898) * 0.02); data[i] = v; }
    } catch { /* audio unavailable — stay silent */ }
  }

  observe(e: GameEvent): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    // throttle identical profiles within 3 ticks (avoid SFX machine-gun)
    const profile = this.profileFor(e);
    if (!profile) return;
    const last = this.lastPlayTick.get(profile) ?? -10;
    if (e.tick - last < 3) return;
    this.lastPlayTick.set(profile, e.tick);
    this.play(profile);
  }

  private profileFor(e: GameEvent): SynthProfile | null {
    switch (e.type) {
      case 'PROJECTILE_FIRED': return 'shot_sharp';
      case 'CRITICAL_HIT': return 'crit';
      case 'ENEMY_DIED': return 'thud';
      case 'PLANT_PLACED': return 'place';
      case 'WAVE_STARTED': return 'wave_horn';
      case 'WAVE_COMPLETED': return 'chime';
      case 'GAME_OVER': return 'ko';
      // B29: jede Ablehnung klingt gleich — „das ging nicht" ist eine Sprache, nicht vier.
      case 'PLACEMENT_REJECTED':
      case 'TILE_REJECTED':
      case 'FERTILIZE_REJECTED':
      case 'PROPAGATE_REJECTED':
      case 'BEETLE_REJECTED': return 'blub';
      // Pflanzenlebenszyklus (B4): Reife, Setzling, Welken, Dünger.
      case 'PLANT_GROWN': return 'chime';
      case 'PLANT_PROPAGATED': return 'hum';
      case 'PLANT_WITHERED': return 'whoosh';
      case 'PLANT_FERTILIZED': return 'blub';
      // P6/P8 Käfer: harte, tierische Klänge — bewusst KEINE Pflanzenklänge.
      case 'BEETLE_DEPLOYED': return 'zap';
      case 'BEETLE_DOWN': return 'ko';
      default: return null;
    }
  }

  private play(profile: SynthProfile): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const out = this.master!;
    const tone = (type: OscillatorType, f0: number, f1: number, dur: number, gain: number, delay = 0) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t + delay);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + delay + dur);
      g.gain.setValueAtTime(gain, t + delay);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      o.connect(g).connect(out);
      o.start(t + delay);
      o.stop(t + delay + dur + 0.02);
    };
    const noise = (dur: number, gain: number, freq: number, delay = 0) => {
      if (!this.noiseBuffer) return;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(freq, t + delay);
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, t + delay);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      src.connect(f).connect(g).connect(out);
      src.start(t + delay);
      src.stop(t + delay + dur + 0.02);
    };

    switch (profile) {
      case 'shot_sharp': tone('square', 660, 220, 0.08, 0.12); break;
      case 'thud': tone('sine', 120, 60, 0.12, 0.25); noise(0.06, 0.10, 900); break;
      case 'chime': tone('sine', 880, 880, 0.18, 0.12); tone('sine', 1320, 1320, 0.22, 0.08, 0.06); break;
      case 'frost': noise(0.25, 0.12, 2400); break;
      case 'fire': noise(0.18, 0.14, 700); tone('sawtooth', 90, 60, 0.15, 0.05); break;
      case 'zap': tone('sawtooth', 1200, 100, 0.06, 0.12); break;
      case 'blub': tone('sine', 180, 420, 0.09, 0.12); break;
      case 'hum': tone('triangle', 220, 220, 0.15, 0.08); break;
      case 'whoosh': noise(0.14, 0.10, 1600); break;
      case 'crit': tone('sine', 150, 50, 0.14, 0.3); tone('sine', 1600, 1200, 0.08, 0.10, 0.02); noise(0.08, 0.12, 1200); break;
      case 'wave_horn': tone('sawtooth', 220, 220, 0.30, 0.10); tone('sawtooth', 226, 226, 0.30, 0.08); break;
      case 'ko': tone('sine', 90, 40, 0.5, 0.35); noise(0.4, 0.16, 500); break;
      case 'place': tone('triangle', 330, 440, 0.10, 0.12); break;
    }
  }
}

// Owner: RenderSystem (Run-Runtime). LOC ≤ 400.
// B28 — Aus GameView ausgelagert (LOC-Cap 400, Godfile-Prinzip): Der Sim-Bootstrap,
// die Bus-Subscriptions und der RAF-Loop sind ENGINE-Verdrahtung, keine React-Komponente.
// GameView bleibt das React-Gesicht (State, HUD, Pointer, Overlays) — diese Datei besitzt
// den Lebenszyklus der Laufzeit (Root/Renderer/Observer/Particles/Feedback/Camera).
//
// Ownership unverändert: SimulationRoot schreibt die Sim, alle anderen lesen oder
// beobachten. Der Runtime ist Adapter zwischen dem React-Lebenszyklus (mount/unmount)
// und der Engine — sie entscheidet nichts über Gameplay, sie verdrahtet Pfade.
// Semantik ist 1:1 aus GameView übernommen (Kommentare bleiben erhalten): die
// A19/zombie-sim-Regeln (fxOn bewusst NICHT im Effect-Deps) gelten hier weiter.

import { SimulationRoot, makeCommand } from '../simulation/root';
import { saveRun, clearRun, type RunSave } from '../persistence/runSave';
import { Renderer } from './renderer';
import { ghostForRender } from '../components/ghostPreview';
import { Camera } from './camera';
import { FeedbackLayer } from './layers/feedback';
import { VisualObserver } from '../observers/visualObserver';
import { AudioObserver } from '../observers/audioObserver';
import { executeVisualCommand } from '../observers/visualExecutor';
import { ParticlePool } from '../observers/particles';
import type { ResolvedVisual } from '../visual/generator';
import { resolveBredVisuals, resolveVisual } from '../visual/generator';
import { strHash } from '../core/rng';
import { makePlacementRejected } from '../bus/commands';
import { resolvePlantStats } from '../simulation/plantSystem';
import { PlacementController, type PlacementState } from '../components/placementController';
import { MAP_TILES_SOURCE, type MapTileType } from '../config/map.source';
import { recordRunEnd, advanceCrossMaturation, updateMeta } from '../meta';
import type { MetaSave, BeetleSpecimen } from '../types';
import { isDevActive } from '../dev/gate';
import { bindSimRoot, installTestHooks, unbindSimRoot } from '../dev/testHooks';
import type { HudSnapshot } from '../components/hudSnapshot';
import { hudOf } from '../components/hudSnapshot';

const IDLE: PlacementState = { mode: 'plant', variantId: null, ghost: null, rejection: null };

export interface RunRuntimeCallbacks {
  onPlacement(next: PlacementState): void;
  onHud(h: HudSnapshot): void;
  onSuspended(): void;
  onGameOver(): void;
  onMetaChange(meta: MetaSave): void;
  onDevTick(): void;
}

export interface RunRuntimeInput {
  canvas: HTMLCanvasElement;
  seed: number; runId: number;
  loadout: string[]; savedVariants: MetaSave['savedVariants'];
  bredStats: NonNullable<MetaSave['bredStats']>;
  beetles: BeetleSpecimen[];
  audioOn: boolean;
  resume?: RunSave | null;
  onMetaChange: (meta: MetaSave) => void;
}

export class RunRuntime {
  readonly root: SimulationRoot;
  readonly renderer: Renderer;
  readonly particles: ParticlePool;
  readonly audio: AudioObserver;
  readonly observer: VisualObserver;
  readonly controller: PlacementController;

  private readonly camera = new Camera();
  private readonly feedback = new FeedbackLayer();
  private readonly bredVisuals: Map<string, ResolvedVisual>;
  private readonly ghostVisual: (variantId: string) => ResolvedVisual;
  private readonly cbs: RunRuntimeCallbacks;
  private readonly pausedRef: { current: boolean };
  private readonly holdRef: { current: boolean };
  private placementMirror: PlacementState = IDLE;
  private runEnded = false;
  private cmdSeq = 0;
  private raf = 0;
  private last = performance.now();
  private saveAccum = 0;
  private hudAccum = 0;
  private readonly devActive: boolean;
  private readonly onResize: () => void;
  private readonly onVisibility: () => void;

  constructor(input: RunRuntimeInput, cbs: RunRuntimeCallbacks, pausedRef: { current: boolean }, holdRef: { current: boolean }) {
    this.cbs = cbs;
    this.pausedRef = pausedRef;
    this.holdRef = holdRef;
    this.devActive = isDevActive();

    const root = new SimulationRoot({
      seed: input.seed, runId: input.runId, loadout: input.loadout,
      bredStats: input.bredStats, beetles: input.beetles, resume: input.resume ?? undefined,
    });
    this.root = root;
    installTestHooks(); bindSimRoot(root); // DevGate-only E2E-Brücke (Release: no-op)

    const renderer = new Renderer(input.canvas);
    this.renderer = renderer;
    // B16.1: kein Terrain-Prime mehr — der Bake hängt an (Seed, aktive Route) und
    // passiert lazy im Render aus dem State (leere Map ⇒ DEFAULT-Pfad, wie bisher).
    this.bredVisuals = resolveBredVisuals(input.savedVariants.filter(v => input.loadout.includes(v.id)), input.seed);
    renderer.setBredVisuals(this.bredVisuals);

    const observer = new VisualObserver(this.camera, input.audioOn);
    this.observer = observer;
    const audio = new AudioObserver(input.audioOn);
    this.audio = audio;
    const particles = new ParticlePool();
    this.particles = particles;

    // Befund Breeding→Visual (B27): derselbe Ableitungspfad wie der Renderer — der Geist
    // zeigt das Sprite, das später im Feld steht, nicht einen flachen Farbstring.
    this.ghostVisual = (variantId: string) => {
      const bred = this.bredVisuals.get(variantId);
      if (bred) return bred;
      const baseId = variantId === 'rootwall' ? 'BASE_ROOT'
        : variantId === 'mycelia' ? 'BASE_MUSHROOM' : 'BASE_THORN';
      return resolveVisual({ baseId: baseId as never, extraIds: [], effectIds: [], visualSeed: strHash(`plant:${input.seed}:${variantId}`) });
    };

    // B3: Zustandsmaschine liest Sim (read-only) und Präsentation — sie schreibt nichts.
    const controller = new PlacementController({
      visualFor: (variantId) => this.ghostVisual(variantId),
      statsFor: (variantId) => {
        const stats = resolvePlantStats(root.getSnapshot(), variantId);
        return stats ? { cost: stats.cost, range: stats.range } : null;
      },
      board: () => {
        const snap = root.getSnapshot();
        return {
          plants: snap.plants.map(p => ({ gx: p.gx, gy: p.gy })),
          inventory: snap.inventory,
          energy: snap.resources.energy,
          mapTiles: snap.mapTiles,
        };
      },
      tileCost: (tile) => MAP_TILES_SOURCE[tile].cost,
      tick: () => root.getSnapshot().clock.tick,
    });
    this.controller = controller;

    // Nur Events mit FX-Vertrag (B5-Matrix); SCORE/COMBO/COINS/TILE/BEETLE_REJECTED haben
    // keinen — HUD liest den Snapshot via hudOf, die Subscriptions waren reine No-ops.
    for (const type of ['PROJECTILE_HIT','ENEMY_DIED','PLANT_PLACED','WAVE_COMPLETED','GAME_OVER','CRITICAL_HIT','PLACEMENT_REJECTED','DAMAGE_DEALT','WAVE_STARTED','NIGHT_STARTED','DAY_STARTED','REWARD_GRANTED','PLANT_GROWN','PLANT_WEAKENED','PLANT_WITHERED','PLANT_PROPAGATED','PLANT_FERTILIZED','BEETLE_DEPLOYED','BEETLE_DOWN'] as const){
      root.bus.subscribe(type, (e) => { observer.observe(e as never); audio.observe(e as never); });
    }
    root.bus.subscribe('NIGHT_STARTED', () => renderer.setNight(true));
    root.bus.subscribe('DAY_STARTED', () => renderer.setNight(false));
    // B17.4: die Reifung zählt die ANGEBROCHENE Welle — WAVE_STARTED feuert genau einmal pro
    // Welle (nur startWave), also keine Doppelzählung: Tod in Welle 1 bringt genau +1 (A19.5).
    // Ein Writer: meta/economy.ts.
    root.bus.subscribe('WAVE_STARTED', () => { advanceCrossMaturation(1); });
    // Run-Ende ist eventgetrieben (BUS = Handover, B7.5): recordRunEnd genau einmal im Event-Ack,
    // Guard nur gegen StrictMode-Remount. Kein advanceCrossMaturation: Wellen sind schon gezählt.
    root.bus.subscribe('GAME_OVER', (e) => {
      if (this.runEnded) return;
      this.runEnded = true;
      try {
        const next = recordRunEnd(e.payload.wave, root.getSnapshot().nektarEarned);
        input.onMetaChange(next);
        void clearRun(); // B2: ein beendeter Run ist nicht resumierbar
      } catch { /* meta persist must never break the run screen */ }
      this.cbs.onGameOver();
    });

    this.onResize = () => { renderer.resize(); };
    window.addEventListener('resize', this.onResize);
    this.onResize();

    this.onVisibility = () => {
      if (document.visibilityState !== 'hidden') return;
      this.pausedRef.current = true; root.clock.setPaused(true);
      saveRun(root.getSnapshot()); this.cbs.onSuspended();
    };
    document.addEventListener('visibilitychange', this.onVisibility);

    this.startLoop();
  }

  private startLoop(): void {
    let last = this.last;
    const step = (now: number) => {
      const dt = now - last; last = now;
      if (!this.pausedRef.current && !this.holdRef.current) this.root.advance(dt);
      for (const c of this.observer.drain()) executeVisualCommand(c, this.particles, this.camera, this.feedback);
      this.particles.update(); this.feedback.update(); this.camera.update();
      const n = this.particles.activeCount;
      if (n > 70) this.particles.setBudget('CHAOS');
      else if (n > 40) this.particles.setBudget('BUSY');
      else this.particles.setBudget('NORMAL');
      const cs = this.camera.get();
      this.renderer.render(
        this.root.getSnapshot(), this.particles, this.feedback,
        cs.shakeOffset.x, cs.shakeOffset.y,
        ghostForRender(this.placementMirror, this.root.getSnapshot().clock.tick),
      );
      this.saveAccum += dt; this.hudAccum += dt;
      if (this.hudAccum > 100) {
        this.hudAccum = 0;
        this.cbs.onHud(hudOf(this.root.getSnapshot(), this.pausedRef.current));
        if (this.devActive) this.cbs.onDevTick();
      }
      if (this.saveAccum > 10000) { this.saveAccum = 0; saveRun(this.root.getSnapshot()); }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  // ── Eingänge aus GameView (Pointer/Buttons) ──────────────────────────────

  /** Der Mirror hält den Render-Loop aktuell, ohne einen React-Render auszulösen. */
  setPlacement(next: PlacementState): void {
    this.placementMirror = next;
    this.cbs.onPlacement(next);
  }

  /** Ablehnung der UI zeigt exakt die FX der Sim-Ablehnung (eine FX-Wahrheit, kein Bus-Write). */
  emitRejectionFx(reason: string, gx: number, gy: number): void {
    const contract = reason === 'no_energy_tile' || reason === 'unknown' ? 'on_path' : reason;
    const event = makePlacementRejected(this.root.getSnapshot().clock.tick, ++this.cmdSeq, gx, gy, contract as never);
    this.observer.observe(event as never);
    this.audio.observe(event as never);
  }

  pointerMove(cell: { gx: number; gy: number } | null): void {
    this.setPlacement(this.controller.hover(cell));
  }

  pointerUp(cell: { gx: number; gy: number }): void {
    const decision = this.controller.drop(cell);
    if (decision.kind === 'plant') {
      this.root.commands.push(makeCommand(this.root.clock.get().tick, 'PLACE_PLANT', ++this.cmdSeq, { variantId: decision.variantId, gx: decision.gx, gy: decision.gy }));
    } else if (decision.kind === 'tile') {
      // Tiles entscheidet die Sim (TILE_REJECTED fängt Baubereich/Korridor ab) — gleicher Command-Pfad.
      this.root.commands.push(makeCommand(this.root.clock.get().tick, 'PLACE_TILE', ++this.cmdSeq, { gx: decision.gx, gy: decision.gy, tile: decision.tile }));
    } else if (decision.kind === 'reject') {
      this.emitRejectionFx(decision.reason, decision.gx, decision.gy);
    }
    this.setPlacement(this.controller.getState());
  }

  cancelPlacement(): void { this.setPlacement(this.controller.cancel()); }
  selectPlant(variantId: string, count: number): void { this.setPlacement(this.controller.selectFromTray(variantId, count)); }
  selectTile(tile: MapTileType): void { this.setPlacement(this.controller.selectTile(tile)); }

  togglePause(): void {
    this.pausedRef.current = !this.pausedRef.current;
    this.root.clock.setPaused(this.pausedRef.current);
  }

  startWave(): void {
    this.root.commands.push(makeCommand(this.root.clock.get().tick, 'START_WAVE', ++this.cmdSeq, {}));
  }

  /** P6: Brutling einsetzen — eigener Command-Pfad (Spawns während Welle oder Vorbereitung). */
  deployBeetle(beetleId: string): void {
    this.root.commands.push(makeCommand(this.root.clock.get().tick, 'DEPLOY_BEETLE', ++this.cmdSeq, { beetleId }));
  }

  toggleFx(on: boolean): void {
    this.observer.setFxEnabled(on);
    this.audio.setEnabled(on);
    // B8-Kopplung: der Toggle persistiert im Meta-Save (einziger Writer: persistence/).
    this.cbs.onMetaChange(updateMeta({ audioOn: on }));
  }

  get isDevActive(): boolean { return this.devActive; }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    saveRun(this.root.getSnapshot());
    unbindSimRoot(this.root);
  }
}

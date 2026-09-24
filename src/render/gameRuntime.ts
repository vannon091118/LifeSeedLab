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
import type { PlacementDecision } from '../components/placementController';
import { type RunSave } from '../persistence/runSave';
import { RunSaveAutor } from '../persistence/runSaveAutor';
import { WorldAutor } from '../persistence/worldAutor';
import { worldSnapshotOf } from '../world/world_state';
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
import { resolveBeetleVisuals, type ResolvedBeetleVisual } from '../visual/beetleGenerator';
import { basePlantVisualInput } from '../genome/visualMap';
import { makePlacementRejected } from '../bus/commands';
import type { GameEvent } from '../bus/events';
import { FX_EVENT_TYPES, NOTICE_EVENT_TYPES, OBSERVED_EVENT_TYPES } from '../bus/eventAudience';
import { noticeFromEvent, type FieldNotice } from '../components/fieldNotice';
import { plantStatsAt } from '../simulation/plantSystem';
import { PlacementController, type PlacementState, type UiRejectReason } from '../components/placementController';
import type { MapTileType } from '../config/map.source';
import { recordRunEnd, advanceCrossMaturation, updateMeta } from '../meta';
import type { MetaSave, BeetleSpecimen } from '../types';
import type { WorldState } from '../world/world_state';
import { isDevActive } from '../dev/gate';
import { bindSimRoot, installTestHooks, unbindSimRoot } from '../dev/testHooks';
import type { HudSnapshot } from '../components/hudSnapshot';
import { hudOf } from '../components/hudSnapshot';

const IDLE: PlacementState = { mode: 'plant', variantId: null, ghost: null, rejection: null };

interface RunRuntimeCallbacks {
  onPlacement(next: PlacementState): void;
  onHud(h: HudSnapshot): void;
  /** Ablehnung, die der Spieler sehen muss — einzige Quelle für den Feld-Toast (B29). */
  onNotice(notice: FieldNotice): void;
  onSuspended(): void;
  /** B36: Mit Ursache — der K.O.-Screen sagt, WARUM der Lauf endete. */
  onGameOver(reason: 'lives_depleted'): void;
  onMetaChange(meta: MetaSave): void;
  onDevTick(): void;
}

interface RunRuntimeInput {
  canvas: HTMLCanvasElement;
  seed: number; runId: number;
  loadout: string[]; savedVariants: MetaSave['savedVariants'];
  bredStats: NonNullable<MetaSave['bredStats']>;
  /** B37: echter Besitz je Variant (Meta.variantCounts) — Run-Inventar spiegelt genau das. */
  ownedCounts: Record<string, number>;
  beetles: BeetleSpecimen[];
  audioOn: boolean;
  resume?: RunSave | null;
  /** R2: die persistente Welt (Pflicht) — der Run läuft auf ihrem Snapshot. */
  world: WorldState;
  /** B40: der Autor ersetzt bei jedem Flush sein Welt-Objekt — die Sicht des Besitzers muss
   *  mitziehen, sonst startet der NÄCHSTE Run auf der Karte von vorhin. */
  onWorldChange?: (world: WorldState) => void;
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
  /** P6/R3: der eingesetzte Käfer wird als DIESES Individuum gezeichnet — Visual kommt aus dem Lager. */
  private readonly beetleVisuals: Map<string, ResolvedBeetleVisual>;
  private readonly ghostVisual: (variantId: string) => ResolvedVisual;
  private readonly cbs: RunRuntimeCallbacks;
  private readonly pausedRef: { current: boolean };
  private readonly holdRef: { current: boolean };
  private placementMirror: PlacementState = IDLE;
  /** B5.1: Anker der Belohnungsreise (Nektar-Zähler) in Canvas-Pixeln — von der UI gemessen. */
  private rewardAnchor: { x: number; y: number } | null = null;
  private runEnded = false;
  private cmdSeq = 0;
  private raf = 0;
  private last = performance.now();
  private saveAccum = 0;
  private hudAccum = 0;
  /** B35: Save-Autorität liegt in persistence/ — der Renderer schreibt keine Runs mehr. */
  private readonly saveAutor: RunSaveAutor;
  private readonly worldAutor: WorldAutor;
  private readonly devActive: boolean;
  private readonly onResize: () => void;
  private readonly onVisibility: () => void;
  /** P-25: Beobachter auf den FRAME (nicht nur window) — sobald der Frame ohne Window-Resize
   *  seine Größe ändert (Tray wächst/schrumpft im Fluss, Aufbauhilfe erscheint/verblasst),
   *  passt das Canvas seine Auflösung an. Vorher blieb es auf Altmaß und ragte über die
   *  Tray hinaus (gemessen: Canvas 501 px im 432-px-Frame bei 390×844). */
  private readonly frameObserver: ResizeObserver;

  constructor(input: RunRuntimeInput, cbs: RunRuntimeCallbacks, pausedRef: { current: boolean }, holdRef: { current: boolean }) {
    this.cbs = cbs;
    this.pausedRef = pausedRef;
    this.holdRef = holdRef;
    this.devActive = isDevActive();

    const root = new SimulationRoot({
      seed: input.seed, runId: input.runId, loadout: input.loadout,
      ownedCounts: input.ownedCounts,
      bredStats: input.bredStats, beetles: input.beetles, resume: input.resume ?? undefined,
      // R2: der Run läuft auf dem Welt-Snapshot — nie auf einer frisch erzeugten Map.
      worldSnapshot: worldSnapshotOf(input.world),
    });
    // R2: der EINZIGE Schreibpfad in die persistente Welt — der Autor spiegelt die
    // akzeptierten Bau-Events (TILE_PLACED/MAP_EXPANDED) deterministisch ins WorldSave.
    this.worldAutor = new WorldAutor(input.world, root.bus, input.onWorldChange);
    this.root = root;
    installTestHooks(); bindSimRoot(root); // DevGate-only E2E-Brücke (Release: no-op)

    const renderer = new Renderer(input.canvas);
    this.renderer = renderer;
    // B16.1: kein Terrain-Prime mehr — der Bake hängt an (Seed, aktive Route) und
    // passiert lazy im Render aus dem State (leere Map ⇒ DEFAULT-Pfad, wie bisher).
    this.bredVisuals = resolveBredVisuals(input.savedVariants.filter(v => input.loadout.includes(v.id)), input.seed);
    renderer.setBredVisuals(this.bredVisuals);
    this.beetleVisuals = resolveBeetleVisuals(input.beetles, input.seed);
    renderer.setBeetleVisuals(this.beetleVisuals);

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
      // Grundpflanze: derselbe Ableitungspfad wie der Renderer (Genom → Phänotyp → Visual).
      const baseInput = basePlantVisualInput(variantId, input.seed) ?? basePlantVisualInput('sprout', input.seed)!;
      return resolveVisual(baseInput);
    };

    // B3: Zustandsmaschine liest Sim (read-only) und Präsentation — sie schreibt nichts.
    const controller = new PlacementController({
      visualFor: (variantId) => this.ghostVisual(variantId),
      // Zell-gebunden: die Vorschau zeigt den Ring, den die Pflanze auf DIESER Zelle bekommt
      // (Topf-Booster). Dieselbe Funktion trägt die Sim — keine zweite Rechnung.
      statsFor: (variantId, cell) => {
        const stats = plantStatsAt(root.getSnapshot(), variantId, cell.gx, cell.gy);
        return stats ? { cost: stats.cost, range: stats.range } : null;
      },
      board: () => {
        const snap = root.getSnapshot();
        return {
          plants: snap.plants.map(p => ({ gx: p.gx, gy: p.gy })),
          inventory: snap.inventory,
          mapTiles: snap.mapTiles,
          route: snap.currentRoute, // R1: die Vorschau misst dieselbe Route wie die Sim
          // Die Vorschau prüft die Geometrie mit DERSELBEN Weltgröße wie die Sim.
          cols: snap.cols,
          rows: snap.rows,
        };
      },
      // Weg-Integrität als read-only FRAGE an die Sim (Spieltest v0.0.71: der Geist versprach
      // grün und der Bau wurde abgelehnt). Kein zweites Regelwerk: der Root delegiert an
      // `MapSystem.wouldClosePath` — dieselbe Funktion, die `placeTile` beim Bau fährt.
      wouldClosePath: (cell, tile) => root.wouldClosePath(cell.gx, cell.gy, tile),
      tick: () => root.getSnapshot().clock.tick,
    });
    this.controller = controller;

    // B5/B29: Die Liste kommt aus der Registry (`bus/eventAudience`), nicht mehr aus dieser Datei.
    // Vorher stand hier eine handgepflegte Aufzählung — und genau das war der Befund: was fehlte,
    // fehlte lautlos (TILE/BEETLE_REJECTED, COINS_GRANTED). Jetzt hat jedes Event dort einen
    // Eintrag mit Begründung, ein Gate-Test beweist für jede `fx`-Zeile den Kommandos-Ausgang.
    for (const type of FX_EVENT_TYPES) {
      root.bus.subscribe(type, (e) => observer.observe(e as never));
    }
    // Ton hört auf alles Beobachtete: welcher Ton existiert, entscheidet der AudioObserver.
    for (const type of OBSERVED_EVENT_TYPES) {
      root.bus.subscribe(type, (e) => audio.observe(e as never));
    }
    // Ablehnungen aus der Sim erreichen den Spieler als Text. Ein Weg, ein Schreiber für die
    // Meldung: hier — nicht zusätzlich im Controller-Zustand (sonst zwei Quellen für einen Toast).
    for (const type of NOTICE_EVENT_TYPES) {
      root.bus.subscribe(type, (e) => {
        const notice = noticeFromEvent(e as GameEvent);
        if (notice) this.cbs.onNotice(notice);
      });
    }

    this.countRun = this.countRun.bind(this);
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
        const next = recordRunEnd(e.payload.wave, root.getSnapshot().nektarEarned, root.getSnapshot().inventory);
        input.onMetaChange(next);
        // B35: clearRun gehört dem Save-Autor (GAME_OVER-Subscription in persistence/).
      } catch (err) {
        if (isDevActive()) console.warn('[gameRuntime] recordRunEnd failed:', err);
      }
      this.cbs.onGameOver(e.payload.reason);
    });

    // B35: Der Autor hört auf WAVE_STARTED/GAME_OVER am Bus und trägt den 10-s-Takt;
    // der RAF-Loop füttert ihn nur mit verstrichener realer Zeit.
    this.saveAutor = new RunSaveAutor(root, () => {
      const ms = this.saveAccum;
      this.saveAccum = 0;
      return ms;
    });
    this.saveAutor.serve();

    this.onResize = () => { renderer.resize(); };
    window.addEventListener('resize', this.onResize);
    this.frameObserver = new ResizeObserver(() => { renderer.resize(); });
    this.frameObserver.observe(input.canvas.parentElement!);
    this.onResize();

    this.onVisibility = () => {
      if (document.visibilityState !== 'hidden') return;
      this.pausedRef.current = true; root.clock.setPaused(true);
      // B35: Suspended-Save geht durch den Autor (direkter Snapshot-Schreibpfad bleibt
      // bewusst: Tab-Hidden ist kein Event am Bus, sondern ein Render-Lifecycle-Moment).
      this.saveAutor.saveNow(root.getSnapshot()); this.cbs.onSuspended();
    };
    document.addEventListener('visibilitychange', this.onVisibility);

    this.startLoop();
  }

  private startLoop(): void {
    let last = this.last;
    const step = (now: number) => {
      const dt = now - last; last = now;
      if (!this.pausedRef.current && !this.holdRef.current) this.root.advance(dt);
      // E1 (Audit A13): EIN Snapshot pro Frame — der Renderer, der Geist und das HUD lesen
      // dieselbe Kopie statt je ein eigenes structuredClone anzustoßen (vorher 2–3 Deep-Copies
      // pro RAF-Frame des ganzen SimState). Die Sim bleibt der einzige Writer; die Kopie ist
      // Frame-lokal und wird im nächsten Durchlauf verworfen.
      const snap = this.root.getSnapshot();
      for (const c of this.observer.drain()) executeVisualCommand(c, this.particles, this.camera, this.feedback);
      this.particles.update(); this.feedback.update(); this.camera.update();
      const n = this.particles.activeCount;
      if (n > 70) this.particles.setBudget('CHAOS');
      else if (n > 40) this.particles.setBudget('BUSY');
      else this.particles.setBudget('NORMAL');
      const cs = this.camera.get();
      this.renderer.render(
        snap, this.particles, this.feedback,
        cs.shakeOffset.x, cs.shakeOffset.y,
        ghostForRender(this.placementMirror, snap.clock.tick),
        this.rewardAnchor,
      );
      this.saveAccum += dt; this.hudAccum += dt;
      // B35: Der 10-s-Autosave-Tick sitzt im RunSaveAutor (persistence/), nicht hier.
      if (this.hudAccum > 100) {
        this.hudAccum = 0;
        this.cbs.onHud(hudOf(snap, this.pausedRef.current));
        if (this.devActive) this.cbs.onDevTick();
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  // ── Eingänge aus GameView (Pointer/Buttons) ──────────────────────────────

  /**
   * B5.1: Das Ziel der Belohnungsreise ist der Nektar-Zähler des HUD. Seine Lage misst die UI
   * (Mount + Layout-Wechsel) und reicht sie hier durch — der Renderer liest kein DOM und hält
   * keine zweite Layout-Wahrheit. `null` = noch nicht gemessen ⇒ kein Flug statt geratenem Ziel.
   */
  setRewardAnchor(anchor: { x: number; y: number } | null): void { this.rewardAnchor = anchor; }

  /** Der Mirror hält den Render-Loop aktuell, ohne einen React-Render auszulösen. */
  setPlacement(next: PlacementState): void {
    this.placementMirror = next;
    this.cbs.onPlacement(next);
  }

  /**
   * Ablehnung der UI zeigt exakt die FX der Sim-Ablehnung (eine FX-Wahrheit, kein Bus-Write).
   *
   * Das synthetische Event ist NUR der FX-Träger (rote Welle an der Zelle); der Ablehnungssprache
   * des Observers ist der Grund gleich. Deshalb werden 'unknown' UND 'route_blocked' hier auf die
   * PLACEMENT_REJECTED-Vokabel `on_path` abgebildet und NICHT als Payload-Wahrheit behandelt: was
   * der Spieler liest, kommt aus dem Notice-Kanal mit dem echten UI-Grund (unten). `route_blocked`
   * ist im Bus ein TILE_REJECTED-Grund — dieselbe rote Welle, aber dieser Träger trägt ihn nicht.
   * Vorher war der Toast am Controller-Zustand aufgehängt — damit hatte die Meldung zwei Quellen
   * (UI-Vorprüfung und Sim-Event).
   */
  emitRejectionFx(reason: UiRejectReason, gx: number, gy: number): void {
    const tick = this.root.getSnapshot().clock.tick;
    const contract = reason === 'unknown' || reason === 'route_blocked' ? 'on_path' : reason;
    const event = makePlacementRejected(tick, ++this.cmdSeq, gx, gy, contract as never);
    this.observer.observe(event as never);
    this.audio.observe(event as never);
    this.cbs.onNotice({ reason, tick });
  }

  pointerMove(cell: { gx: number; gy: number } | null): void {
    this.setPlacement(this.controller.hover(cell));
  }

  /**
   * Q16 (3/3, „Hold schluckt Brett-Taps lautlos“): das Brett-Tap-Ergebnis kehrt als Decision
   * zurück — die UI-Signal-Quelle (placedCount) zählt genau den angenommenen Drop, statt noch-
   * mals zu raten. Während des Tutorial-Hold flushen wir die Command-Queue VOR dem Drop
   * (`flushCommands`): die Sim-Ticks ruhen (holdRef ⇒ kein advance), aber die Platzierungs-
   * Pipeline läuft — PLACE_PLANT wird sofort ausgeführt, Inventar/Energie/Route aktualisieren
   * sich, und die Ablehnung für ungültige Zellen kommt aus derselben Wahrheit wie sonst.
   */
  pointerUp(cell: { gx: number; gy: number }): PlacementDecision {
    if (this.holdRef.current) this.root.commands.clear();
    const decision = this.controller.drop(cell);
    if (decision.kind === 'plant') {
      this.root.commands.push(makeCommand(this.root.clock.get().tick, 'PLACE_PLANT', ++this.cmdSeq, { variantId: decision.variantId, gx: decision.gx, gy: decision.gy }));
    } else if (decision.kind === 'tile') {
      // Tiles entscheidet die Sim weiterhin selbst (Baubereich, maxCount, Pool) — gleicher
      // Command-Pfad. Vorab geprüft ist nur die Weg-Integrität (s. PlacementController).
      this.root.commands.push(makeCommand(this.root.clock.get().tick, 'PLACE_TILE', ++this.cmdSeq, { gx: decision.gx, gy: decision.gy, tile: decision.tile }));
    } else if (decision.kind === 'sell') {
      // Juggling: Tile verkaufen (Refund 50%) — die Route kippt mid-Welle, Gegner drehen um.
      this.root.commands.push(makeCommand(this.root.clock.get().tick, 'REMOVE_TILE', ++this.cmdSeq, { gx: decision.gx, gy: decision.gy }));
    } else if (decision.kind === 'reject') {
      this.emitRejectionFx(decision.reason, decision.gx, decision.gy);
    }
    this.setPlacement(this.controller.getState());
    return decision;
  }

  cancelPlacement(): void { this.setPlacement(this.controller.cancel()); }
  selectPlant(variantId: string, count: number): void { this.setPlacement(this.controller.selectFromTray(variantId, count)); }
  selectTile(tile: MapTileType): void { this.setPlacement(this.controller.selectTile(tile)); }
  /** Juggling-Werkzeug: Verkaufsmodus — Tap auf ein Tile kassiert 50% Refund. */
  selectSell(): void { this.setPlacement(this.controller.selectSell()); }

  togglePause(): void {
    this.pausedRef.current = !this.pausedRef.current;
    this.root.clock.setPaused(this.pausedRef.current);
  }

  /** B32: Sim-Tempo ×1–×4 — direkter Eingriff in die Uhr (deterministisch, Teil des Snapshots). */
  setSpeed(multiplier: number): void { this.root.setSpeed(multiplier); }
  get speed(): number { return this.root.speed; }

  /** B32: Auto-Wellen pro Run an/aus — Command-Pfad, die Sim bleibt einziger Writer. */
  setAutoWaves(on: boolean): void {
    this.root.commands.push(makeCommand(this.root.clock.get().tick, 'SET_AUTO_WAVES', ++this.cmdSeq, { enabled: on }));
  }

  get autoWaves(): boolean { return this.root.getSnapshot().wave.autoWaves; }

  startWave(): void {
    this.root.commands.push(makeCommand(this.root.clock.get().tick, 'START_WAVE', ++this.cmdSeq, {}));
  }

  /** R1: Build-Sequenz sanft beenden — der „Fertig"-Knopf des Layout-Screens. */
  beginWavePrep(): void {
    this.root.commands.push(makeCommand(this.root.clock.get().tick, 'BEGIN_WAVE_PREP', ++this.cmdSeq, {}));
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
    this.frameObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    // R2: die Welt zuerst schließen — der letzte Flush spiegelt verbleibende Bau-Ops,
    // bevor der Run-Snapshot geschrieben wird.
    this.worldAutor.destroy();
    this.saveAutor.destroy();
    unbindSimRoot(this.root);
  }

  // Abbruch/GameOver-Nachwirkung identisch: egal ob 1 Welle oder GameOver — ein Run von X Wellen.
  countRun(): MetaSave | null {
    if (this.runEnded) return null;
    this.runEnded = true;
    try {
      const snap = this.root.getSnapshot();
      const waves = snap.wave.number; // erreichte Welle, inkl. laufender
      const next = recordRunEnd(waves, snap.nektarEarned, snap.inventory);
      // Kein advanceCrossMaturation hier: jede angebrochene Welle hat WAVE_STARTED bereits
      // gezählt (B17.4, ein Writer). Der frühere Zusatz-Call addierte die erreichte Welle
      // ein ZWEITES Mal — ein Abbruch in Welle 3 buchte die Wellen doppelt (+3 Drift).
      void this.saveAutor.finalize(); // Abbruch darf nicht wieder auferstehen (verwaister SAVE)
      this.cbs.onMetaChange(next);
      return next;
    } catch { return null; }
  }
}

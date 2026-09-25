// Owner: UI (GameView). LOC ≤ 400.
// Pointer-Workflow über PlacementController, 390×844, B2 suspend/resume, B8 Audio, B11 Nacht.
// HUD max 5 Elemente. DevGate: ?dev=1 / #dev — Release hat 0 Dev-Surface.
// Ausgelagert: PlacementTray, GameOverlays, GameIcons, gameViewStyles, TutorialLayer,
// ghostPreview (Geist-Zusammensetzung) und — B28 — die komplette Engine-Verdrahtung
// (Sim-Bootstrap, Bus-Subscriptions, RAF-Loop) nach render/gameRuntime.ts. GameView ist
// nur noch das React-Gesicht: State, HUD, Pointer-Eingänge, Overlays.
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { MetaSave, BeetleSpecimen } from '../types';
import type { RunSave } from '../persistence/runSave';
import type { WorldState } from '../world/world_state';
import { RunRuntime } from '../render/gameRuntime';
import type { PlacementState } from './placementController';
import { PlacementTray } from './PlacementTray';
import { GameOverlays } from './GameOverlays';
import { useI18n } from '../i18n';
import { PLANTS_SOURCE } from '../config/plants.source';
import type { MapTileType } from '../config/map.source';
import { GameDevPanel } from './GameDevPanel';
import { GameTopBar } from './GameTopBar';
import { TutorialLayer } from './tutorial/TutorialLayer';
import { FieldToast } from './FieldToast';
import type { FieldNotice } from './fieldNotice';
import { countsAsPlacement } from './placementSignal';
import { LivesChipIcon, NektarChipIcon, WaveChipIcon } from './GameIcons';
import { gameViewStyles as styles } from './gameViewStyles';
import type { HudSnapshot } from './hudSnapshot';
import { hudOf } from './hudSnapshot';
import { SPEED_STEPS } from '../core/clock';
import { AUTO_WAVES_DEFAULT, HINT_FADE_AFTER_TICKS } from '../config/economy.source';
import { isDevActive } from '../dev/gate';

interface Props {
  seed: number; runId: number;
  loadout: string[]; savedVariants: MetaSave['savedVariants'];
  bredStats: NonNullable<MetaSave['bredStats']>;
  /** B37: echter Besitz je Variant (Meta.variantCounts) — Run-Inventar spiegelt genau das. */
  ownedCounts: Record<string, number>;
  beetles: BeetleSpecimen[];
  audioOn: boolean;
  /** B2: gespeicherter Run-Zustand — nur gesetzt, wenn der Spieler „Fortsetzen“ wählt. */
  resume?: RunSave | null;
  /** R2: die persistente Welt (Pflicht) — der Run läuft auf ihrem Snapshot, nie auf einer frischen Map. */
  world: WorldState;
  /** B40: der Welt-Autor meldet jede gebaute Änderung zurück — der nächste Run baut darauf auf. */
  onWorldChange?: (world: WorldState) => void;
  onMetaChange: (meta: MetaSave) => void; onExit: () => void;
}

const IDLE: PlacementState = { mode: 'plant', variantId: null, ghost: null, rejection: null };

export function GameView({ seed, runId, loadout, savedVariants, bredStats, ownedCounts, beetles, audioOn, resume, world, onWorldChange, onMetaChange, onExit }: Props){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nektarChipRef = useRef<HTMLSpanElement>(null);
  const runtimeRef = useRef<RunRuntime | null>(null);
  const pausedRef = useRef(false);
  const holdRef = useRef(false); // B21: Tutorial-Hold (Präsentation)

  const [placement, setPlacement] = useState<PlacementState>(IDLE);
  // B29: EIN Schreiber für die Feldmeldung — die Runtime (UI-Vorprüfung und Sim-Ablehnung laufen
  // dort durch denselben Kanal). Vorher hing der Toast am Controller-Zustand und die Sim-Gründe
  // hatten gar keinen Weg auf den Schirm.
  const [notice, setNotice] = useState<FieldNotice | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  // B32: Anzeige-Stände für Tempo/Auto-Wellen — die WAHRHEIT liegt in der Sim (Uhr/Wave-Slice);
  // diese States sind nur der UI-Spiegel für den sofortigen Knopf-Feedback (HUD-Takt ~100 ms).
  const [speedUi, setSpeedUi] = useState(1);
  const [autoWavesUi, setAutoWavesUi] = useState(AUTO_WAVES_DEFAULT);
  const [suspended, setSuspended] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  /** B36: Ursache des Lauf-Endes — der Screen sagt sie (Playtest R2 #1: „wofür ist das Leben gut?“). */
  const [gameOverReason, setGameOverReason] = useState<'lives_depleted'>('lives_depleted');
  const [fxOn, setFxOn] = useState(audioOn); // B8: audioOn aus dem Meta-Save ist der Startwert
  const [devTick, setDevTick] = useState(0);
  const [placedCount, setPlacedCount] = useState(0); // B21: UI-Zähler angenommener Drops
  // Lauf-3-Bericht: der Zettel unten blockierte dauerhaft Sichtfläche. Er gehört zur
  // Aufbauhilfe und verschwindet mit ihr — spätestens bei der ersten Platzierung.
  const [noteDismissed, setNoteDismissed] = useState(false);
  // R1 (Screenshot-Befund): die Aufbauhilfe FADET selbst ab — sie begleitet nur den Anfang
  // (Layout + erste Vorbereitung), nicht den ganzen Run. Zeitbasis ist der Sim-Tick (B23.2).
  const [hintFaded, setHintFaded] = useState(false);
  // R1: Auto-Fade — die Hilfe verblasst nach ihrer Frist (Sim-Tick, eine Quelle) endgültig.
  useEffect(() => {
    if (hintFaded || (hud?.tick ?? 0) < HINT_FADE_AFTER_TICKS) return;
    setHintFaded(true);
  }, [hud?.tick, hintFaded]);
  const [dpr, setDpr] = useState(1);
  const { t } = useI18n();
  const devActive = useMemo(() => isDevActive(), []);
  // B21: Der Hold ist das einzige, was das Onboarding von hier braucht — Sichtbarkeit, Schritt
  // und Persistenz besitzt der Screen-Router (TutorialProvider). Kein zweiter Zustand.
  const tutorialHold = useCallback((hold: boolean) => { holdRef.current = hold; }, []);

  /** Einzige Brücke vom Runtime/Controller in den React-Render. */
  const applyPlacement = useCallback((next: PlacementState) => setPlacement(next), []);

  /**
   * B5.1: Das Ziel der Belohnungsreise ist der Nektar-Zähler. Seine Lage wird HIER gemessen
   * (einmal beim Mount und bei jedem Layout-Wechsel) und als Canvas-Pixel an die Runtime
   * gereicht — der Renderer liest kein DOM und kennt keine zweite Layout-Wahrheit. Gemessen
   * wird CSS-Pixel relativ zur Leinwand, also genau das Koordinatensystem, in dem gezeichnet wird.
   */
  const measureRewardAnchor = useCallback(() => {
    const chip = nektarChipRef.current, canvas = canvasRef.current, runtime = runtimeRef.current;
    if (!chip || !canvas || !runtime) return;
    const c = canvas.getBoundingClientRect(), b = chip.getBoundingClientRect();
    runtime.setRewardAnchor({ x: b.left + b.width / 2 - c.left, y: b.top + b.height / 2 - c.top });
  }, []);

  // Der Chip erscheint mit dem ersten HUD-Abbild; `hud !== null` und der Phasenwechsel (ein paar
  // Mal pro Lauf) sind die einzigen Momente, in denen sich die Chip-Lage ohne Fenster-Resize
  // ändern kann. Kein Frame-Takt, kein Layout-Lesen pro Bild.
  const hasHud = hud !== null;
  const hudPhase = hud?.phase;
  useEffect(() => {
    measureRewardAnchor();
    window.addEventListener('resize', measureRewardAnchor);
    return () => window.removeEventListener('resize', measureRewardAnchor);
  }, [measureRewardAnchor, hasHud, hudPhase]);

  const toggleFx = useCallback(() => {
    const next = !fxOn;
    setFxOn(next);
    runtimeRef.current?.toggleFx(next);
  }, [fxOn]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const runtime = new RunRuntime(
      { canvas, seed, runId, loadout, savedVariants, bredStats, ownedCounts, beetles, audioOn, resume: resume ?? null, world, onWorldChange, onMetaChange },
      {
        onPlacement: applyPlacement,
        onHud: setHud,
        onNotice: setNotice,
        onSuspended: () => setSuspended(true),
        onGameOver: (reason) => { setGameOverReason(reason); setShowGameOver(true); },
        onMetaChange,
        onDevTick: () => setDevTick(v => v + 1),
      },
      pausedRef,
      holdRef,
    );
    runtimeRef.current = runtime;
    // B22: Erst-Anzeige sofort — sonst zeigt die Tray bis zum ersten HUD-Takt „×0“ und alle
    // Karten sind `aria-disabled`, obwohl der Bestand längst in der Sim liegt.
    setHud(hudOf(runtime.root.getSnapshot(), pausedRef.current));

    const onDprChange = () => setDpr(Math.min(window.devicePixelRatio || 1, 2));
    window.addEventListener('resize', onDprChange);
    onDprChange();

    const unlockOnce = () => { runtime.audio.unlock(); window.removeEventListener('pointerdown', unlockOnce); };
    window.addEventListener('pointerdown', unlockOnce, { once: true });

    return () => {
      window.removeEventListener('resize', onDprChange);
      window.removeEventListener('pointerdown', unlockOnce);
      runtime.destroy();
      runtimeRef.current = null;
    };
    // fxOn is deliberately NOT a dependency: FX is presentation-only and must never tear down +
    // rebuild the root (that restarts the run); observers toggle live via setFxEnabled/setEnabled.
    // loadout/savedVariants/bredStats/resume are NOT dependencies either: the sim is built from
    // meta AT RUN START (A19). A mid-run onMetaChange (GAME_OVER banking, FX toggle, B21
    // onboarding) must not rebuild it — a rebuild resurrects a fresh root BEHIND the Game-Over
    // overlay (zombie sim: auto-started waves inflate totalWavesSurvived, saveRun overwrites the
    // dead run and makes it resumable). New runs remount via key={meta.runId} in App.tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, runId, onMetaChange, devActive]);

  const cellFromEvent = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const runtime = runtimeRef.current; if (!runtime) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    return runtime.renderer.gridFromPixel(e.clientX - rect.left, e.clientY - rect.top);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    runtimeRef.current?.pointerMove(cellFromEvent(e));
  }, [cellFromEvent]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const runtime = runtimeRef.current; if (!runtime) return;
    const cell = cellFromEvent(e); if (!cell) return;
    // B21/Q16: die Decision ist die EINE Wahrheit des Brett-Taps. Das Onboarding-Signal
    // (placedCount) zählt genau den angenommenen Drop — der alte Vergleich „Auswahl hat sich
    // geändert" konnte nach einem akzeptierten Drop nie mehr springen (Auswahl blieb gesetzt):
    // Notiz 5 wartete ewig, der Hold schluckte weitere Taps lautlos (QA-Befund Q16 3/3).
    const decision = runtime.pointerUp(cell);
    if (countsAsPlacement(decision)) setPlacedCount(n => n + 1);
    applyPlacement(runtime.controller.getState());
  }, [applyPlacement, cellFromEvent]);

  const cancelPlacement = useCallback(() => {
    runtimeRef.current?.cancelPlacement();
  }, []);

  const selectPlant = useCallback((variantId: string, count: number) => {
    runtimeRef.current?.selectPlant(variantId, count);
  }, []);

  const selectTile = useCallback((tile: MapTileType) => {
    runtimeRef.current?.selectTile(tile);
  }, []);

  // Juggling-Werkzeug: Verkaufsmodus (50% Refund, Route kippt mid-Welle)
  const selectSell = useCallback(() => {
    runtimeRef.current?.selectSell();
  }, []);

  const togglePause = useCallback(() => {
    const runtime = runtimeRef.current; if (!runtime) return;
    runtime.togglePause();
    setHud(h => h ? { ...h, paused: pausedRef.current } : h);
  }, []);

  const handleStartWave = useCallback(() => {
    runtimeRef.current?.startWave();
  }, []);

  /** R1: Build-Sequenz sanft beenden — „Fertig gebaut" in der Layout-Phase. */
  const handleFinishLayout = useCallback(() => {
    runtimeRef.current?.beginWavePrep();
  }, []);

  // Abbruch = Run von X Wellen — zählen wie GameOver (Reifung, BestWave, Restbestand).
  const handleExit = useCallback(() => {
    const rt = runtimeRef.current;
    const after = rt !== null ? rt.countRun() : null;
    runtimeRef.current = null;
    (onExit as unknown as (m: unknown) => void)(after);
  }, [onExit]);

  /** B32: Tempo-Zyklus ×1→×2→×3→×4→×1 — die Stufen kommen aus der Uhr (eine Quelle). */
  const handleCycleSpeed = useCallback(() => {
    const rt = runtimeRef.current; if (!rt) return;
    const steps = SPEED_STEPS;
    const next = steps[(steps.indexOf(rt.speed) + 1) % steps.length];
    rt.setSpeed(next);
    setSpeedUi(next);
  }, []);

  /** B32: Auto-Wellen pro Run umschalten — Command in die Sim, Anzeige folgt dem Snapshot. */
  const handleToggleAutoWaves = useCallback(() => {
    const rt = runtimeRef.current; if (!rt) return;
    rt.setAutoWaves(!rt.autoWaves);
    setAutoWavesUi(!rt.autoWaves);
  }, []);

  /** P6: Brutling einsetzen — eigener Command-Pfad (Spawns während Welle oder Vorbereitung). */
  const handleDeployBeetle = useCallback(() => {
    const runtime = runtimeRef.current; if (!runtime) return;
    const brood = beetles[beetles.length - 1];
    if (!brood) return;
    runtime.deployBeetle(brood.id);
  }, [beetles]);

  // Nur bei Loadout-Änderung neu — vorher bei jedem Render/devTick re-alloziert.
  const plantIds = useMemo(() => Array.from(new Set([...Object.keys(PLANTS_SOURCE), ...loadout])), [loadout]);
  /** QA #3: Anzeigenamen der eigenen Pflanzen — Quelle ist die Besitz-Bibliothek (Meta). */
  const plantNames = useMemo(
    () => Object.fromEntries(savedVariants.map(v => [v.id, v.name])),
    [savedVariants],
  );
  const inspectorVisual = placement.ghost?.visual ?? null;
  const inspectorLabel = placement.ghost ? `ghost ${placement.ghost.gx},${placement.ghost.gy}` : (placement.variantId ?? '—');

  return (
    <div style={styles.shell}>
      <GameTopBar
        wave={hud?.wave ?? 1}
        paused={hud?.paused ?? false}
        phase={hud?.phase ?? 'prep'}
        prepTicksLeft={hud?.prepTicksLeft ?? null}
        speed={speedUi}
        onCycleSpeed={handleCycleSpeed}
        autoWaves={autoWavesUi}
        onToggleAutoWaves={handleToggleAutoWaves}
        canDeployBeetle={beetles.length > 0 && !hud?.beetleDeployed}
        deployLabel={beetles[beetles.length - 1]?.name ?? ''}
        onTogglePause={togglePause}
        onStartWave={handleStartWave}
        onFinishLayout={handleFinishLayout}
        onDeployBeetle={handleDeployBeetle}
        onExit={handleExit}
      />

      <div style={styles.stage} data-tut-stage>
        <div style={styles.canvasFrame}>
          <canvas
            ref={canvasRef}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => runtimeRef.current?.pointerMove(null)}
            data-tut="board"
            style={{ ...styles.canvas, cursor: placement.variantId ? 'crosshair' : 'default' }}
          />
          {hud && (
            <div style={styles.hud} aria-label={t('game.status')} data-tut="hud">
              {/* B5.1/B7.4: der Währungs-Zähler steht VORN — seine Lage ist damit stabil (die
                  späteren Chips wachsen mit Combo/Laufweg nach rechts) und die Belohnungsreise
                  trifft genau das Element, das sie meint. */}
              <span ref={nektarChipRef} style={{ ...styles.hudChip, ...styles.hudChipNektar }} title={t('menu.nektar')} data-reward-anchor>
                <NektarChipIcon/> {hud.nektarEarned}
              </span>
              <span style={styles.hudChip}><LivesChipIcon/> {hud.lives}</span>
              <span style={styles.hudChip}><WaveChipIcon/> {t('game.wave')} {hud.wave}</span>
              {hud.combo > 1 && <span style={{ ...styles.hudChip, ...styles.hudChipCombo }}>×{hud.combo}</span>}
              {/* D5/Entscheidung 19.09.2026: Maze-Sichtbarkeit in FELDERN statt Prozent. Der Wert
                  ist die echte Laufweg-Länge (Zeit unter Feuer); „min" nennt den kürzesten
                  möglichen Weg — der Abstand beider Zahlen ist der Maze-Gewinn. Eine Quelle
                  (routeMetrics über die State-Route); sichtbar nur bei berechneter Route. */}
              {hud.routeTiles !== null && (
                <span style={{ ...styles.hudChip, ...styles.hudChipQuality }} title={t('game.pathTilesHint').replace('{ideal}', String(hud.routeIdealTiles ?? 0))}>
                  {t('game.pathTiles')} {hud.routeTiles}
                  {hud.routeIdealTiles !== null && <span style={styles.hudChipSub}> · min {hud.routeIdealTiles}</span>}
                </span>
              )}
              {hud.paused && <span style={{ ...styles.hudChip, background: '#fef3c7' }}>{t('game.paused')}</span>}
            </div>
          )}
          {/* P-24: kein ✕ mehr ÜBER dem Brett — die Abwahl wohnt in der Tray (P-24-Regie,
              s. PlacementTray). Die Spawn-Ecke oben rechts bleibt frei klickbar. */}
          {/* B23.3/B29: Der Grund stand im Controller bzw. im Sim-Event, nur nie auf dem Schirm. */}
          <FieldToast notice={notice} tick={hud?.tick ?? 0} />
          <GameDevPanel
            active={devActive && runtimeRef.current !== null}
            revision={devTick}
            dpr={dpr}
            fxEnabled={fxOn}
            onToggleFx={toggleFx}
            getSnapshot={() => runtimeRef.current!.root.getSnapshot()}
            busRecent={() => runtimeRef.current!.root.bus.getRecent()}
            particleInfo={() => {
              const p = runtimeRef.current?.particles;
              return { active: p?.activeCount ?? 0, cap: p?.cap ?? 0, budget: p?.budgetName ?? 'NORMAL' };
            }}
            visual={inspectorVisual}
            entityLabel={inspectorLabel}
          />
          {/* P3QA-05 (frame-relativ seit P-25): die Aufbauhilfe liegt AUF dem Feld, nicht auf
              dem Screen — sie steht nur bis zur ersten Platzierung ODER dem Ablauf ihrer
              Frist (Sim-Tick), pointer-events:none blockiert nie. Die alte Magie-Zahl
              `bottom: 190` (N4: Tray-Höhe im selben Behälter überklettern) starb mit P-25. */}
          {placedCount === 0 && !hintFaded && !showGameOver && (
            <div style={{ ...styles.firstRunHint, ...(hintFaded ? styles.firstRunHintFaded : {}) }} aria-hidden data-hint-fade={hintFaded ? 'faded' : 'on'}>
              <span style={styles.paperNotePin}/> {hud?.phase === 'layout' ? t('game.hintLayout') : t('game.hint')}
            </div>
          )}
          <GameOverlays
            gameOver={showGameOver}
            reason={gameOverReason}
            suspended={suspended}
            wave={hud?.wave ?? 0}
            score={runtimeRef.current?.root.getSnapshot().score ?? 0}
            onNewRun={() => { setShowGameOver(false); runtimeRef.current = null; onExit(); }}
            onMenu={handleExit}
            onResume={() => { setSuspended(false); pausedRef.current = false; runtimeRef.current?.root.clock.setPaused(false); }}
          />
        </div>
        {/* P-25: die Tray verlässt das Brett — sie dockt UNTER den Frame in den stage-Fluss
            und überdeckt keine Zelle mehr (Ausgang unten links = 0/rows-1 war vorher unter
            ihr begraben). P-24 erledigt dieselbe Regie für den ✕ (jetzt Tray-Eck-Tag). */}
        <div style={styles.trayDock}>
          <PlacementTray
            plantIds={plantIds}
            inventory={hud?.inventory ?? {}}
            mode={placement.mode}
            variantId={placement.variantId}
            onSelectPlant={selectPlant}
            onSelectTile={selectTile}
            onSelectSell={selectSell}
            cancelVisible={placement.variantId !== null || placement.mode !== 'plant'}
            onCancel={cancelPlacement}
            cancelLabel={t('common.cancel')}
            trayPlantsLabel={t('game.trayPlants')}
            trayFieldLabel={t('game.trayField')}
            names={plantNames}
          />
        </div>
        <TutorialLayer
          run={{ selectedVariant: placement.variantId, placements: placedCount, phase: hud?.phase ?? 'prep', paused: hud?.paused ?? false }}
          onHold={tutorialHold}
        />
        {/* Der Zettel unten ist KEIN Dauerzustand mehr (Lauf-3-Bericht): er begleitet nur die
            allererste Platzierung und ist danach antippbar weg — Sichtfläche gehört dem Feld. */}
        {placedCount > 0 && !noteDismissed && !showGameOver && (
          <button
            onClick={() => setNoteDismissed(true)}
            style={styles.paperNote}
            aria-label="Hinweis ausblenden"
          >
            <span style={styles.paperNotePin}/> {t('game.hint')} <span aria-hidden>✕</span>
          </button>
        )}
      </div>
    </div>
  );
}

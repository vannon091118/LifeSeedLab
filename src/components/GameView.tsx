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
import { RunRuntime } from '../render/gameRuntime';
import { clearRun } from '../persistence/runSave';
import type { PlacementState, UiRejectReason } from './placementController';
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
import { DropChipIcon, LivesChipIcon, WaveChipIcon } from './GameIcons';
import { gameViewStyles as styles } from './gameViewStyles';
import type { HudSnapshot } from './hudSnapshot';
import { hudOf } from './hudSnapshot';
import { SPEED_STEPS } from '../core/clock';
import { AUTO_WAVES_DEFAULT, INGAME_RESTOCK_MARKUP } from '../config/economy.source';
import { isDevActive } from '../dev/gate';

interface Props {
  seed: number; runId: number;
  loadout: string[]; savedVariants: MetaSave['savedVariants'];
  bredStats: NonNullable<MetaSave['bredStats']>;
  beetles: BeetleSpecimen[];
  audioOn: boolean;
  /** B2: gespeicherter Run-Zustand — nur gesetzt, wenn der Spieler „Fortsetzen“ wählt. */
  resume?: RunSave | null;
  onMetaChange: (meta: MetaSave) => void; onExit: () => void;
}

const IDLE: PlacementState = { mode: 'plant', variantId: null, ghost: null, rejection: null };

export function GameView({ seed, runId, loadout, savedVariants, bredStats, beetles, audioOn, resume, onMetaChange, onExit }: Props){
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  const [dpr, setDpr] = useState(1);
  const { t } = useI18n();
  const devActive = useMemo(() => isDevActive(), []);
  // B21: Der Hold ist das einzige, was das Onboarding von hier braucht — Sichtbarkeit, Schritt
  // und Persistenz besitzt der Screen-Router (TutorialProvider). Kein zweiter Zustand.
  const tutorialHold = useCallback((hold: boolean) => { holdRef.current = hold; }, []);

  /** Einzige Brücke vom Runtime/Controller in den React-Render. */
  const applyPlacement = useCallback((next: PlacementState) => setPlacement(next), []);

  const toggleFx = useCallback(() => {
    setFxOn(v => {
      const next = !v;
      runtimeRef.current?.toggleFx(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const runtime = new RunRuntime(
      { canvas, seed, runId, loadout, savedVariants, bredStats, beetles, audioOn, resume: resume ?? null, onMetaChange },
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
    runtime.pointerUp(cell);
    if (runtime.controller.getState().mode === 'plant' && placement.variantId !== runtime.controller.getState().variantId) {
      // B21: UI-Signal — ein angenommener Drop (Platzierung aus der Tray heraus).
      setPlacedCount(n => n + 1);
    }
    applyPlacement(runtime.controller.getState());
  }, [applyPlacement, cellFromEvent, placement.variantId]);

  const cancelPlacement = useCallback(() => {
    runtimeRef.current?.cancelPlacement();
  }, []);

  const selectPlant = useCallback((variantId: string, count: number) => {
    runtimeRef.current?.selectPlant(variantId, count);
  }, []);

  const selectTile = useCallback((tile: MapTileType) => {
    runtimeRef.current?.selectTile(tile);
  }, []);

  const togglePause = useCallback(() => {
    const runtime = runtimeRef.current; if (!runtime) return;
    runtime.togglePause();
    setHud(h => h ? { ...h, paused: pausedRef.current } : h);
  }, []);

  const handleStartWave = useCallback(() => {
    runtimeRef.current?.startWave();
  }, []);

  /** B32: Tempo-Zyklus ×1→×2→×3→×4→×1 — die Stufen kommen aus der Uhr (eine Quelle). */
  const handleCycleSpeed = useCallback(() => {
    const rt = runtimeRef.current; if (!rt) return;
    const steps = SPEED_STEPS;
    const next = steps[(steps.indexOf(rt.speed) + 1) % steps.length];
    rt.setSpeed(next);
    setSpeedUi(next);
  }, []);

  /** B36: Nachkauf — Preis aus der Source (Pflanzenkosten × Aufschlag, eine Quelle). */
  const restockPrice = useCallback((variantId: string): number => {
    const base = PLANTS_SOURCE[variantId as keyof typeof PLANTS_SOURCE];
    return (base?.cost ?? 50) * INGAME_RESTOCK_MARKUP;
  }, []);

  const handleBuyPlant = useCallback((variantId: string) => {
    runtimeRef.current?.buyPlant(variantId);
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
        onDeployBeetle={handleDeployBeetle}
        onExit={onExit}
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
              <span style={styles.hudChip}><DropChipIcon/> {hud.energy}</span>
              <span style={styles.hudChip}><LivesChipIcon/> {hud.lives}</span>
              <span style={styles.hudChip}><WaveChipIcon/> {t('game.wave')} {hud.wave}</span>
              {hud.combo > 1 && <span style={{ ...styles.hudChip, ...styles.hudChipCombo }}>×{hud.combo}</span>}
              {hud.paused && <span style={{ ...styles.hudChip, background: '#fef3c7' }}>{t('game.paused')}</span>}
            </div>
          )}
          {placement.variantId !== null || placement.mode !== 'plant' ? (
            <button onClick={cancelPlacement} style={styles.cancelBtn} aria-label={t('common.cancel')}>✕ {t('common.cancel')}</button>
          ) : null}
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
          <PlacementTray
            plantIds={plantIds}
            inventory={hud?.inventory ?? {}}
            energy={hud?.energy ?? 0}
            mode={placement.mode}
            variantId={placement.variantId}
            onSelectPlant={selectPlant}
            onSelectTile={selectTile}
            onBuyPlant={handleBuyPlant}
            restockPrice={restockPrice}
          />
          <GameOverlays
            gameOver={showGameOver}
            reason={gameOverReason}
            suspended={suspended}
            wave={hud?.wave ?? 0}
            score={runtimeRef.current?.root.getSnapshot().score ?? 0}
            onNewRun={() => { setShowGameOver(false); runtimeRef.current = null; onExit(); }}
            onMenu={onExit}
            onResume={() => { setSuspended(false); pausedRef.current = false; runtimeRef.current?.root.clock.setPaused(false); }}
          />
        </div>
        <TutorialLayer
          run={{ selectedVariant: placement.variantId, placements: placedCount, phase: hud?.phase ?? 'prep', paused: hud?.paused ?? false }}
          onHold={tutorialHold}
        />
        {/* P3QA-05 + B36 (Playtest R2 #7): Die Aufbauhilfe steht nur BIS zur ersten Platzierung
            im Feld — danach blockiert sie keinen Boden mehr. pointer-events:none — nichts blockiert. */}
        {placedCount === 0 && !showGameOver && (
          <div style={styles.firstRunHint} aria-hidden>
            <span style={styles.paperNotePin}/> {t('game.hint')}
          </div>
        )}
        {/* Der Zettel unten greift erst, wenn der prominente Erst-Hinweis abgelöst ist —
            sonst steht derselbe Satz zweimal auf dem Schirm. */}
        {placedCount > 0 && <div style={styles.paperNote} aria-hidden><span style={styles.paperNotePin}/> {t('game.hint')}</div>}
      </div>
    </div>
  );
}

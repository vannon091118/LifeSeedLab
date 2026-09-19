import { useState, useEffect, useCallback } from 'react';
import type { MetaSave, GameMode } from './types';
import { loadMeta, beginRun, updateMeta, deriveLoanPlant, LOAN_PLANT_ID } from './meta';
import { I18nProvider, detectLangFromMeta } from './i18n';
import { deriveSeed } from './core/rng';
import { GAME_SEED, RUN_SEED_VERSION } from './config';
import { PLANTS_SOURCE } from './config/plants.source';
import { clearRun, loadRun, type RunSave } from './persistence/runSave';
import { ensureWorld } from './persistence/worldSave';
import { worldSnapshotOf, type WorldState } from './world/world_state';
import { StartScreen } from './components/StartScreen';
import { MainMenu } from './components/MainMenu';
import { GameView } from './components/GameView';
import { Greenhouse } from './components/Greenhouse';
import { SeedShop } from './components/SeedShop';
import { BeetleLab } from './components/BeetleLab';
import { Codex } from './components/Codex';
import { MenuScreenShell } from './components/MenuScreenShell';
import { TutorialProvider } from './components/tutorial/TutorialLayer';
import { TUTORIAL_VERSION } from './components/tutorial/script';
import { APP_VERSION_LABEL } from './version';
import type { MenuScreen } from './components/NavIndicators';

// Owner: UI (Screen-Router). LOC ≤ 200.
// React-State-Writer für Screen-Navigation. JEDER Menübereich = eigener Screen
// mit Übergang (MenuScreenShell/ScreenTransition) + Indikatoren (NavIndicators).
// B2: hier wird auch entschieden, ob ein gespeicherter Run fortgesetzt wird —
// ein neuer Run verbraucht eine neue runId, ein Resume nutzt die bestehende.
// B21.3: Der Router ist außerdem Eigentümer des Onboardings — er kennt den Screen, die Screens
// hängen nur `TutorialLayer` ein. Deshalb beginnt die Tour auf dem Titel-Screen und läuft über
// den Hub ins Feld, statt erst im Feld anzufangen.

type Screen = 'start' | MenuScreen | 'run';

function AppInner() {
  const [meta, setMeta] = useState<MetaSave | null>(null);
  const [screen, setScreen] = useState<Screen>('start');
  const [pendingRun, setPendingRun] = useState<RunSave | null>(null);
  const [resuming, setResuming] = useState(false);
  // R2: die PERSISTENTE WELT — einmal pro App-Start geladen, jeden Run überdauernd.
  // Fehlt sie (erster Start), wird sie EINMAL explizit erzeugt und sofort persistiert;
  // Korruption bleibt sichtbar (null ⇒ Ladeschirm), nie stiller Ersatz.
  const [world, setWorld] = useState<WorldState | null>(null);

  useEffect(() => {
    setMeta(loadMeta());
    void ensureWorld().then(w => { if (w) setWorld(w); });
  }, []);

  // Version im Fenstertitel: der Tab ist der einzige immer sichtbare Ort — auch
  // auf Screens ohne Fußzeile (Run, Overlays) trägt jeder Blick die Nummer.
  useEffect(() => {
    document.title = `LifeSeedLab ${APP_VERSION_LABEL}`;
  }, []);

  // B2: gespeicherten Run nur übernehmen, wenn er zu Run-Identität UND Seed passt.
  useEffect(() => {
    if (!meta) return;
    let alive = true;
    const runSeed = deriveSeed(GAME_SEED, 'world', 'run', meta.runId, RUN_SEED_VERSION);
    void loadRun().then(save => {
      if (!alive) return;
      const matches = save !== null && meta.runId > 0 && save.runId === meta.runId && save.seed === runSeed;
      if (!matches && save !== null) void clearRun(); // verwaister Save (anderer Run) — nicht wiederbelebbar
      setPendingRun(matches ? save : null);
    });
    return () => { alive = false; };
  }, [meta]);

  // Alle Hooks unconditionally vor jedem early return — Rules of Hooks.
  // Abbruch = eingezogener Run-Zwischenstand (gameRuntime/advanceCrossMaturation). Recorder
  // in gameRuntime finalisiert den Run auch beim Abbruch (countRun). A19: nicht stumme Kopie.
  const handleExitRun = useCallback((afterRun?: MetaSave | null) => {
    setResuming(false);
    if (afterRun) setMeta(afterRun);
    else setMeta(loadMeta());
    setScreen('menu');
  }, []);
  const handleNavigate = useCallback((s: MenuScreen) => setScreen(s), []);
  const handleBegin = useCallback(() => setScreen('menu'), []);
  const handleMenuBack = useCallback(() => setScreen('start'), []);
  /** B21.3: Onboarding abgeschlossen/übersprungen ⇒ die Fassung gilt als gesehen (ein Writer). */
  const handleTutorialDone = useCallback(
    () => setMeta(updateMeta({ tutorialVersion: TUTORIAL_VERSION })),
    [],
  );
  const handleStartRun = useCallback(
    (_mode: GameMode) => {
      // Neuer Run: alter Save ist damit verbraucht; Run-Identität wird vor dem Rendern reserviert.
      void clearRun();
      setPendingRun(null);
      setResuming(false);
      // B17/A19: `beginRun` reserviert auf der persistierten Wahrheit — nicht auf dieser
      // React-Kopie. Der Start schrieb früher die Kopie zurück und überschrieb damit jeden
      // Fortschritt, der während des letzten Runs direkt in die Persistenz ging.
      setMeta(beginRun());
      setScreen('run');
    },
    [],
  );

  /** B2: Fortsetzen nutzt die BESTEHENDE runId — kein neuer Seed, keine neue Identität. */
  const handleResumeRun = useCallback(() => {
    if (!pendingRun) return;
    setResuming(true);
    setScreen('run');
  }, [pendingRun]);

  if (!meta || !world) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>…</div>;
  }

  const renderScreen = () => {
    switch (screen) {
      case 'run': {
        const runSeed = deriveSeed(GAME_SEED, 'world', 'run', meta.runId, RUN_SEED_VERSION);
        // Leih-Spross (falls aktiv): die Variante muss dem Run bekannt sein, damit sie
        // platzierbar ist — ohne savedVariants-Eintrag wäre resolvePlantStats blind.
        const hasLoan = (meta.variantCounts[LOAN_PLANT_ID] ?? 0) > 0;
        const runVariants = hasLoan ? [...meta.savedVariants, deriveLoanPlant(meta.runId)] : meta.savedVariants;
        // D2: Die Leih-Pflanze muss im RUN platzierbar sein — ownedInventory (state.ts) baut
        // das Inventar aus Loadout × Besitz; ohne Loadout-Eintrag zeigt die Tray ×0 und
        // PLACE_PLANT lehnt ab. Nur der Run-Loadout wird erweitert, das Meta-Loadout bleibt sauber.
        const runLoadout = hasLoan ? [...meta.loadout, LOAN_PLANT_ID] : meta.loadout;
        // D2b (Krix-Tutorial-Regression): die Sim löst Stats über getPlantStats(variantId,
        // bredStats) auf — PLANTS_SOURCE kennt loan_sprout NICHT. Ohne Stats-Eintrag lehnt
        // place() mit no_inventory ab (Stats-Check läuft VOR der Inventar-Prüfung). Die
        // deterministische Leih-Variante trägt ihre eigenen Stats — als Run-bredStats
        // beigemischt (nur Run-Sicht, das Meta-Objekt bleibt unangetastet).
        const loanVariant = deriveLoanPlant(meta.runId);
        const loanStats = loanVariant.stats;
        // Role → Basis-Verankerung: die Effects kommen aus der PLANTS_SOURCE-Basis
        // (shooter→sprout, wall→rootwall, support→mycelia) — eine Stats-Quelle.
        const loanEffectsBase = loanVariant.type === 'wall'
          ? 'rootwall'
          : loanVariant.type === 'support' ? 'mycelia' : 'sprout';
        const runBredStats = hasLoan
          ? {
              ...meta.bredStats,
              [LOAN_PLANT_ID]: {
                ...loanStats,
                cost: meta.savedVariants.find(v => v.id === LOAN_PLANT_ID)?.cost ?? loanVariant.cost,
                effects: PLANTS_SOURCE[loanEffectsBase].effects,
              },
            }
          : meta.bredStats;
        return (
          <GameView
            key={meta.runId}
            seed={runSeed}
            runId={meta.runId}
            loadout={runLoadout}
            savedVariants={runVariants}
            bredStats={runBredStats}
            ownedCounts={meta.variantCounts}
            beetles={meta.beetles}
            audioOn={meta.audioOn}
            resume={resuming ? pendingRun : null}
            world={world}
            onMetaChange={setMeta}
            onExit={handleExitRun}
          />
        );
      }
      case 'start':
        return <StartScreen meta={meta} onBegin={handleBegin} />;
      case 'menu':
      case 'greenhouse':
      case 'seedshop':
      case 'beetlelab':
      case 'codex': {
        const menuScreen: MenuScreen = screen;
        return (
          <MenuScreenShell
            meta={meta}
            current={menuScreen}
            onNavigate={handleNavigate}
            onBack={menuScreen === 'menu' ? handleMenuBack : () => setScreen('menu')}
          >
            {menuScreen === 'menu' && (
              <MainMenu
                meta={meta}
                onMetaChange={setMeta}
                onStartRun={handleStartRun}
                onNavigate={handleNavigate}
                resumeWave={pendingRun?.waveNumber ?? null}
                onResume={pendingRun ? handleResumeRun : undefined}
              />
            )}
            {menuScreen === 'greenhouse' && (
              <Greenhouse meta={meta} onMetaChange={setMeta} onClose={() => setScreen('menu')} />
            )}
            {menuScreen === 'seedshop' && (
              <SeedShop meta={meta} onMetaChange={setMeta} onClose={() => setScreen('menu')} />
            )}
            {menuScreen === 'beetlelab' && (
              <BeetleLab meta={meta} onMetaChange={setMeta} onClose={() => setScreen('menu')} />
            )}
            {menuScreen === 'codex' && <Codex onClose={() => setScreen('menu')} />}
          </MenuScreenShell>
        );
      }
      default:
        return <StartScreen meta={meta} onBegin={handleBegin} />;
    }
  };

  return (
    <TutorialProvider screen={screen} seenVersion={meta.tutorialVersion} onDone={handleTutorialDone}>
      {renderScreen()}
    </TutorialProvider>
  );
}

export default function App() {
  // meta is loaded synchronously before render to pick the right language
  const [initialMeta] = useState(() => loadMeta());

  return (
    <I18nProvider initialLang={detectLangFromMeta(initialMeta)}>
      <AppInner />
    </I18nProvider>
  );
}

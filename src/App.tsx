import { useState, useEffect, useCallback } from 'react';
import type { MetaSave, GameMode } from './types';
import { loadMeta, persistMeta, reserveRunId } from './meta';
import { I18nProvider, detectLangFromMeta } from './i18n';
import { deriveSeed } from './core/rng';
import { GAME_SEED, RUN_SEED_VERSION } from './config';
import { StartScreen } from './components/StartScreen';
import { MainMenu } from './components/MainMenu';
import { GameView } from './components/GameView';
import { Greenhouse } from './components/Greenhouse';
import { SeedShop } from './components/SeedShop';
import { BeetleLab } from './components/BeetleLab';
import { Codex } from './components/Codex';
import { MenuScreenShell } from './components/MenuScreenShell';
import type { MenuScreen } from './components/NavIndicators';

// Owner: UI (Screen-Router). LOC ≤ 200.
// React-State-Writer für Screen-Navigation. JEDER Menübereich = eigener Screen
// mit Übergang (MenuScreenShell/ScreenTransition) + Indikatoren (NavIndicators).

type Screen = 'start' | MenuScreen | 'run';

function AppInner() {
  const [meta, setMeta] = useState<MetaSave | null>(null);
  const [screen, setScreen] = useState<Screen>('start');

  useEffect(() => {
    setMeta(loadMeta());
  }, []);

  // Alle Hooks unconditionally vor jedem early return — Rules of Hooks.
  const handleExitRun = useCallback(() => {
    setScreen('menu');
  }, []);
  const handleNavigate = useCallback((s: MenuScreen) => setScreen(s), []);
  const handleBegin = useCallback(() => setScreen('menu'), []);
  const handleMenuBack = useCallback(() => setScreen('start'), []);
  const handleStartRun = useCallback(
    (_mode: GameMode) => {
      if (!meta) return;
      // Run-Identität wird vor dem Rendern reserviert und in Meta persistiert.
      const nextMeta = reserveRunId(meta);
      persistMeta(nextMeta);
      setMeta(nextMeta);
      setScreen('run');
    },
    [meta],
  );

  if (!meta) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>…</div>;
  }

  switch (screen) {
    case 'run': {
      const runSeed = deriveSeed(GAME_SEED, 'world', 'run', meta.runId, RUN_SEED_VERSION);
      return (
        <GameView
          key={meta.runId}
          seed={runSeed}
          runId={meta.runId}
          loadout={meta.loadout}
          savedVariants={meta.savedVariants}
          bredStats={meta.bredStats}
          beetles={meta.beetles}
          audioOn={meta.audioOn}
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
            <MainMenu meta={meta} onMetaChange={setMeta} onStartRun={handleStartRun} onNavigate={handleNavigate} />
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

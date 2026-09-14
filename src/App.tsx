import { useState, useEffect, useCallback } from 'react';
import type { MetaSave, GameMode } from './types';
import { loadMeta, persistMeta, reserveRunId } from './meta';
import { I18nProvider, detectLangFromMeta } from './i18n';
import { deriveSeed } from './core/rng';
import { GAME_SEED, RUN_SEED_VERSION } from './config';
import { StartScreen } from './components/StartScreen';
import { MainMenu } from './components/MainMenu';
import { GameView } from './components/GameView';

type Screen = 'start' | 'menu' | 'run';

function AppInner() {
  const [meta, setMeta] = useState<MetaSave | null>(null);
  const [screen, setScreen] = useState<Screen>('start');

  useEffect(() => {
    setMeta(loadMeta());
  }, []);

  // ALL hooks must run before any early return (React #310: hook count may never differ)
  const handleExitRun = useCallback(() => {
    setScreen('menu');
  }, []);

  if (!meta) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>…</div>;
  }

  const handleBegin = () => setScreen('menu');

  const handleStartRun = (_mode: GameMode) => {
    // Run-Identität wird vor dem Rendern reserviert und in Meta persistiert.
    // Dadurch kollidiert ein abgebrochener Run nicht mit dem nächsten Browserstart.
    const nextMeta = reserveRunId(meta);
    persistMeta(nextMeta);
    setMeta(nextMeta);
    setScreen('run');
  };

  const handleMenuBack = () => setScreen('start');

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
          onMetaChange={setMeta}
          onExit={handleExitRun}
        />
      );
    }
    case 'menu':
      return (
        <MainMenu
          meta={meta}
          onMetaChange={setMeta}
          onStartRun={handleStartRun}
          onBack={handleMenuBack}
        />
      );
    case 'start':
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

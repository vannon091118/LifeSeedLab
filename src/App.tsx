import { useState, useEffect, useCallback } from 'react';
import type { MetaSave, GameMode } from './types';
import { loadMeta } from './meta';
import { I18nProvider, detectLangFromMeta } from './i18n';
import { StartScreen } from './components/StartScreen';
import { MainMenu } from './components/MainMenu';
import { GameScreen } from './components/GameScreen';

type Screen = 'start' | 'menu' | 'run';

function AppInner() {
  const [meta, setMeta] = useState<MetaSave | null>(null);
  const [screen, setScreen] = useState<Screen>('start');
  const [runMode, setRunMode] = useState<GameMode>('endless');
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    setMeta(loadMeta());
  }, []);

  if (!meta) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>…</div>;
  }

  const handleBegin = () => setScreen('menu');

  const handleStartRun = (mode: GameMode) => {
    setRunMode(mode);
    setRunKey(k => k + 1);
    setScreen('run');
  };

  const handleExitRun = useCallback(() => {
    setScreen('menu');
  }, []);

  const handleMenuBack = () => setScreen('start');

  switch (screen) {
    case 'run':
      return (
        <GameScreen
          key={runKey}
          mode={runMode}
          loadout={[]}
          onExit={handleExitRun}
        />
      );
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

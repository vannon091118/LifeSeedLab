// Owner: UI (GameTopBar). LOC ≤ 400.
// Kopfleiste des Run-Screens: Identität, Welle, Pause, Welle starten, Run beenden, Brutling
// einsetzen. Reine Präsentation — jeder Knopf ruft einen Callback des Run-Screens auf, hier wird
// nichts geschrieben. Aus GameView ausgelagert (LOC-Cap 400) und gleichzeitig der Ort der
// Tutorial-Cues (`data-tut="wave"` / `data-tut="pause"`): Krix blinkt auf den ECHTEN Knopf.

import { useI18n } from '../i18n';
import { gameViewStyles as styles } from './gameViewStyles';

export interface GameTopBarProps {
  wave: number;
  paused: boolean;
  /** Brutling wartet und ist noch nicht im Feld. */
  canDeployBeetle: boolean;
  deployLabel: string;
  onTogglePause: () => void;
  onStartWave: () => void;
  onDeployBeetle: () => void;
  onExit: () => void;
}

export function GameTopBar({
  wave, paused, canDeployBeetle, deployLabel, onTogglePause, onStartWave, onDeployBeetle, onExit,
}: GameTopBarProps) {
  const { t } = useI18n();
  return (
    <div style={styles.topBar}>
      <div style={styles.topLeft}>
        <span style={styles.logo}>LifeSeedLab</span>
        <span style={styles.sub}>{t('hud.journal')} • {t('game.wave')} {wave}</span>
      </div>
      <div style={styles.topRight}>
        <button
          onClick={onTogglePause}
          style={styles.btn}
          aria-label={paused ? 'Fortsetzen' : 'Pause'}
          data-tut="pause"
        >
          {paused ? '▶' : '❚❚'}
        </button>
        <button onClick={onStartWave} style={{ ...styles.btn, ...styles.btnPrimary }} data-tut="wave">
          {t('game.startWave')}
        </button>
        <button onClick={onExit} style={styles.btn}>{t('game.exitRun')}</button>
        {canDeployBeetle && (
          <button onClick={onDeployBeetle} style={{ ...styles.btn, ...styles.btnBeetle }} title={`${deployLabel} einsetzen`}>
            {t('game.deployBeetle')}
          </button>
        )}
      </div>
    </div>
  );
}

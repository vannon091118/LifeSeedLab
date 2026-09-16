// Owner: UI (GameTopBar). LOC ≤ 400.
// Kopfleiste des Run-Screens: Identität, Welle, Pause, Welle starten, Run beenden, Brutling
// einsetzen. Reine Präsentation — jeder Knopf ruft einen Callback des Run-Screens auf, hier wird
// nichts geschrieben. Aus GameView ausgelagert (LOC-Cap 400) und gleichzeitig der Ort der
// Tutorial-Cues (`data-tut="wave"` / `data-tut="pause"`): Krix blinkt auf den ECHTEN Knopf.
//
// B23.2: Der Wellen-Knopf folgt der Phase. Er stand vorher auch während der laufenden Welle als
// „Start Wave" da und tat beim Klick nichts — der Spieler wusste nicht, ob er starten muss.
// Der Zustand kommt aus `waveButton.ts` (reine Ableitung, testbar) — hier steht nur die Anzeige.

import { useI18n } from '../i18n';
import { gameViewStyles as styles } from './gameViewStyles';
import { waveButtonState } from './waveButton';

export interface GameTopBarProps {
  wave: number;
  paused: boolean;
  /** Sim-Phase (`prep` | `wave` | `gameover`) — Wahrheit für den Knopf-Zustand (B23.2). */
  phase: string;
  /** Ticks bis zum Auto-Start; `null` ⇒ das Labor wartet auf die erste Pflanze (B23.1). */
  prepTicksLeft: number | null;
  /** Brutling wartet und ist noch nicht im Feld. */
  canDeployBeetle: boolean;
  deployLabel: string;
  onTogglePause: () => void;
  onStartWave: () => void;
  onDeployBeetle: () => void;
  onExit: () => void;
}

export function GameTopBar({
  wave, paused, phase, prepTicksLeft, canDeployBeetle, deployLabel, onTogglePause, onStartWave, onDeployBeetle, onExit,
}: GameTopBarProps) {
  const { t } = useI18n();
  const waveBtn = waveButtonState({ phase, prepTicksLeft });
  const waveLabel = t(waveBtn.labelKey).replace('{n}', String(wave));
  // Hinweiszeile: wann es von selbst losgeht — der Knopf selbst bleibt die Handlung.
  const hint = waveBtn.hintKey
    ? t(waveBtn.hintKey).replace('{s}', String(waveBtn.seconds ?? 0))
    : null;

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
        <button
          onClick={onStartWave}
          disabled={waveBtn.disabled}
          aria-disabled={waveBtn.disabled}
          title={hint ?? undefined}
          style={{ ...styles.btn, ...styles.btnPrimary, ...(waveBtn.disabled ? styles.btnDisabled : {}) }}
          data-tut="wave"
        >
          {waveLabel}
        </button>
        <button onClick={onExit} style={styles.btn}>{t('game.exitRun')}</button>
        {canDeployBeetle && (
          <button onClick={onDeployBeetle} style={{ ...styles.btn, ...styles.btnBeetle }} title={`${deployLabel} einsetzen`}>
            {t('game.deployBeetle')}
          </button>
        )}
      </div>
      {hint && <div style={styles.prepHint} data-wave-hint>{hint}</div>}
    </div>
  );
}

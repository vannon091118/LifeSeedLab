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
  /** Ticks bis zum Auto-Start; `null` ⇒ das Labor wartet auf die erste Pflanze (B23.1).
   *  B32: auch `null`, wenn der Spieler Auto-Wellen ausgeschaltet hat. */
  prepTicksLeft: number | null;
  /** B32: aktuelles Sim-Tempo (×1–×4) und sein Zyklus-Knopf. */
  speed: number;
  onCycleSpeed: () => void;
  /** B32: Auto-Wellen-Schalter des Runs (Spieler-Entscheid). */
  autoWaves: boolean;
  onToggleAutoWaves: () => void;
  /** Brutling wartet und ist noch nicht im Feld. */
  canDeployBeetle: boolean;
  deployLabel: string;
  onTogglePause: () => void;
  onStartWave: () => void;
  /** R1: Build-Sequenz sanft beenden („Fertig gebaut") — nur im Layout gerufen. */
  onFinishLayout: () => void;
  onDeployBeetle: () => void;
  onExit: () => void;
}

export function GameTopBar({
  wave, paused, phase, prepTicksLeft, speed, onCycleSpeed, autoWaves, onToggleAutoWaves,
  canDeployBeetle, deployLabel, onTogglePause, onStartWave, onFinishLayout, onDeployBeetle, onExit,
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
        {/* B32: Sim-Tempo als Zyklus ×1→×2→×3→×4→×1 — die Wahrheit steht in der Uhr. */}
        <button
          onClick={onCycleSpeed}
          style={{ ...styles.btn, ...(speed > 1 ? styles.btnBeetle : {}) }}
          aria-label={`${t('game.speed')} ×${speed}`}
          title={t('game.speed')}
        >
          ×{speed}
        </button>
        {/* B32: Auto-Wellen pro Run — aus ⇒ nur der Knopf startet (A hab ich im Changelog). */}
        <button
          onClick={onToggleAutoWaves}
          style={{ ...styles.btn, ...(autoWaves ? {} : styles.btnDisabled) }}
          aria-pressed={autoWaves}
          title={t('game.autoWaves')}
        >
          {t('game.autoWaves')} {autoWaves ? '✓' : '✗'}
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
        {/* R1: nur im Layout sichtbar — der sanfte Ausstieg aus der Build-Sequenz. */}
        {phase === 'layout' && (
          <button
            onClick={onFinishLayout}
            style={{ ...styles.btn, ...styles.btnBeetle }}
            data-tut="layout-done"
            title={t('layout.hint')}
          >
            {t('layout.doneLong')}
            {' ✓'}
          </button>
        )}
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

import type { CSSProperties } from 'react';
import { useI18n } from '../i18n';
import { formatScore } from './numberFormat';

// Owner: UI (Game-Over- und Suspend-Overlays). LOC ≤ 400.
// B2: „Tippen zum Fortsetzen" nach App-Wechsel. B7: Game-Over-Karte mit Ergebnis und Ausstieg.
// Beide Overlays sind reine Präsentation — Meta-Banking passiert in GameView genau einmal.

export interface GameOverlaysProps {
  gameOver: boolean;
  /** B36: Warum endete der Lauf — wird auf dem Screen genannt. */
  reason?: 'lives_depleted';
  suspended: boolean;
  wave: number;
  score: number;
  onNewRun: () => void;
  onMenu: () => void;
  onResume: () => void;
}

export function GameOverlays({ gameOver, reason, suspended, wave, score, onNewRun, onMenu, onResume }: GameOverlaysProps) {
  const { t } = useI18n();
  return (
    <>
      {gameOver && (
        <div style={styles.backdrop}>
          <div style={styles.card}>
            <div style={styles.title}>{t('game.gameover')}</div>
            <div style={styles.sub}>{t('game.wave')} {wave} • {t('over.score')} {formatScore(score)}</div>
            {/* B36: Die Ursache steht auf dem Screen — Niederlage ist EINZIG lives <= 0
                (Gegner am Wegende, Quelle: enemies.source damage). Kein Rätsel mehr. */}
            {reason === 'lives_depleted' && (
              <div style={styles.reason}>{t('over.reasonLives')}</div>
            )}
            <div style={styles.row}>
              <button onClick={onNewRun} style={{ ...styles.btn, ...styles.btnPrimary }}>{t('over.retry')}</button>
              <button onClick={onMenu} style={styles.btn}>{t('over.toMenu')}</button>
            </div>
          </div>
        </div>
      )}
      {suspended && (
        <button onClick={onResume} style={styles.resumeOverlay} aria-label={t('game.resumeTap')}>
          <span style={styles.resumeCard}>{t('game.resumeTap')}</span>
        </button>
      )}
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(43,43,38,0.45)', zIndex: 3 },
  card: { background: '#fbf6e9', border: '2px solid var(--ink)', borderRadius: 14, boxShadow: '4px 4px 0 var(--ink)', padding: 18, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', minWidth: 260 },
  title: { fontSize: 22, fontWeight: 800, color: 'var(--ink)' },
  sub: { fontSize: 13, color: '#6b6250', fontWeight: 600 },
  reason: { marginTop: 10, padding: '8px 12px', background: '#fdecea', border: '2px solid var(--danger)', borderRadius: 8, color: 'var(--danger)', fontSize: 13, fontWeight: 800 },
  row: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  btn: { padding: '10px 14px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 10, color: 'var(--ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '3px 3px 0 var(--ink)', lineHeight: 1, minHeight: 44, minWidth: 44 },
  btnPrimary: { background: 'var(--leaf)', color: '#fff', borderColor: 'var(--ink)' },
  resumeOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,239,220,0.75)', zIndex: 3, border: 'none', cursor: 'pointer', width: '100%', height: '100%' },
  resumeCard: { background: '#fff', border: '2px solid var(--ink)', borderRadius: 12, boxShadow: '3px 3px 0 var(--ink)', padding: '14px 18px', fontSize: 14, fontWeight: 800, color: 'var(--ink)' },
};

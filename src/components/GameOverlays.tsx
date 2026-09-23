import type { CSSProperties } from 'react';
import type { RunEndReason } from '../bus/events';
import { useI18n } from '../i18n';
import { formatScore } from './numberFormat';
import { APP_VERSION_LABEL } from '../version';

// Owner: UI (Game-Over- und Suspend-Overlays). LOC ≤ 400.
// B2: „Tippen zum Fortsetzen" nach App-Wechsel. B7: Game-Over-Karte mit Ergebnis und Ausstieg.
// Beide Overlays sind reine Präsentation — Meta-Banking passiert in GameView genau einmal.

interface GameOverlaysProps {
  gameOver: boolean;
  /** B36: Warum endete der Lauf — wird auf dem Screen genannt (Bus-Wort, B39). */
  reason?: RunEndReason;
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
          <div style={styles.tape} aria-hidden />
          <div style={styles.tape2} aria-hidden />
          <div style={styles.card}>
            <div style={styles.title}>{t('game.gameover')}</div>
            <div style={styles.sub}>{t('game.wave')} {wave} • {t('over.score')} {formatScore(score)}</div>
            {/* B36: Die Ursache steht auf dem Screen — Niederlage ist EINZIG lives <= 0
                (Gegner am Wegende, Quelle: enemies.source damage). Kein Rätsel mehr. */}
            {reason === 'lives_depleted' && (
              <div style={styles.reason}>{t('over.reasonLives')}</div>
            )}
            {/* Version auf dem Screen: Fehlerberichte/Fotos sind ohne Nummer nicht zuordenbar. */}
            <div style={styles.version}>{t('over.version').replace('{v}', APP_VERSION_LABEL)}</div>
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
  // Der Abschluss ist ein EREIGNIS: das Feld dunkelt ins Rot-Braun, das Papier der Karte ist
  // aschig, die Titelzeile gestempelt (Versatz, Danger-Ton) — wie ein Laborbericht über einen
  // verlorenen Versuch. Vorher dieselbe weiße Karte wie überall: Zustandlosigkeit.
  tape: { position: 'absolute', top: '18%', left: -30, right: -30, height: 26, background: 'repeating-linear-gradient(45deg, #a94438 0 16px, #2b2b26 16px 32px)', opacity: 0.55, transform: 'rotate(-4deg)', zIndex: 1 },
  tape2: { position: 'absolute', bottom: '16%', left: -30, right: -30, height: 26, background: 'repeating-linear-gradient(45deg, #a94438 0 16px, #2b2b26 16px 32px)', opacity: 0.55, transform: 'rotate(3deg)', zIndex: 1 },
  card: { position: 'relative', zIndex: 2, background: '#f1e6d8', border: '2.5px solid var(--ink)', borderRadius: 10, boxShadow: '5px 5px 0 var(--ink), inset 0 0 0 1px rgba(169,68,56,0.25)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', minWidth: 260 },
  title: { fontSize: 24, fontWeight: 800, color: 'var(--danger)', letterSpacing: 2, textTransform: 'uppercase' as const, transform: 'rotate(-1.5deg)', border: '3px solid var(--danger)', borderRadius: 6, padding: '2px 14px', background: 'rgba(169,68,56,0.08)' },
  sub: { fontSize: 13, color: '#5c534a', fontWeight: 700 },
  reason: { marginTop: 10, padding: '8px 12px', background: '#fdecea', border: '2px solid var(--danger)', borderRadius: 8, color: 'var(--danger)', fontSize: 13, fontWeight: 800 },
  version: { fontSize: 11, color: '#6b6250', fontWeight: 600, opacity: 0.8 },
  row: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  btn: { padding: '10px 14px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 10, color: 'var(--ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '3px 3px 0 var(--ink)', lineHeight: 1, minHeight: 44, minWidth: 44 },
  btnPrimary: { background: 'var(--leaf)', color: '#fff', borderColor: 'var(--ink)' },
  resumeOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,239,220,0.75)', zIndex: 3, border: 'none', cursor: 'pointer', width: '100%', height: '100%' },
  resumeCard: { background: '#fff', border: '2px solid var(--ink)', borderRadius: 12, boxShadow: '3px 3px 0 var(--ink)', padding: '14px 18px', fontSize: 14, fontWeight: 800, color: 'var(--ink)' },
};

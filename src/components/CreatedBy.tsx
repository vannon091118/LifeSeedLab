// Owner: UI (Signatur). LOC ≤ 200. Reine Präsentation — kein State, kein Gameplay.
//
// Zwei Formen derselben Signatur:
//   · `CreatedBy` — sichtbar auf Titelkarte und Hub-Fußzeile (Name, Motto, GitHub-Link).
//   · `MarginMark` — das Easter Egg: ein Wort des Namens-Akronyms pro Papierfläche, wie eine
//     Bleistift-Notiz am Blattrand. Sechs Flächen (Titel + fünf Menü-Screens) ergeben zusammen
//     V-A-N-N-O-N; die Nummer `n/6` verrät, dass es eine Reihe ist.
//
// EINE Komponente für beide Formen: Name, Motto und Fragmente können nicht auseinanderlaufen.
//
// Register: unauffällig, aber sichtbar — 11px, Bleistiftgrau, kursiv, darunter das Motto in
// 10px. Der Link ist ein echter Anchor (`target="_blank"`): er navigiert, er ändert nichts am
// Spiel. Kein Emoji, keine Stock-Grafik (Art-Direction B0), die Marke ist gezeichnet.

import { useI18n } from '../i18n';
import { GitHubIcon } from './MenuIcons';
import type { MenuScreen } from './NavIndicators';

/**
 * Signatur-Daten — eine Quelle für Name, Motto und Ziel.
 *
 * `created by` und das Motto bleiben im Original: eine Signatur wird nicht übersetzt
 * (Regel 1 — zitierte Inhalte bleiben original). Übersetzt ist nur die Bedienhilfe des Links.
 */
export const AUTHOR = {
  name: 'VANNON',
  /** Der erste Halbsatz buchstabiert den Namen (Volatile Agent Needing No Other Nonsense),
   *  der zweite ist eine eigene Abkürzung (Never Overly Nice, Never Average Vibe). */
  motto: 'Volatile Agent Needing No Other Nonsense — Never Overly Nice, Never Average Vibe.',
  url: 'https://github.com/vannon091118/LifeSeedLab',
} as const;

/**
 * Das Easter Egg, ausgeschrieben: die sechs Wörter des Namens-Akronyms, eines je Papierfläche.
 * Reihenfolge = Reihenfolge der Flächen; die Buchstabenköpfe ergeben `AUTHOR.name` (Test).
 */
export const SIGNATURE_FRAGMENTS = ['Volatile', 'Agent', 'Needing', 'No', 'Other', 'Nonsense'] as const;

/** Fragment-Index je Menüfläche. Die Titelkarte belegt 0 (`StartScreen`), die Shell 1–5. */
export const FRAGMENT_BY_SCREEN: Record<MenuScreen, number> = {
  menu: 1,
  greenhouse: 2,
  seedshop: 3,
  beetlelab: 4,
  codex: 5,
};

/**
 * MarginMark — ein Wort am Blattrand, wie mit Bleistift nachgetragen: klein, kursiv, leicht
 * gedreht, `aria-hidden` und `pointer-events: none` (es ist Deko, keine Bedienfläche). Findet
 * jemand ein Wort, sagt die Nummer dahinter, dass fünf weitere auf anderen Blättern warten.
 */
export function MarginMark({ index, corner = 'left' }: { index: number; corner?: 'left' | 'right' }) {
  const word = SIGNATURE_FRAGMENTS[index];
  if (!word) return null; // fail-closed: kein Fragment ⇒ keine Zeile (kein leerer Rand)
  return (
    <span
      style={{ ...styles.mark, ...(corner === 'left' ? styles.markLeft : styles.markRight) }}
      aria-hidden
      data-margin-fragment={index}
    >
      {word}
      <span style={styles.markIndex}> {index + 1}/{SIGNATURE_FRAGMENTS.length}</span>
    </span>
  );
}

export function CreatedBy({ align = 'center' }: { align?: 'center' | 'start' }) {
  const { t } = useI18n();
  const aria = t('signature.github');
  return (
    <div
      style={{ ...styles.wrap, alignItems: align === 'center' ? 'center' : 'flex-start' }}
      data-created-by={AUTHOR.name}
    >
      <span style={styles.line}>
        <span style={styles.label}>
          created by <strong style={styles.name}>{AUTHOR.name}</strong>
        </span>
        <a
          style={styles.link}
          href={AUTHOR.url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={aria}
          title={aria}
          data-github-link
        >
          <GitHubIcon />
        </a>
      </span>
      <span style={styles.motto}>{AUTHOR.motto}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    marginTop: 14,
    fontSize: 11,
    fontStyle: 'italic',
    color: '#8a8065',
  },
  line: { display: 'inline-flex', alignItems: 'center', gap: 7 },
  label: { letterSpacing: '0.02em' },
  name: { fontStyle: 'normal', letterSpacing: '0.1em', color: '#2b2b26' },
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    borderRadius: 5,
    border: '1.5px solid #b7ab8d',
    background: '#f5efdc',
    textDecoration: 'none',
    boxShadow: '1.5px 1.5px 0 rgba(43,43,38,0.3)',
  },
  motto: { fontSize: 10, lineHeight: 1.35, maxWidth: 300, opacity: 0.92 },
  // Blattrand-Notiz: unter der Lese-Schwelle dessen, was als Text gelesen wird, aber sichtbar,
  // wenn man den Rand ansieht (Register der Bleistift-Kritzeleien aus B0).
  mark: {
    position: 'absolute',
    bottom: 7,
    fontSize: 10,
    fontStyle: 'italic',
    letterSpacing: '0.06em',
    color: 'rgba(43,43,38,0.34)',
    transform: 'rotate(-2.5deg)',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 2,
  },
  markLeft: { left: 13 },
  markRight: { right: 13, transform: 'rotate(2.5deg)' },
  markIndex: { opacity: 0.7, letterSpacing: 0 },
};

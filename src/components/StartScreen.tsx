import { useState } from 'react';
import { useI18n, type Lang } from '../i18n';
import type { MetaSave } from '../types';
import { TutorialLayer } from './tutorial/TutorialLayer';

// Owner: UI (StartScreen). LOC ≤ 400.
// B7.1/B0: Papierwelt-Titel — keine Blur-Glass-Karte, kein Emoji-Logo, kein zufälliger Gradient.
// Wordmark als SVG, großer Ink-Button, Sprache als Post-its.
// B21.3: Der Titel-Screen ist die erste Station des Onboardings — Sprache und Startknopf sind
// Cue-Ziele (`data-tut`), ein Tap auf eine Sprache ist das Signal `langChosen`.

type Props = {
  meta: MetaSave;
  onBegin: () => void;
};

const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
];

export function StartScreen({ onBegin }: Props) {
  const { lang, setLang, t } = useI18n();
  // B21.3: nur ein EIGENER Tap zählt als Sprachwahl — die vorgewählte Sprache ist keine.
  const [langChosen, setLangChosen] = useState(false);
  const chooseLang = (id: Lang) => { setLang(id); setLangChosen(true); };

  return (
    <div style={styles.wrap}>
      {/* Papierhügel als SVG-Szenen-Hintergrund (B7.1, statisch gebacken, kein Canvas nötig) */}
      <svg style={styles.hills} viewBox="0 0 400 240" preserveAspectRatio="xMidYMax slice" aria-hidden>
        <path d="M0 150 Q80 120 160 145 T400 140 V240 H0 Z" fill="#e3d9bd" />
        <path d="M0 175 Q120 150 220 172 T400 168 V240 H0 Z" fill="#d6c9a4" />
        <path d="M0 205 Q140 185 260 202 T400 198 V240 H0 Z" fill="#c4b489" />
        {/* Gras-Silhouetten */}
        <g stroke="#2b2b26" strokeWidth="1.4" strokeLinecap="round" opacity="0.5">
          <path d="M60 205 q3 -14 -2 -20 M66 206 q1 -10 6 -15 M72 205 q4 -12 0 -18" fill="none" />
          <path d="M300 208 q3 -12 -2 -18 M306 209 q2 -9 6 -13" fill="none" />
          <path d="M180 200 q2 -12 -3 -17 M186 201 q1 -9 5 -13" fill="none" />
        </g>
      </svg>

      <div style={styles.card}>
        <div style={styles.clip} aria-hidden />
        {/* Wordmark: Pflanze im Kolben + Schriftzug */}
        <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden>
          <ellipse cx="44" cy="74" rx="26" ry="7" fill="#d6c9a4" stroke="#2b2b26" strokeWidth="2" />
          <path d="M44 74 C44 60 44 50 44 40" stroke="#2e4a2a" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M44 44 C38 36 30 34 22 36 C26 46 34 50 44 46 Z" fill="#5a8f4e" stroke="#2b2b26" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M44 40 C50 30 60 28 68 31 C63 42 54 46 44 42 Z" fill="#7fb069" stroke="#2b2b26" strokeWidth="2.4" strokeLinejoin="round" />
          <circle cx="44" cy="30" r="10" fill="#c96f8e" stroke="#2b2b26" strokeWidth="2.4" />
          <circle cx="41" cy="27" r="2.6" fill="#f5efdc" opacity="0.85" />
        </svg>
        <h1 style={styles.title}>{t('start.title')}</h1>
        <p style={styles.subtitle}>{t('start.subtitle')}</p>
        <p style={styles.tagline}>{t('start.tagline')}</p>

        <button onClick={onBegin} style={styles.beginBtn} data-tut="begin">
          {t('start.begin')} →
        </button>

        <div style={styles.langBlock}>
          <div style={styles.langLabel}>{t('start.language')}</div>
          <div style={styles.langRow} data-tut="language">
            {LANGS.map(l => (
              <button
                key={l.id}
                onClick={() => chooseLang(l.id)}
                style={{
                  ...styles.langBtn,
                  ...(lang === l.id ? styles.langBtnActive : {}),
                }}
              >
                {l.label}
                {lang === l.id ? ' ✓' : ''}
              </button>
            ))}
          </div>
        </div>

        <p style={styles.hint}>{t('start.hint')}</p>
      </div>

      <TutorialLayer langChosen={langChosen} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--paper)',
    backgroundImage:
      'repeating-linear-gradient(0deg, rgba(43,43,38,0.025) 0 1px, transparent 1px 3px)',
    position: 'relative',
    overflow: 'hidden',
  },
  hills: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },
  card: {
    position: 'relative',
    textAlign: 'center',
    padding: '34px 44px',
    background: 'var(--paper-warm)',
    border: '2.5px solid var(--ink)',
    borderRadius: 6,
    boxShadow: '6px 6px 0 var(--ink), 0 18px 40px rgba(43,43,38,0.14)',
    maxWidth: 480,
    transform: 'rotate(-0.6deg)',
  },
  clip: {
    position: 'absolute',
    top: -13,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 24,
    border: '3px solid #8a8a80',
    borderTop: 'none',
    borderRadius: '0 0 20px 20px',
  },
  title: {
    fontSize: 40,
    fontWeight: 800,
    margin: '6px 0 0',
    color: 'var(--ink)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 17,
    color: 'var(--leaf-dark)',
    margin: '8px 0 4px',
    fontWeight: 800,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: 13,
    color: '#6b6250',
    margin: '0 0 26px',
    fontWeight: 600,
  },
  beginBtn: {
    padding: '14px 42px',
    fontSize: 17,
    fontWeight: 800,
    color: '#fff',
    background: 'var(--leaf)',
    border: '2.5px solid var(--ink)',
    borderRadius: 8,
    cursor: 'pointer',
    boxShadow: '4px 4px 0 var(--ink)',
    minHeight: 52,
  },
  langBlock: {
    marginTop: 26,
    paddingTop: 18,
    borderTop: '1.5px dashed #b7ab8d',
  },
  langLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#6b6250',
    marginBottom: 10,
    fontWeight: 800,
  },
  langRow: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
  },
  langBtn: {
    padding: '9px 18px',
    background: '#fff',
    border: '2px solid var(--ink)',
    borderRadius: 6,
    color: 'var(--ink)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '2px 2px 0 var(--ink)',
    minHeight: 40,
  },
  langBtnActive: {
    background: '#eef7e6',
    borderColor: 'var(--leaf-dark)',
    boxShadow: '2px 2px 0 var(--leaf-dark)',
    color: 'var(--leaf-dark)',
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: '#8a8065',
    fontWeight: 600,
  },
};

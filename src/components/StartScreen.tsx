import { useState } from 'react';
import { useI18n, type Lang } from '../i18n';
import type { MetaSave } from '../types';

type Props = {
  meta: MetaSave;
  onBegin: () => void;
};

const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

export function StartScreen({ onBegin }: Props) {
  const { lang, setLang, t } = useI18n();

  return (
    <div style={styles.wrap}>
      <div style={styles.glow1} />
      <div style={styles.glow2} />

      <div style={styles.card}>
        <div style={styles.dna}>🧬</div>
        <h1 style={styles.title}>{t('start.title')}</h1>
        <p style={styles.subtitle}>{t('start.subtitle')}</p>
        <p style={styles.tagline}>{t('start.tagline')}</p>

        <button onClick={onBegin} style={styles.beginBtn}>
          {t('start.begin')} →
        </button>

        <div style={styles.langBlock}>
          <div style={styles.langLabel}>{t('start.language')}</div>
          <div style={styles.langRow}>
            {LANGS.map(l => (
              <button
                key={l.id}
                onClick={() => setLang(l.id)}
                style={{
                  ...styles.langBtn,
                  ...(lang === l.id ? styles.langBtnActive : {}),
                }}
              >
                {l.flag} {l.label}
                {lang === l.id && <span style={styles.check}> ✓</span>}
                </button>
            ))}
          </div>
        </div>

        <p style={styles.hint}>{t('start.hint')}</p>
      </div>
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
    background: 'radial-gradient(ellipse at 30% 20%, #1a2f1a 0%, #0a0a0f 60%)',
    position: 'relative',
    overflow: 'hidden',
  },
  glow1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(74,222,128,0.12) 0%, transparent 70%)',
    top: '-10%',
    left: '-5%',
  },
  glow2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)',
    bottom: '-15%',
    right: '-10%',
  },
  card: {
    position: 'relative',
    textAlign: 'center',
    padding: '48px 64px',
    background: 'rgba(15, 23, 42, 0.7)',
    border: '1px solid #1e293b',
    borderRadius: 24,
    backdropFilter: 'blur(12px)',
    maxWidth: 520,
  },
  dna: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 42,
    fontWeight: 800,
    margin: 0,
    background: 'linear-gradient(135deg, #4ade80, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: 18,
    color: '#a78bfa',
    margin: '8px 0 4px',
    fontWeight: 600,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: '#6b7280',
    margin: '0 0 32px',
  },
  beginBtn: {
    padding: '14px 48px',
    fontSize: 18,
    fontWeight: 700,
    color: '#0a0a0f',
    background: 'linear-gradient(135deg, #4ade80, #22c55e)',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    boxShadow: '0 0 32px rgba(74,222,128,0.3)',
    transition: 'all 0.2s',
  },
  langBlock: {
    marginTop: 36,
    paddingTop: 24,
    borderTop: '1px solid #1e293b',
  },
  langLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#475569',
    marginBottom: 10,
  },
  langRow: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
  },
  langBtn: {
    padding: '8px 18px',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 8,
    color: '#9ca3af',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  langBtnActive: {
    background: 'rgba(74,222,128,0.12)',
    border: '1px solid #4ade80',
    color: '#4ade80',
  },
  check: {
    marginLeft: 4,
  },
  hint: {
    marginTop: 20,
    fontSize: 12,
    color: '#475569',
  },
};

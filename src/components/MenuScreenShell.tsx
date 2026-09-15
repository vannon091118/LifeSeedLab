import type { MetaSave } from '../types';
import { useI18n } from '../i18n';
import { NavIndicators, type MenuScreen } from './NavIndicators';
import { ScreenTransition } from './ScreenTransition';

// Owner: UI (MenuScreenShell — Vollbild-Rahmen für Menü-Screens). LOC ≤ 200.
// JEDER Menübereich ist ein eigener Screen: Vollbild, mit NavIndicators (Tabs/Chips/
// Dots), Zurück-Pfad und Papier-Übergang. Kein Overlay-Wirrwarr mehr.

type Props = {
  meta: MetaSave;
  current: MenuScreen;
  onNavigate: (s: MenuScreen) => void;
  onBack: () => void;
  children: React.ReactNode;
};

export function MenuScreenShell({ meta, current, onNavigate, onBack, children }: Props) {
  const { t } = useI18n();
  const isHub = current === 'menu';

  return (
    <div style={styles.wrap}>
      <div style={styles.tape} aria-hidden />
      <MenuScreenShellClip aria-hidden />
      <NavIndicators meta={meta} current={current} onNavigate={onNavigate} />
      <div style={styles.toolbar}>
        <button onClick={onBack} style={styles.backBtn} aria-label={t('common.back')}>
          ← {t('common.back')}
        </button>
      </div>
      <div style={styles.body}>
        <ScreenTransition screenKey={current}>{children}</ScreenTransition>
      </div>
      {isHub && <span aria-hidden />}
    </div>
  );
}

function MenuScreenShellClip(props: { 'aria-hidden': true }) {
  return <span style={styles.clip} {...props} />;
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--paper)',
    backgroundImage:
      'repeating-linear-gradient(0deg, rgba(43,43,38,0.02) 0 1px, transparent 1px 3px), radial-gradient(ellipse at 70% 8%, rgba(217,164,65,0.08), transparent 55%)',
    overflow: 'hidden',
    position: 'relative',
  },
  tape: {
    position: 'absolute',
    top: 4,
    left: '50%',
    transform: 'translateX(-50%) rotate(-2deg)',
    width: 96,
    height: 16,
    background: 'rgba(217,164,65,0.45)',
    border: '1px solid rgba(43,43,38,0.25)',
    zIndex: 5,
  },
  clip: {
    position: 'absolute',
    top: -12,
    left: 36,
    width: 40,
    height: 24,
    border: '3px solid #8a8a80',
    borderTop: 'none',
    borderRadius: '0 0 20px 20px',
    boxShadow: 'inset 0 -2px 0 rgba(43,43,38,0.25)',
    zIndex: 6,
  },
  toolbar: {
    padding: '10px 16px 0',
  },
  backBtn: {
    minHeight: 44,
    padding: '8px 14px',
    background: '#fff',
    border: '2px solid var(--ink)',
    borderRadius: 6,
    color: 'var(--ink)',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '2px 2px 0 var(--ink)',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 16px 24px',
  },
};

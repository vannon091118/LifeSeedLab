import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useI18n } from '../../i18n';
import { tutorialText, type TutorialTextKey } from '../../i18n/tutorial';
import { TUTORIAL_STEPS } from './script';

export interface ReviewNote {
  id: string;
  title: string;
  text: string;
}

/** Bereitet die bereits gesehenen Notizen aus der einen Tutorial-Wahrheit auf. */
export function reviewNotes(lang: 'de' | 'en'): ReviewNote[] {
  return TUTORIAL_STEPS.map((step) => ({
    id: step.id,
    title: tutorialText(`tut.${step.id}.title` as TutorialTextKey, lang),
    text: tutorialText(`tut.${step.id}.text` as TutorialTextKey, lang),
  }));
}

export function NotesReview({ onClose }: { onClose: () => void }) {
  const { lang, t } = useI18n();
  const notes = reviewNotes(lang);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      style={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="krix-notes-title" style={styles.dialog}>
        <header style={styles.header}>
          <div>
            <h2 id="krix-notes-title" style={styles.title}>{tutorialText('tut.review.title', lang)}</h2>
            <p style={styles.intro}>{tutorialText('tut.review.intro', lang)}</p>
          </div>
          <button type="button" onClick={onClose} style={styles.close} aria-label={t('common.close')}>
            ×
          </button>
        </header>
        <ol style={styles.list}>
          {notes.map((note, index) => (
            <li key={note.id} style={styles.note}>
              <span style={styles.number}>{tutorialText('tut.note', lang).replace('{n}', String(index + 1)).replace('{m}', String(notes.length))}</span>
              <strong style={styles.noteTitle}>{note.title}</strong>
              <p style={styles.noteText}>{note.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, background: 'rgba(43,43,38,0.48)',
  },
  dialog: {
    width: 'min(720px, 100%)', maxHeight: 'min(760px, 92vh)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    padding: 20, background: 'var(--paper-warm)', border: '3px solid var(--ink)', borderRadius: 8,
    boxShadow: '7px 7px 0 var(--ink)',
  },
  // Header und Leseliste sind zwei Ebenen: Der Schließen-Knopf bleibt beim Scrollen
  // sichtbar, während die Notizen darunter in ihrem eigenen Bereich scrollen.
  header: {
    flex: '0 0 auto', display: 'flex', justifyContent: 'space-between', gap: 16,
    alignItems: 'flex-start', padding: '0 0 10px', background: 'var(--paper-warm)',
  },
  title: { margin: 0, fontSize: 22, color: 'var(--ink)' },
  intro: { margin: '6px 0 0', color: '#6b6250', fontSize: 13 },
  close: {
    minWidth: 44, minHeight: 44, border: '2px solid var(--ink)', borderRadius: 6, background: '#fff',
    color: 'var(--ink)', fontSize: 24, lineHeight: 1, cursor: 'pointer', boxShadow: '2px 2px 0 var(--ink)',
  },
  list: { flex: '1 1 auto', minHeight: 0, overflowY: 'auto', listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'grid', gap: 10 },
  note: { padding: '12px 14px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 6 },
  number: { display: 'block', color: '#6b6250', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  noteTitle: { display: 'block', marginTop: 3, color: 'var(--ink)', fontSize: 14 },
  noteText: { margin: '5px 0 0', color: '#4d4a40', fontSize: 13, lineHeight: 1.4 },
};

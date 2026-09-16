import { describe, it, expect } from 'vitest';
import { AUTHOR, SIGNATURE_FRAGMENTS, FRAGMENT_BY_SCREEN } from './CreatedBy';
import { translations } from '../i18n/translations';

// ══ B31 — Signatur und ihr Easter Egg ═══════════════════════════════════════
// Die Signatur ist Inhalt, kein Zufallstext: das Motto buchstabiert den Namen. Genau das prüft
// dieser Test — nicht die Darstellung (die deckt E2E ab), sondern dass Name, Motto, Fragmente und
// Reihenfolge zusammenpassen. Wer das Motto umschreibt, muss den Namen mitziehen; wer ein Fragment
// einfügt, muss die Flächen-Map mitziehen.

const initials = (text: string): string =>
  text.split(/\s+/).filter(w => /^[A-Za-z]/.test(w)).map(w => w[0]!).join('');

describe('B31 — Signatur', () => {
  it('Name und Motto: der erste Halbsatz buchstabiert den Namen', () => {
    expect(AUTHOR.name).toBe('VANNON');
    const [head, tail] = AUTHOR.motto.split(' — ');
    expect(initials(head!)).toBe(AUTHOR.name);
    // Der zweite Halbsatz ist eine eigene Abkürzung (Vibe), nicht Teil des Namens.
    expect(tail).toBe('Never Overly Nice, Never Average Vibe.');
    expect(initials(tail!)).toBe('NONNAV');
  });

  it('die Fragmente sind exakt die Wörter des Namens-Halbsatzes', () => {
    const [head] = AUTHOR.motto.split(' — ');
    expect([...SIGNATURE_FRAGMENTS]).toEqual(head!.split(' '));
    expect(SIGNATURE_FRAGMENTS.map(w => w[0]).join('')).toBe(AUTHOR.name);
  });

  it('jede Papierfläche bekommt genau ein eigenes Fragment', () => {
    const screens = Object.keys(FRAGMENT_BY_SCREEN);
    expect(screens).toHaveLength(5);
    const indexes = Object.values(FRAGMENT_BY_SCREEN);
    // 0 gehört der Titelkarte (StartScreen), 1–5 den Menüflächen — keine Dopplung, keine Lücke.
    expect([...indexes].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    expect(indexes.length + 1).toBe(SIGNATURE_FRAGMENTS.length);
    for (const index of [0, ...indexes]) {
      expect(SIGNATURE_FRAGMENTS[index], `Fragment ${index} fehlt`).toBeDefined();
    }
  });

  it('das GitHub-Ziel zeigt auf dieses Repository', () => {
    expect(AUTHOR.url).toBe('https://github.com/vannon091118/LifeSeedLab');
    expect(AUTHOR.url).toMatch(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/);
  });

  it('die Bedienhilfe des Links ist zweisprachig (Name und Motto bewusst nicht)', () => {
    expect(translations.de['signature.github']).toBeTruthy();
    expect(translations.en['signature.github']).toBeTruthy();
    expect(translations.de['signature.github']).not.toBe(translations.en['signature.github']);
  });
});

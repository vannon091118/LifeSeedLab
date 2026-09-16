import { describe, expect, it } from 'vitest';
import { isDevMode, onboardingAutoStart } from './gate';

// B21: Die Release-Fläche zeigt das Onboarding automatisch, das DevGate überspringt es. Beide
// Ausnahmen sind ausdrücklich (`tutorial=1` / `tutorial=0`) — kein zweiter Zustandsspeicher.

describe('DevGate — Onboarding-Sichtbarkeit', () => {
  it('startet in der Release-Fläche automatisch', () => {
    expect(onboardingAutoStart('', '')).toBe(true);
  });

  it('überspringt das Onboarding im DevGate (Werkzeug statt Vorführung)', () => {
    expect(isDevMode('?dev=1', '')).toBe(true);
    expect(onboardingAutoStart('?dev=1', '')).toBe(false);
    expect(onboardingAutoStart('', '#dev')).toBe(false);
  });

  it('lässt sich hinter dem Gate ausdrücklich erzwingen (E2E-Beweis)', () => {
    expect(onboardingAutoStart('?dev=1&tutorial=1', '')).toBe(true);
  });

  it('lässt sich ausdrücklich abschalten', () => {
    expect(onboardingAutoStart('?tutorial=0', '')).toBe(false);
  });

  it('behandelt unbekannte Werte als „nicht gesetzt"', () => {
    expect(onboardingAutoStart('?tutorial=ja', '')).toBe(true);      // Release: Auto-Start bleibt
    expect(onboardingAutoStart('?dev=1&tutorial=', '')).toBe(false);  // Gate: leerer Wert hebt nichts auf
  });
});

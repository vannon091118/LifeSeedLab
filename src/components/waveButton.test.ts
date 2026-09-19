import { describe, expect, it } from 'vitest';
import { waveButtonState } from './waveButton';
import { rejectTextKey, toastVisible, TOAST_TICKS } from './FieldToast';
import { formatScore } from './numberFormat';
import { AUTO_WAVE_DELAY_TICKS } from '../config/economy.source';
import { autoStartSecondsLeft } from '../simulation/waveTiming';
import { translations } from '../i18n/translations';
import type { UiRejectReason } from './placementController';

// B23.2/B23.3 — die Verträge, die beide Spielerberichte eingefordert haben:
// „Button-Label an Phase koppeln" und „kurze, konkrete Rückmeldung am Feld".

describe('B23.2 — Wellen-Knopf folgt der Phase', () => {
  it('ist während der laufenden Welle eine Anzeige, kein Knopf', () => {
    const s = waveButtonState({ phase: 'wave', prepTicksLeft: 12 });
    expect(s.disabled).toBe(true);
    expect(s.labelKey).toBe('wave.running');
  });

  it('bleibt in der Vorbereitung ein HANDLUNGS-Knopf — auch mit laufendem Countdown', () => {
    const empty = waveButtonState({ phase: 'prep', prepTicksLeft: null });
    expect(empty.disabled).toBe(false);
    expect(empty.labelKey).toBe('game.startWave');   // die Handlung, nicht der Zustand
    expect(empty.waitingForPlant).toBe(true);        // B23.1: leeres Feld, das Labor wartet
    expect(empty.hintKey).toBe('wave.waitingHint');

    const running = waveButtonState({ phase: 'prep', prepTicksLeft: AUTO_WAVE_DELAY_TICKS });
    expect(running.disabled).toBe(false);
    expect(running.labelKey).toBe('game.startWave'); // Beschriftung bleibt die Handlung
    expect(running.hintKey).toBe('wave.startIn');    // der Countdown steht daneben
    expect(running.seconds).toBe(autoStartSecondsLeft(AUTO_WAVE_DELAY_TICKS));
    expect(running.seconds).toBeGreaterThan(0);
  });

  it('drückt nach dem Game Over nichts mehr', () => {
    expect(waveButtonState({ phase: 'gameover', prepTicksLeft: null }).disabled).toBe(true);
  });

  it('hat für jeden Label-Schlüssel einen Text in beiden Sprachen', () => {
    const keys = (['wave.running', 'wave.startIn', 'game.startWave'] as const);
    for (const key of keys) {
      expect(translations.de[key]).toBeTruthy();
      expect(translations.en[key]).toBeTruthy();
    }
  });
});

describe('B23.3 — Ablehnungsgrund wird sichtbar', () => {
  it('übersetzt jeden Grund der Sim in einen eigenen Text', () => {
    const reasons: UiRejectReason[] = ['occupied', 'on_path', 'no_inventory', 'unknown'];
    const keys = reasons.map(rejectTextKey);
    expect(new Set(keys).size).toBe(reasons.length);        // kein Grund fällt auf denselben Text
    for (const key of keys) {
      expect(translations.de[key], `${key} fehlt (DE)`).toBeTruthy();
      expect(translations.en[key], `${key} fehlt (EN)`).toBeTruthy();
    }
  });

  it('blendet die Meldung nach ihrer Lebensdauer aus — Zeitbasis ist der Sim-Tick', () => {
    const rejection = { gx: 1, gy: 1, reason: 'occupied' as const, tick: 100 };
    expect(toastVisible(rejection, 100)).toBe(true);
    expect(toastVisible(rejection, 100 + TOAST_TICKS - 1)).toBe(true);
    expect(toastVisible(rejection, 100 + TOAST_TICKS)).toBe(false);
    expect(toastVisible(null, 100)).toBe(false);
    // Ein zurückgesetzter Tick (neuer Run) darf keine alte Meldung stehen lassen.
    expect(toastVisible(rejection, 10)).toBe(false);
  });
});

describe('B23.4 — Score als Spielerzahl', () => {
  it('rundet gebrochene Kombi-Werte, statt sie roh zu zeigen', () => {
    expect(formatScore(243.09999999999997)).toBe('243');
    expect(formatScore(0)).toBe('0');
    expect(formatScore(17.5)).toBe('18');
    expect(formatScore(Number.NaN)).toBe('0');
  });
});

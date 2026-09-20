import { describe, it, expect } from 'vitest';
import { cardPress } from './PlacementTray';
import type { PointerEvent as ReactPointerEvent } from 'react';

// Owner: UI-Test (PlacementTray). Befund der Spieltestsession v0.0.71: „Karten mit onPointerDown
// reagieren nicht auf synthetische Klick-Events (Agenten/Barrierefreiheit)".
//
// Der Kontrakt wird zweigeteilt gepinnt:
//   1. Pointer (Maus/Touch) wählt weiterhin per pointerdown — inklusive releasePointerCapture,
//      der Geste, die den Drag aus der Tray zum Brett möglich hält (Q2).
//   2. Ein KLICK ohne Zeigegerät (detail === 0: Tastatur-Enter/Space, Screenreader, synthetisch)
//      wählt ebenfalls aus. Doppel-Auslösung ist ausgeschlossen, weil echte Zeigegeräte
//      detail >= 1 liefern — sonst würde die Auswahl sofort wieder umgeschaltet.

/** Minimal-Event: nur die Felder, die der Vertrag liest. */
function pointerDown(target: unknown, pointerId: number): ReactPointerEvent<HTMLElement> {
  return { target, pointerId } as unknown as ReactPointerEvent<HTMLElement>;
}

describe('PlacementTray — cardPress: Pointer UND Klick bedienen die Karte', () => {
  it('pointerdown aktiviert und gibt den Pointer frei (Drag aus der Tray bleibt möglich)', () => {
    const calls: number[] = [];
    const released: number[] = [];
    const target = { releasePointerCapture: (id: number) => released.push(id) };
    cardPress(() => calls.push(1)).onPointerDown(pointerDown(target, 7));
    expect(calls).toHaveLength(1);
    expect(released).toEqual([7]);
  });

  it('pointerdown ohne releasePointerCapture (fremdes Element) bricht nicht ab', () => {
    const calls: number[] = [];
    expect(() => cardPress(() => calls.push(1)).onPointerDown(pointerDown({}, 3))).not.toThrow();
    expect(calls).toHaveLength(1);
  });

  it('echter Maus-/Touch-Klick (detail >= 1) aktiviert NICHT doppelt', () => {
    const calls: number[] = [];
    const press = cardPress(() => calls.push(1));
    press.onPointerDown(pointerDown({}, 1));
    press.onClick({ detail: 1 }); // derselbe Tap, zweite Stufe
    press.onClick({ detail: 2 }); // Doppelklick
    expect(calls).toHaveLength(1);
  });

  it('Klick ohne Zeigegerät (detail === 0) aktiviert die Karte — Tastatur/Screenreader/Agent', () => {
    const calls: number[] = [];
    cardPress(() => calls.push(1)).onClick({ detail: 0 });
    expect(calls).toHaveLength(1);
  });
});

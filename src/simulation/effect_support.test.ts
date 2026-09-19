// Owner: SimulationSystem (Effekt-Unterstützung) — Vertragstest.
//
// Diese Datei pinnt zwei Zusagen, die vorher niemand gab:
//   1. VOLLSTÄNDIGKEIT: jeder Effekt der Content-Source steht in `EFFECT_SIM_SUPPORT` — ein
//      neuer Effekt ohne Eintrag ist ein Fehler, kein stilles Durchfallen.
//   2. RECHNUNG: `statusForEffect` ist die EINZIGE Ableitung, die `enemySystem` befragt. Die
//      vier Wirkungen der zweiten Gen-Gruppe mit vorhandenem Status laufen sofort mit, die vier
//      anderen sind ausdrücklich `visual-only` und damit terminierbar (P3 Ballistik, P4 Gefahren).

import { describe, it, expect } from 'vitest';
import { EFFECT_IDS, EFFECTS_SOURCE } from '../config/effects.source';
import { EFFECT_SIM_SUPPORT, statusForEffect, statusTicksOf } from './effectSupport';

describe('Effekt-Vertrag: Source ↔ Simulation', () => {
  it('jeder Effekt der Source ist deklariert — und nichts darüber hinaus', () => {
    for (const id of EFFECT_IDS) {
      expect(EFFECT_SIM_SUPPORT[id], `Effekt ohne Support-Deklaration: ${id}`).toBeDefined();
    }
    expect(Object.keys(EFFECT_SIM_SUPPORT).sort()).toEqual([...EFFECT_IDS].sort());
  });

  it('jeder deklarierte Status ist einer der drei, die die Simulation kennt', () => {
    for (const [id, entry] of Object.entries(EFFECT_SIM_SUPPORT)) {
      if (!entry.status) continue;
      expect(entry.support, `${id} hat einen Status, gilt aber als Optik`).toBe('sim');
      expect(['slow', 'burn', 'poison']).toContain(entry.status);
    }
  });

  it('die Status-Ableitung trifft genau die deklarierten Effekte', () => {
    expect(statusForEffect('EFFECT_SLOW')).toBe('slow');
    expect(statusForEffect('EFFECT_BURN')).toBe('burn');
    expect(statusForEffect('EFFECT_POISON')).toBe('poison');
    // Zweite Gen-Gruppe: vier Wirkungen laufen auf dem vorhandenen Statussystem mit.
    expect(statusForEffect('EFFECT_ACID')).toBe('poison');
    expect(statusForEffect('EFFECT_SPORE')).toBe('poison');
    expect(statusForEffect('EFFECT_BLOOM')).toBe('slow');
    expect(statusForEffect('EFFECT_VORTEX')).toBe('slow');
    // Ohne Effekt, ohne Status oder notorisch nur-Optik ⇒ kein Status (fail-closed).
    expect(statusForEffect(null)).toBeNull();
    expect(statusForEffect('EFFECT_UNBEKANNT')).toBeNull();
    for (const id of EFFECT_IDS) {
      if (EFFECT_SIM_SUPPORT[id].status) continue;
      expect(statusForEffect(id), `${id} darf keinen Status setzen`).toBeNull();
    }
  });

  it('Status-ART und Status-DAUER widersprechen sich nie (Sim-Vertrag ↔ Content)', () => {
    // Zwei Dateien, ein Faktum: `effectSupport` sagt WELCHER Status folgt, `effects.source`
    // WIE LANGE er wirkt. Beide Hälften müssen zusammenpassen — sonst gäbe es einen Effekt
    // mit Status und Dauer 0 (stiller No-Op) oder eine Dauer ohne Status (Content ohne Wirkung).
    for (const id of EFFECT_IDS) {
      const kind = EFFECT_SIM_SUPPORT[id].status;
      const ticks = EFFECTS_SOURCE[id].statusTicks;
      if (kind) {
        expect(ticks, `${id} setzt Status '${kind}', hat aber keine Wirkdauer`).toBeGreaterThan(0);
      } else {
        expect(ticks, `${id} hat eine Wirkdauer, setzt aber keinen Status`).toBeNull();
      }
    }
    expect(statusTicksOf('EFFECT_SLOW')).toBe(90);
    expect(statusTicksOf('EFFECT_BURN')).toBe(3);
    expect(statusTicksOf('EFFECT_POISON')).toBe(5);
    expect(statusTicksOf(null)).toBe(0);
  });

  it('die offenen Effekte sind GEZÄHLT, nicht vergessen', () => {
    const visualOnly = EFFECT_IDS.filter(id => EFFECT_SIM_SUPPORT[id].support === 'visual-only');
    // 4 aus dem Grundstock (Heilung/Schild/Reflex/Hast stecken in den Stats) + 4 der zweiten
    // Gruppe (Gravitation, Echo, Prisma, Titan warten auf ihren Slice).
    expect(visualOnly.sort()).toEqual([
      'EFFECT_ECHO', 'EFFECT_GRAVITY', 'EFFECT_HASTE', 'EFFECT_HEAL',
      'EFFECT_PRISMATIC', 'EFFECT_REFLECT', 'EFFECT_SHIELD', 'EFFECT_TITAN',
    ]);
  });
});

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
// Owner: Simulation-Tests — Sub-Domäne „Game Over & Spieler-Meldungen" (B32.2/3, Phase 4).
// Aus simulation_beetle_fire_pair.test.ts ausgegliedert (LOC-Cap 300):
// P1-Game-Over-Freeze (aus gameover.test.ts) + B29-Ablehnungs-Meldungen (aus simulation_notice.test.ts).
// Perf-Note: forceGameOver läuft einmal in beforeAll (~240 ms) — alle P1-Tests teilen den Root,
// weil stepOnce nach gameover ein echtes no-op ist (Phase friert Clock + Commands). Spart ~480 ms.

import { SimulationRoot, makeCommand } from './root';
import { makeRoot } from '../testing/testkit';
import { resetIds } from '../core/ids';

const GO_SEED = 424242;

/** Erzwingt Game Over über die echte Sim-Pipeline — Q1-Balance-fest.
 * High-Wave-Resume mit 1 Leben: Welle 21 spawnt ~60 Gegner, Durchbruch garantiert.
 * Liefert einen Root im gameover-Zustand (Phase friert Clock + Commands = no-op). */
function forceGameOver(): SimulationRoot {
  const resume: import('./resume').ResumeSnapshot = {
    waveNumber: 20, lives: 1, score: 0,
    combo: { count: 0, timer: 0, multiplier: 1, highest: 0, waveBestMult: 1, waveBestMultWave: 20 },
    plants: [], inventory: {}, discoveredVariants: [], nektarEarned: 0,
  };
  const root = makeRoot({ seed: GO_SEED, resume });
  root.commands.push(makeCommand(0, 'START_WAVE', 1, {}));
  root.stepOnce();
  for (let i = 0; i < 60000 && root.getSnapshot().phase !== 'gameover'; i++) root.stepOnce();
  return root;
}

import { noticeFromEvent } from '../components/fieldNotice';
import { rejectTextKey } from '../components/FieldToast';
import { translations } from '../i18n/translations';
import type { GameEvent } from '../bus/events';

// P1-Tests prüfen Freeze-Invarianzen: nach gameover ist stepOnce() ein no-op — Clock, Commands,
// State-Hash ändern sich nie. Deshalb teilen alle drei Tests denselben Root (ein beforeAll).
let sharedGoRoot: SimulationRoot;

describe('Game Over friert am Owner (P1)', () => {
  beforeAll(() => { sharedGoRoot = forceGameOver(); });
  beforeEach(() => resetIds());

  it('nach GAME_OVER führen Commands zu nichts (keine Pflanzen, kein Materialverbrauch)', () => {
    const root = sharedGoRoot;
    const snap = root.getSnapshot();
    const material = { ...snap.inventory };
    const plants = snap.plants.length;

    root.commands.push(makeCommand(snap.clock.tick, 'PLACE_PLANT', 2, { variantId: 'sprout', gx: 1, gy: 2 }));
    root.commands.push(makeCommand(snap.clock.tick, 'FERTILIZE_PLANT', 3, { plantId: 'plant-0001' }));
    root.commands.push(makeCommand(snap.clock.tick, 'PROPAGATE_PLANT', 4, { plantId: 'plant-0001' }));
    root.commands.push(makeCommand(snap.clock.tick, 'START_WAVE', 5, {}));
    root.stepOnce();
    root.stepOnce();

    expect(root.getSnapshot().plants.length).toBe(plants);
    expect(root.getSnapshot().inventory).toEqual(material); // auch der Pool bleibt unangetastet
    expect(root.getSnapshot().phase).toBe('gameover');
  });

  it('nach GAME_OVER läuft die Uhr nicht mehr (keine Ticks, keine Tag/Nacht-Events)', () => {
    const root = sharedGoRoot;
    const tickBefore = root.getSnapshot().clock.tick;

    let events = 0;
    for (const type of ['GAME_OVER', 'WAVE_STARTED', 'WAVE_COMPLETED', 'NIGHT_STARTED', 'DAY_STARTED'] as const) {
      root.bus.subscribe(type, () => { events++; });
    }
    for (let i = 0; i < 3000; i++) root.stepOnce();

    expect(root.getSnapshot().clock.tick).toBe(tickBefore);
    expect(events).toBe(0);
    expect(root.getSnapshot().phase).toBe('gameover');
  });

  it('Platzierungen nach Game Over verändern den State-Hash nicht', () => {
    const root = sharedGoRoot;
    const s = root.getSnapshot();
    const before = JSON.stringify({
      tick: s.clock.tick, lives: s.lives, plants: s.plants, wave: s.wave.number, material: s.inventory,
    });
    root.commands.push(makeCommand(s.clock.tick, 'PLACE_PLANT', 9, { variantId: 'sprout', gx: 3, gy: 3 }));
    for (let i = 0; i < 120; i++) root.stepOnce();
    const s2 = root.getSnapshot();
    const after = JSON.stringify({
      tick: s2.clock.tick, lives: s2.lives, plants: s2.plants, wave: s2.wave.number, material: s2.inventory,
    });
    expect(after).toBe(before);
  });
});

// ── B29: Die Sim lehnt ab — der Spieler erfährt es auch ─────────────────────
// Der Befund war kein fehlendes Feature, sondern ein fehlender Konsument: die Systeme emittierten
// die Ablehnung samt Grund, und niemand las sie. Gemessen wird hier am ECHTEN SimulationRoot über
// den Command-Pfad (nicht am nachgebauten Event) — bis zum Text, den der Spieler liest.
//
// Besonders wichtig ist der Tile-Fall: `placementController` delegiert die Map-Regeln absichtlich
// an die Sim (Baubereich, Korridor, maxCount sind Karten-Wissen, keine Zellenprüfung). Die Antwort
// muss also aus dem Bus kommen und beim Spieler ankommen — vorher zahlte er Energie und es passierte
// sichtbar nichts.

/** Sammelt den Grund des ersten Ablehnungs-Events und übersetzt ihn wie die UI es tut. */
function collector(root: SimulationRoot, type: GameEvent['type']) {
  let reason: string | null = null;
  let text: string | null = null;
  root.bus.subscribe(type, (e) => {
    const notice = noticeFromEvent(e as GameEvent);
    if (!notice) return;
    reason = notice.reason;
    text = translations.de[rejectTextKey(notice.reason)] ?? null;
  });
  return () => ({ reason, text });
}

describe('B29 — Ablehnungen erreichen den Spieler (echter Run)', () => {
  it('TILE_REJECTED: out_of_world und max_count kommen mit Text an', () => {
    // Seit dem Findling-Schnitt (21.09.2026) hat nur noch die DEKO einen kleinen Deckel
    // (maxCount 20) — an ihr bleibt `max_count` überhaupt erreichbar. Deko ist begehbar, es
    // kann also kein `route_blocked` dazwischenfunken.
    const root = makeRoot({ seed: 4242, materialStock: { decor: 25 } });
    const read = collector(root, 'TILE_REJECTED');

    // Außerhalb der Weltfläche — die UI prüft das nicht vor, die Sim entscheidet.
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 50, gy: 3, tile: 'decor' }));
    root.stepOnce();
    expect(read().reason).toBe('out_of_world');

    // 20 Deko sind erlaubt, die 21. wird abgewiesen. #4: der Vorrat (25) macht das
    // maxCount-Limit zur Grenze, nicht das Material.
    const cells: [number, number][] = [];
    for (let gx = 0; gx < 12; gx++) cells.push([gx, 8]);
    for (let gx = 0; gx < 9; gx++) cells.push([gx, 9]);
    let seq = 2;
    for (const [gx, gy] of cells) {
      root.commands.push(makeCommand(1, 'PLACE_TILE', seq++, { gx, gy, tile: 'decor' }));
    }
    root.stepOnce();
    expect(read().reason).toBe('max_count');
    expect(read().text).toBe('Von diesem Feld steht schon das Maximum.');
  });

  it('FERTILIZE_REJECTED und PROPAGATE_REJECTED: Pflanzen-Gründe kommen mit Text an', () => {
    const root = makeRoot({ seed: 4242, loadout: ['sprout'] });
    const fert = collector(root, 'FERTILIZE_REJECTED');
    const prop = collector(root, 'PROPAGATE_REJECTED');

    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 4, gy: 3 }));
    root.stepOnce();
    const plantId = root.getSnapshot().plants[0]!.id;

    // Eine wachsende Pflanze nimmt genau `maxApplications` Dünger — der nächste wird abgewiesen.
    let seq = 2;
    for (let i = 0; i < 4; i++) {
      root.commands.push(makeCommand(1 + i, 'FERTILIZE_PLANT', seq++, { plantId }));
      root.stepOnce();
    }
    expect(fert().reason).toBe('max_reached');
    expect(fert().text).toBe('Mehr Dünger nimmt sie nicht an.');

    // Noch nicht reif ⇒ Vermehrung abgelehnt (der Zustand liegt in der Sim, nicht im UI)
    root.commands.push(makeCommand(9, 'PROPAGATE_PLANT', seq++, { plantId }));
    root.stepOnce();
    expect(prop().reason).toBe('not_mature');
    expect(prop().text).toBe('Diese Pflanze ist noch nicht reif.');
  });

  it('BEETLE_REJECTED: leerer Brutling-Vorrat kommt mit Text an (#4: kein Energie-Grund mehr)', () => {
    // Ohne `beetles` ist das Lager leer — der Deploy scheitert am Besitz, nicht an Energie.
    const root = makeRoot({ seed: 4242, loadout: ['sprout'] });
    const read = collector(root, 'BEETLE_REJECTED');

    root.commands.push(makeCommand(1, 'DEPLOY_BEETLE', 1, { beetleId: 'beetle-0001' }));
    root.stepOnce();
    expect(read().reason).toBe('none_available');
    expect(read().text).toBe('Kein Brutling im Lager.');
  });

  it('jede Ablehnung ist auch ein FX-Ereignis, keine stille Zeile im Bus', () => {
    const root = makeRoot({ seed: 4242, materialStock: { pot: 12 } });
    const seen: string[] = [];
    for (const type of ['TILE_REJECTED', 'PLACEMENT_REJECTED', 'FERTILIZE_REJECTED', 'PROPAGATE_REJECTED', 'BEETLE_REJECTED'] as const) {
      root.bus.subscribe(type, () => seen.push(type));
    }
    // R2: die Ablehnung der Sim ist route_blocked — der letzte freie Weg bleibt immer offen.
    // Der Test zählt nur, DASS eine TILE_REJECTED-Zeile entsteht — der schließende Zug der
    // Voll-Mauer genügt. Der Vorrat (12) macht die WEG-Regel zur Grenze, nicht Material (#4).
    for (let gy = 0; gy < 12; gy++) {
      root.commands.push(makeCommand(0, 'PLACE_TILE', gy + 1, { gx: 5, gy, tile: 'pot' }));
    }
    root.stepOnce();
    expect(seen).toContain('TILE_REJECTED');
  });
});

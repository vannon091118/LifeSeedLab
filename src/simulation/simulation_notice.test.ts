import { describe, it, expect } from 'vitest';
import { SimulationRoot, makeCommand } from './root';
import { rollBrood } from '../genome/beetle';
import { noticeFromEvent } from '../components/fieldNotice';
import { rejectTextKey } from '../components/FieldToast';
import { translations } from '../i18n/translations';
import type { GameEvent } from '../bus/events';

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
  it('TILE_REJECTED: Spawn-Korridor und max_count kommen mit Text an', () => {
    const root = new SimulationRoot({ seed: 4242 });
    const read = collector(root, 'TILE_REJECTED');

    // gx=0 ist der Spawn-Korridor — die UI prüft das nicht vor, die Sim entscheidet.
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 0, gy: 3, tile: 'path' }));
    root.stepOnce();
    expect(read().reason).toBe('spawn_corridor');
    expect(read().text).toBe('Der Eingang muss frei bleiben.');

    // Findlinge: 6 erlaubt, der siebte wird abgewiesen (schützt vor Weg-Mauern).
    let seq = 2;
    for (let i = 0; i < 7; i++) {
      root.commands.push(makeCommand(1, 'PLACE_TILE', seq++, { gx: 2 + i, gy: 6, tile: 'boulder' }));
    }
    root.stepOnce();
    expect(read().reason).toBe('max_count');
    expect(read().text).toBe('Von diesem Feld steht schon das Maximum.');
  });

  it('FERTILIZE_REJECTED und PROPAGATE_REJECTED: Pflanzen-Gründe kommen mit Text an', () => {
    const root = new SimulationRoot({ seed: 4242, loadout: ['sprout'] });
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

    // Noch nicht reif ⇒ Vermehrung abgelehnt (der Zustand liegt in der Sim, nicht im UI).
    root.commands.push(makeCommand(9, 'PROPAGATE_PLANT', seq++, { plantId }));
    root.stepOnce();
    expect(prop().reason).toBe('not_mature');
    expect(prop().text).toBe('Diese Pflanze ist noch nicht reif.');
  });

  it('BEETLE_REJECTED: zu wenig Energie kommt mit Text an (der einzige Fall, der den Knopf passiert)', () => {
    const brood = rollBrood('leafhopper', 'shellbeetle', 5);
    const root = new SimulationRoot({ seed: 4242, loadout: ['sprout'], beetles: brood });
    const read = collector(root, 'BEETLE_REJECTED');

    // Platzieren (50) und Findlinge (20) drücken die Energie unter jede Brut-Kostenhürde. Die
    // Schleife ist zustandsgesteuert, nicht zeitgesteuert — derselbe Lauf, dasselbe Ergebnis.
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 4, gy: 3 }));
    root.stepOnce();
    let seq = 2;
    for (let i = 0; i < 6; i++) {
      root.commands.push(makeCommand(1, 'PLACE_TILE', seq++, { gx: 2 + i, gy: 6, tile: 'boulder' }));
      root.stepOnce();
    }
    expect(root.getSnapshot().resources.energy).toBeLessThan(10);

    root.commands.push(makeCommand(2, 'DEPLOY_BEETLE', seq++, { beetleId: brood[0].id }));
    root.stepOnce();
    expect(read().reason).toBe('no_energy');
    expect(read().text).toBe('Zu wenig Energie.');
  });

  it('jede Ablehnung ist auch ein FX-Ereignis, keine stille Zeile im Bus', () => {
    const root = new SimulationRoot({ seed: 4242 });
    const seen: string[] = [];
    for (const type of ['TILE_REJECTED', 'PLACEMENT_REJECTED', 'FERTILIZE_REJECTED', 'PROPAGATE_REJECTED', 'BEETLE_REJECTED'] as const) {
      root.bus.subscribe(type, () => seen.push(type));
    }
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 0, gy: 3, tile: 'path' }));
    root.stepOnce();
    expect(seen).toEqual(['TILE_REJECTED']);
  });
});

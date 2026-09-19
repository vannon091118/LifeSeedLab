import { describe, it, expect } from 'vitest';
import { makeEvent, type EventPayloads, type EventType } from './events';
import { EVENT_AUDIENCE, FX_EVENT_TYPES, NOTICE_EVENT_TYPES, OBSERVED_EVENT_TYPES } from './eventAudience';
import { VisualObserver } from '../observers/visualObserver';
import { Camera } from '../render/camera';
import { noticeFromEvent, type NoticeReason } from '../components/fieldNotice';
import { rejectTextKey } from '../components/FieldToast';
import { translations } from '../i18n/translations';

// ── B29-Gate: „Wer hört zu?" ist eine Entscheidung, kein Zufall ─────────────
// Vorher stand die Subscription-Liste handgepflegt in der Runtime. Was dort fehlte, fehlte
// lautlos: TILE/BEETLE/FERTILIZE/PROPAGATE_REJECTED und COINS_GRANTED wurden emittiert und von
// niemandem gelesen. Dieser Test macht daraus eine Sperre:
//
//   1. JEDES Event des Kontrakts hat einen Registry-Eintrag mit Begründung (SAMPLES ist per Typ
//      erschöpfend — ein neues Event ohne Muster kompiliert nicht).
//   2. Jede `fx`-Zeile beweist behavioral, dass der VisualObserver wirklich Kommandos erzeugt
//      (und bei FX OFF keine) — statt es zu behaupten.
//   3. Jede `notice`-Zeile liefert für jeden ihrer Gründe einen Text in DE UND EN.
//
// Damit kann kein Event mehr „weder Consumer noch Entscheidung" sein.

/** Muster-Payload für jeden Event-Typ. Die Typannotation erzwingt Vollständigkeit. */
const SAMPLES: { [K in EventType]: EventPayloads[K] } = {
  DAY_STARTED: { cycle: 1 },
  NIGHT_STARTED: { cycle: 1 },
  LAYOUT_DONE: { tiles: 5 },
  WAVE_STARTED: { wave: 1, enemyCount: 4 },
  WAVE_COMPLETED: { wave: 1, reward: 25 },
  GAME_OVER: { wave: 3, score: 1200, reason: 'lives_depleted' as const },
  PLANT_PLACED: { plantId: 'p1', variantId: 'sprout', gx: 3, gy: 3 },
  PLANT_REMOVED: { plantId: 'p1' },
  PLANT_ATTACKED: { plantId: 'p1', targetId: 'e1' },
  PLANT_GROWN: { plantId: 'p1', variantId: 'sprout', gx: 3, gy: 3 },
  PLANT_FERTILIZED: { plantId: 'p1', variantId: 'sprout', count: 1 },
  PLANT_WEAKENED: { plantId: 'p1', variantId: 'sprout' },
  PLANT_WITHERED: { plantId: 'p1', variantId: 'sprout', gx: 3, gy: 3 },
  PLANT_PROPAGATED: { sourcePlantId: 'p1', plantId: 'p2', variantId: 'sprout', gx: 4, gy: 4 },
  PROJECTILE_FIRED: { projectileId: 'pr1', plantId: 'p1', targetId: 'e1', damage: 15, effectId: null },
  PROJECTILE_HIT: { projectileId: 'pr1', enemyId: 'e1', damage: 15, critical: false, px: 3.5, py: 3.5, effectId: 'EFFECT_BURN' },
  DAMAGE_DEALT: { enemyId: 'e1', amount: 15, critical: false, hp: 30, px: 3.5, py: 3.5 },
  CRITICAL_HIT: { enemyId: 'e1', amount: 30, px: 3.5, py: 3.5 },
  ENEMY_DIED: { enemyId: 'e1', px: 3.5, py: 3.5, reward: 12, killerPlantId: 'p1' },
  SCORE_CHANGED: { score: 120, delta: 10 },
  COMBO_CHANGED: { count: 3, multiplier: 1.5 },
  REWARD_GRANTED: { reward: 12, sourceId: 'e1' },
  PLACEMENT_REJECTED: { reason: 'on_path', gx: 3, gy: 3 },
  FERTILIZE_REJECTED: { plantId: 'p1', reason: 'not_growing' },
  PROPAGATE_REJECTED: { plantId: 'p1', reason: 'not_mature' },
  TILE_PLACED: { gx: 3, gy: 3, tile: 'boulder' },
  TILE_REJECTED: { gx: 0, gy: 3, tile: 'path', reason: 'out_of_world' },
  TILE_REMOVED: { gx: 0, gy: 3, tile: 'path' },
  ROUTE_CHANGED: { waypoints: 0, quality: null, blocked: true },
  MAP_EXPANDED: { gx: 1, gy: 1 },
  BEETLE_DEPLOYED: { beetleId: 'b1', name: 'Krabbler', px: 0.5, py: 3.5, spawnCount: 1 },
  BEETLE_DOWN: { beetleId: 'b1', px: 5.5, py: 3.5 },
  BEETLE_REJECTED: { reason: 'none_available' },
};

const sample = (type: EventType) => makeEvent(7, type, 'test:audience', 1, SAMPLES[type]);

describe('B29 — Event-Audience: jede Zeile ist entschieden', () => {
  it('jedes Event hat eine Einordnung mit Begründung', () => {
    for (const type of Object.keys(SAMPLES) as EventType[]) {
      const entry = EVENT_AUDIENCE[type];
      expect(entry, `Event ohne Registry-Eintrag: ${type}`).toBeDefined();
      expect(entry.audiences.length, `${type} hat keine Audience`).toBeGreaterThan(0);
      expect(entry.why.length, `${type} hat keine Begründung`).toBeGreaterThan(30);
    }
    // Die Registry ist nicht größer als der Kontrakt (kein Eintrag für ein Event, das es nicht gibt).
    expect(Object.keys(EVENT_AUDIENCE)).toHaveLength(Object.keys(SAMPLES).length);
  });

  it('FX- und Notice-Listen sind Ableitungen, keine Zweitlisten', () => {
    for (const type of FX_EVENT_TYPES) expect(EVENT_AUDIENCE[type].audiences).toContain('fx');
    for (const type of NOTICE_EVENT_TYPES) expect(EVENT_AUDIENCE[type].audiences).toContain('notice');
    expect(new Set(OBSERVED_EVENT_TYPES)).toEqual(new Set([...FX_EVENT_TYPES, ...NOTICE_EVENT_TYPES]));
    expect(FX_EVENT_TYPES.length).toBeGreaterThan(0);
  });

  it('jede fx-Zeile erzeugt wirklich Kommandos — und bei FX OFF keine', () => {
    for (const type of FX_EVENT_TYPES) {
      const on = new VisualObserver(new Camera(), true);
      on.observe(sample(type) as never);
      expect(on.pending, `${type} ist als 'fx' deklariert, erzeugt aber nichts`).toBeGreaterThan(0);

      const off = new VisualObserver(new Camera(), false);
      off.observe(sample(type) as never);
      expect(off.pending, `${type} erzeugt bei FX OFF Kommandos`).toBe(0);
    }
  });

  it('jede notice-Zeile liefert einen Grund, der ein Event ist (kein stiller Durchlauf)', () => {
    for (const type of NOTICE_EVENT_TYPES) {
      const notice = noticeFromEvent(sample(type));
      expect(notice, `${type} ist als 'notice' deklariert, erzeugt aber keine Meldung`).not.toBeNull();
      expect(notice!.tick).toBe(7);
    }
  });

  // „Reasons, die den Spieler nie erreichen" war der eigentliche Befund. Die Liste ist pro Event
  // typgeprüft: ein Grund, den es nicht gibt, kompiliert nicht — und jeder hier muss zweisprachig
  // existieren. TILE_REJECTED ist der Kernfall: die UI lehnt Tiles bewusst nicht vorab ab.
  it('jeder Ablehnungsgrund hat einen Text in DE und EN', () => {
    type NoticeKind = typeof NOTICE_KINDS[number];
    type ReasonOf<K extends EventType> = EventPayloads[K] extends { reason: infer R } ? R : never;
    const REASONS: { [K in NoticeKind]: readonly ReasonOf<K>[] } = {
      PLACEMENT_REJECTED: ['occupied', 'on_path', 'no_inventory'],
      // Alle Gründe aus `simulation/mapSystem.ts` — #4: `no_energy` ist gestorben, dafür
      // meldet die Integritätsregel `route_blocked`. Ohne Konsument stand der Spieler vor
      // einer stummen Ablehnung (kein Material, Bau-Grenzen, letzter freier Weg).
      TILE_REJECTED: ['unknown_tile', 'no_material', 'max_count', 'occupied_plant', 'out_of_world', 'max_size', 'not_expandable', 'already_buildable', 'on_path', 'route_blocked'],
      FERTILIZE_REJECTED: ['not_growing', 'max_reached', 'not_found'],
      PROPAGATE_REJECTED: ['not_mature', 'not_found', 'on_path', 'occupied'],
      BEETLE_REJECTED: ['already_deployed', 'none_available'],
      // M5: ROUTE_CHANGED trägt keinen `reason`-Text — der blocked-Fall (zugebauter Weg)
      // mappt in fieldNotice auf `route_blocked` (Text existiert zweisprachig, s. translations).
      ROUTE_CHANGED: [],
    };
    for (const [type, reasons] of Object.entries(REASONS)) {
      for (const reason of reasons) {
        const key = rejectTextKey(reason as NoticeReason);
        expect(translations.de[key], `${type}/${reason}: Text fehlt (DE)`).toBeTruthy();
        expect(translations.en[key], `${type}/${reason}: Text fehlt (EN)`).toBeTruthy();
      }
    }
    // Zusätzlich der UI-Restfall (kein Sim-Grund) — auch er muss sprechen.
    expect(translations.de[rejectTextKey('unknown')]).toBeTruthy();
    expect(translations.en[rejectTextKey('unknown')]).toBeTruthy();
  });

  it('Registry-Notice-Liste und geprüfte Event-Liste stimmen überein', () => {
    expect([...NOTICE_EVENT_TYPES].sort()).toEqual([...NOTICE_KINDS].sort());
  });
});

/** Die Ablehnungs-Events (plus M5-Route-Block), die der Spieler sehen muss. */
const NOTICE_KINDS = [
  'PLACEMENT_REJECTED', 'TILE_REJECTED', 'FERTILIZE_REJECTED', 'PROPAGATE_REJECTED', 'BEETLE_REJECTED',
  'ROUTE_CHANGED',
] as const;

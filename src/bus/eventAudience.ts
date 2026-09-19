// Owner: EventBusSystem (Contract-Metadaten). LOC ≤ 200. Keine Spielregeln, keine Runtime.
//
// B29 — Befund: die Event-Architektur war weiter als ihre Consumer. `FERTILIZE_REJECTED`,
// `PROPAGATE_REJECTED`, `TILE_REJECTED`, `BEETLE_REJECTED` und `COINS_GRANTED` wurden emittiert und
// von exakt niemandem gelesen: kein FX, kein Ton, kein Text. Der schlimmste Fall war TILE_REJECTED,
// weil `placementController` die Map-Regeln BEWUSST an die Sim delegiert ("das Regelwerk ist
// reicher als eine Zellenprüfung") — die Antwort kam an, nur nicht beim Spieler.
//
// Diese Datei ist die Entscheidung, festgeschrieben: JEDES Event des Kontrakts hat hier einen
// Eintrag. `fx` heißt "der VisualObserver erzeugt daraus Kommandos" (der Gate-Test beweist das,
// statt es zu behaupten), `notice` heißt "erreicht den Spieler als Text" — und `snapshot`/`internal`
// sind die ausdrückliche Erlaubnis, keinen Consumer zu haben, mit Begründung.
//
// Nicht hier: Subscriptions mit eigener Verantwortung (Nachtmodus am Renderer, Reifung nach
// WAVE_STARTED, Run-Ende nach GAME_OVER). Die hängen an genau einer Stelle in `render/gameRuntime.ts`
// und haben dort ihren Kommentar — die Registry besitzt nur die generische Beobachtung.

import type { EventType } from './events';

/** Wie ein Event seinen Konsumenten findet. */
export type EventAudience = 'fx' | 'notice' | 'snapshot' | 'internal';

export interface AudienceEntry {
  /**
   * Wer das Event konsumiert. Mehrfach möglich: `TILE_REJECTED` erzeugt Welt-FX UND Text.
   * Regeln: mindestens ein Eintrag; `fx` wird behavioral getestet (der Observer muss wirklich
   * Kommandos erzeugen), `notice` braucht für jeden seiner Gründe einen zweisprachigen Text.
   */
  audiences: readonly EventAudience[];
  /** Warum diese Einordnung — 1–2 Zeilen, damit die Entscheidung nachprüfbar bleibt. */
  why: string;
}

export const EVENT_AUDIENCE: Record<EventType, AudienceEntry> = {
  // ── Lebenszyklus: die Spieler-Momente des Laufs ──────────────────────────
  DAY_STARTED: {
    audiences: ['fx'],
    why: 'Tagwechsel: Sporen-Puls im Feld + Renderer-Tageslicht (eigener Subscribe-Pfad).',
  },
  NIGHT_STARTED: {
    audiences: ['fx'],
    why: 'Nacht: Manga-Text „NACHT …" + Sporen + Renderer-Nachtmodus.',
  },
  LAYOUT_DONE: {
    audiences: ['fx'],
    why: 'R1: Build-Sequenz verlassen — Wellenbanner-Vorbereitung + Aufbauhilfe-Fade.',
  },
  WAVE_STARTED: {
    audiences: ['fx'],
    why: 'Wellenbanner + Warnpuls; zusätzlich Reifungszähler (eigener Pfad, B17.4).',
  },
  WAVE_COMPLETED: {
    audiences: ['fx'],
    why: 'CLEAR-Banner, Bildschirmblitz und Blatt-Konfetti.',
  },
  GAME_OVER: {
    audiences: ['fx'],
    why: 'K.O.-Blitz, Kamera-Shake, Banner; das Run-Ende selbst hängt am eigenen Pfad.',
  },

  // ── Pflanzen: jeder Lebenslauf-Schritt hat eine sichtbare/spürbare Antwort ──
  PLANT_PLACED: { audiences: ['fx'], why: 'Einsetz-Bounce, Staubwolke, Platzier-Ton.' },
  PLANT_GROWN: { audiences: ['fx'], why: 'Reife: Glow steigt auf, Wachstums-Animation, Chime.' },
  PLANT_FERTILIZED: { audiences: ['fx'], why: 'Dünger-Puls auf der Entity + Blub-Ton.' },
  PLANT_WEAKENED: { audiences: ['fx'], why: 'Einsacken der Entity (negativer Punch) — sichtbar, kein Ton nötig.' },
  PLANT_WITHERED: { audiences: ['fx'], why: 'Papierstaub + Todes-Animation; die Haltbarkeitsleiste (B25) ergänzt.' },
  PLANT_PROPAGATED: { audiences: ['fx'], why: 'Sanfter Papierring am Setzling + Hum-Ton.' },
  PLANT_REMOVED: {
    audiences: ['snapshot'],
    why: 'Die Pflanze fällt im nächsten Frame aus dem State, der Rückerstattungsbetrag steht im '
      + 'Energie-Chip. Offen: der Betrag selbst ist nirgends ablesbar und `refund` hat keine '
      + 'Position im Payload — Kandidat für eine Zahl über der Zelle, sobald das Entfernen eine '
      + 'eigene Politur bekommt.',
  },
  PLANT_ATTACKED: {
    audiences: ['internal'],
    why: 'Wird direkt neben `PROJECTILE_FIRED` (identischer Tick) emittiert; dieselbe Tatsache trägt '
      + 'dort das Projektil-Event, an dem die Angriffs-Animation hängt (`plantId` + `targetId` sind '
      + 'dort ebenfalls vorhanden). Bleibt als Sim-Fakt für spätere Nicht-Projektil-Angriffe — '
      + 'Streichungs-Kandidat, sobald kein Nahkampf geplant ist.',
  },

  // ── Kampf ────────────────────────────────────────────────────────────────
  PROJECTILE_FIRED: { audiences: ['fx'], why: 'Angriffs-Animation der Pflanze + Schuss-Ton.' },
  PROJECTILE_HIT: { audiences: ['fx'], why: 'Einschlag-Burst, effektgefärbt (Burn/Eis/Gift/Kette).' },
  DAMAGE_DEALT: { audiences: ['fx'], why: 'Schadenszahl, Treffer-Punch, Impact-Ring.' },
  CRITICAL_HIT: { audiences: ['fx'], why: 'KRIT-Banner, Shake, Blitz, Sternen-Burst.' },
  ENEMY_DIED: { audiences: ['fx'], why: 'Todes-Puls, Belohnungszahl, Beute-Flug.' },

  // ── Wirtschaft: Zahlen, die der HUD aus dem State liest ──────────────────
  SCORE_CHANGED: { audiences: ['snapshot'], why: 'HUD liest `state.score` über `hudOf` — ein Event-Konsum wäre eine zweite Wahrheit.' },
  COMBO_CHANGED: { audiences: ['snapshot'], why: 'HUD liest `state.combo.count`; die Combo-FX hängen an den Treffern, nicht am Zähler.' },
  REWARD_GRANTED: { audiences: ['fx'], why: 'Belohnungs-Flug als Partikelbahn — sichtbar, obwohl der Betrag auch im Chip steht.' },

  // ── Ablehnungen: der Kern des Befunds — jede erreicht den Spieler ────────
  PLACEMENT_REJECTED: {
    audiences: ['fx', 'notice'],
    why: 'Rote Welle an der Zelle + Grund-Text. Kommt aus der Sim (selten) UND aus der UI-Vorprüfung '
      + '(der häufigste Fall, dort ohne Command).',
  },
  TILE_REJECTED: {
    audiences: ['fx', 'notice'],
    why: 'Die UI lehnt Tiles bewusst NICHT vorab ab (Baubereich, Korridor, maxCount sind Map-Wissen) — '
      + 'ohne Konsument zahlte der Spieler Energie und es passierte sichtbar nichts. Jetzt: rote Welle '
      + 'an der Zelle + alle sieben Gründe als Text.',
  },
  FERTILIZE_REJECTED: {
    audiences: ['fx', 'notice'],
    why: 'Spieler-ausgelöste Aktion an einer Pflanze: Rückstoß-Animation der Entity + Grund. Der '
      + 'Command-Pfad existiert in der Sim (Command noch ohne UI-Knopf), die Ablehnung darf nicht '
      + 'stumm bleiben.',
  },
  PROPAGATE_REJECTED: {
    audiences: ['fx', 'notice'],
    why: 'Wie FERTILIZE: Vermehrung wird von der Sim entschieden (reif/frei/Nicht-Weg), die Antwort '
      + 'geht an Entity und Text.',
  },
  BEETLE_REJECTED: {
    audiences: ['notice'],
    why: 'Nur Text, ausdrücklich kein Welt-FX: der Knopf sitzt im HUD und die Ursache ist HUD-Wissen '
      + '(kein Tier im Lager, schon draußen, zu wenig Energie — letzteres ist der einzige Fall, der '
      + 'den deaktivierten Knopf passiert). Ein Puls am Pfadkopf würde eine Weltursache suggerieren, '
      + 'die es nicht gibt; das Payload trägt keine Position.',
  },

  // ── Karte ────────────────────────────────────────────────────────────────
  TILE_PLACED: {
    audiences: ['snapshot'],
    why: 'Der Bau erscheint im nächsten Frame aus `state.mapTiles`, die Kosten zeigt der Energie-Chip. '
      + 'Offen: der Bau selbst hat keinen Moment (kein Ton, kein Staub) — Kandidat für die Karten-Politur.',
  },
  TILE_REMOVED: {
    audiences: ['snapshot'],
    why: 'Juggling-Verkauf: die Zelle wird frei und die Route kippt mid-Welle (Gegner drehen um). '
      + 'Refund zeigt der Energie-Chip; der Moment (Verkaufs-FX) ist Karten-Politur-Kandidat.',
  },
  ROUTE_CHANGED: {
    audiences: ['notice'],
    why: 'M5: der blocked-Fall (zugebauter Laufweg) muss den Spieler erreichen — ohne Text lief '
      + 'der Fallback-Pfad stillschweigend durch Wände. Der Renderer zeichnet den Weg weiter aus dem '
      + 'State (snapshot-lesend), die Meldung ist der einzige Event-Konsum.',
  },
  MAP_EXPANDED: { audiences: ['snapshot'], why: 'Die neue Fläche kommt aus dem State; Kosten im Energie-Chip.' },

  // ── Käfer (P6) ───────────────────────────────────────────────────────────
  BEETLE_DEPLOYED: { audiences: ['fx'], why: 'Bernstein-Ring am Pfadkopf, Namensbanner, Zap-Ton.' },
  BEETLE_DOWN: { audiences: ['fx'], why: 'Tusche-Fleck zerfällt — bedrohlich, nicht pflanzlich.' },

  // ── Economy (B36: Nachkauf im Lauf) ─────────────────────────────────────
  BUY_REJECTED: { audiences: ['notice'], why: 'Nachkauf-Knopf im Tray: ohne Text wäre ein verweigerter Kauf ein '
      + 'stiller Energie-Verlust oder ein toter Knopf — der Grund muss ankommen.' },
  PLANT_BOUGHT: { audiences: ['snapshot'], why: 'Inventar zählt über den State; ein Frame-FX würde vom Platzieren verdeckt.' },
};

const typesWith = (a: EventAudience): EventType[] =>
  Object.entries(EVENT_AUDIENCE).filter(([, e]) => e.audiences.includes(a)).map(([type]) => type) as EventType[];

/** Events, deren Kommandos der VisualObserver erzeugt — treibt die FX-Schleife der Runtime. */
export const FX_EVENT_TYPES = typesWith('fx');

/** Ablehnungen, die der Spieler als Text sehen muss — treibt den Notice-Kanal der Runtime. */
export const NOTICE_EVENT_TYPES = typesWith('notice');

/**
 * Alles, was überhaupt einen Konsumenten hat (FX oder Text) — der Ton hört auf diesen Vorrat.
 * Welche Töne existieren, entscheidet `AudioObserver` in seinem eigenen Mapping: dieses ist die
 * Wahrheit für Klang, die Registry die Wahrheit für Sichtbarkeit. Zwei Listen wären zwei Wahrheiten.
 */
export const OBSERVED_EVENT_TYPES = [...new Set([...FX_EVENT_TYPES, ...NOTICE_EVENT_TYPES])];

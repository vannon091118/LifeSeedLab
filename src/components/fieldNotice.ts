// Owner: UI-Adapter (Event → Feldmeldung). LOC ≤ 200.
//
// B29 — Befund: die Sim entscheidet Ablehnungen (Tiles bewusst, weil das Map-Regelwerk reicher ist
// als eine Zellenprüfung; Befruchtung/Vermehrung, weil der Zustand der Pflanze in der Sim liegt) —
// aber kein Event erreichte den Spieler. Der Grund stand im Payload, nur nie auf dem Schirm.
//
// Diese Datei ist NUR die Übersetzung Event → Meldung. Kein zweites Regelwerk, keine Gameplay-
// Entscheidung: der Grund kommt aus dem Payload, die Zeitbasis ist der Sim-Tick. Welcher Text zu
// einem Grund gehört, besitzt `FieldToast` (reason ⇄ i18n) — dort erzwungen erschöpfend, damit ein
// neuer Grund ohne Text ein Compile-Fehler ist.
//
// Die Menge der Events ist `bus/eventAudience.NOTICE_EVENT_TYPES` (dort mit Begründung); die
// Zuweisung unten ist per `switch` über den `EventType` erschöpfungsgeprüft gepflegt.

import type { GameEvent, RejectReason } from '../bus/events';

/**
 * Grund einer Meldung. `unknown` ist kein Ablehnungsgrund der Sim, sondern der Restfall der
 * UI-Vorprüfung („hier geht gerade nichts, und ich weiß nicht, warum") — er muss trotzdem einen
 * Text haben, deshalb steht er im selben Vokabular.
 */
export type NoticeReason = RejectReason | 'unknown';

export interface FieldNotice {
  reason: NoticeReason;
  /** Sim-Tick der Meldung — Anzeigedauer, keine Spielregel (wie `Rejection` im Controller). */
  tick: number;
}

/**
 * Ablehnungs-Event → Meldung für den Spieler, oder `null` für alles andere.
 *
 * `BEETLE_REJECTED` trägt keinen Ort, `FERTILIZE/PROPAGATE_REJECTED` nur die Entity — deshalb ist
 * `FieldNotice` ortsfrei: der Text steht mittig im Feld, unabhängig davon, wo der Grund entstand.
 */
export function noticeFromEvent(e: GameEvent): FieldNotice | null {
  switch (e.type) {
    case 'PLACEMENT_REJECTED':
    case 'TILE_REJECTED':
    case 'FERTILIZE_REJECTED':
    case 'PROPAGATE_REJECTED':
    case 'BEETLE_REJECTED':
      return { reason: e.payload.reason, tick: e.tick };
    default:
      return null;
  }
}

// Owner: UI (Feld-Rückmeldung). LOC ≤ 400.
// Befund beider Spielerberichte: „bei ungültigem Platzieren oder zu wenig Energie passierte
// sichtbar nichts — kein Grund, kein rotes Signal". Der Aufwand war nie das Problem: der
// PlacementController kennt den Grund längst (`rejection.reason`), er wurde nur nie gezeigt.
//
// Hier steht deshalb NUR die Übersetzung Grund → Text und die Anzeige. Kein zweites Regelwerk:
// die Gründe kommen aus `simulation/placementRules` (dieselbe Wahrheit wie Sim und Vorschau).

import type { CSSProperties } from 'react';
import { useI18n, type TranslationKey } from '../i18n';
import type { FieldNotice, NoticeReason } from './fieldNotice';

/** Lebensdauer der Meldung in Sim-Ticks (4 s bei 30 tps) — Anzeige, keine Spielregel. */
export const TOAST_TICKS = 120;

/** Eigene Ecke des Toasts: oben rechts, unter dem ✕-Knopf (top ~54) — Tray (unten mittig),
 *  Erst-Hinweis (bottom 84, mittig) und Tutorial-Blase (Seiten) bleiben unberührt. Keine zweite
 *  absolute Fläche teilt sich diesen Streifen (DevPanel ist DevGate-only), also nie übereck. */
const TOAST_TOP = 56;
const TOAST_RIGHT = 10;

/**
 * Grund ⇒ i18n-Schlüssel, erschöpfend über das GESAMTE Ablehnungs-Vokabular (`RejectReason` aus
 * dem Bus-Kontrakt, nicht mehr nur die UI-Gründe). Der Typ macht daraus eine Sperre: ein neuer
 * Grund — etwa ein achtes TILE_REJECTED — ohne Text ist ein Compile-Fehler, kein stiller Fallback
 * auf „Hier lässt sich gerade nichts setzen." (B29).
 *
 * `no_material` (Feld) und `no_inventory` (Pflanze) sind EIGENE Texte: das Feld hat einen Pool
 * (der im Shop nachgekauft wird), die Pflanze kommt aus dem Loadout — der Unterschied ist spielbar.
 */
const REASON_KEY: Record<NoticeReason, TranslationKey> = {
  // Platzierung
  occupied: 'field.reject.occupied',
  on_path: 'field.reject.on_path', // EIN Text für Pflanze UND blockierendes Tile (B33)
  no_inventory: 'field.reject.no_inventory',
  no_material: 'field.reject.no_material',
  // Vegetation
  not_growing: 'field.reject.not_growing',
  max_reached: 'field.reject.max_reached',
  not_mature: 'field.reject.not_mature',
  not_found: 'field.reject.not_found',
  // Karte
  unknown_tile: 'field.reject.unknown_tile',
  max_count: 'field.reject.max_count',
  occupied_plant: 'field.reject.occupied_plant',
  not_expandable: 'field.reject.not_expandable',
  already_buildable: 'field.reject.already_buildable',
  // R2-Neubau: out_of_world = außerhalb der freigeschalteten Weltfläche
  out_of_world: 'field.reject.out_of_world',
  max_size: 'field.reject.max_size',
  // Brutling
  already_deployed: 'field.reject.already_deployed',
  none_available: 'field.reject.none_available',
  // M5: Route zugebaut — Fallback läuft, aber sichtbar
  route_blocked: 'field.reject.route_blocked',
  // Restfall der UI-Vorprüfung (kein Sim-Grund)
  unknown: 'field.reject.unknown',
};

/** Grund ⇒ i18n-Schlüssel. Erschöpfend, ohne Fallback: die Zuordnung IST der Vertrag. */
export function rejectTextKey(reason: NoticeReason): TranslationKey {
  return REASON_KEY[reason];
}

/** true ⇒ die Meldung ist noch gültig (Zeitbasis ist der Sim-Tick, nicht die Wanduhr). */
export function toastVisible(notice: FieldNotice | null, tick: number): boolean {
  if (!notice) return false;
  const age = tick - notice.tick;
  // Ein zurückgesetzter Tick (neuer Run) darf die Meldung nicht ewig stehen lassen.
  return age >= 0 && age < TOAST_TICKS;
}

export function FieldToast({ notice, tick }: { notice: FieldNotice | null; tick: number }) {
  const { t } = useI18n();
  if (!toastVisible(notice, tick)) return null;
  return (
    <div className="field-toast" style={styles.toast} role="status" data-field-toast={notice!.reason}>
      <span style={styles.mark} aria-hidden>!</span>
      {t(rejectTextKey(notice!.reason))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  toast: {
    position: 'absolute',
    top: TOAST_TOP,
    right: TOAST_RIGHT,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    background: '#fbf6e9',
    border: '2px solid var(--danger)',
    borderRadius: 8,
    boxShadow: '3px 3px 0 var(--ink)',
    color: 'var(--ink)',
    fontSize: 13,
    fontWeight: 800,
    maxWidth: '72%',
    pointerEvents: 'none',
    zIndex: 4,
  },
  mark: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    flexShrink: 0,
    borderRadius: '50%',
    background: 'var(--danger)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 900,
    lineHeight: 1,
  },
};

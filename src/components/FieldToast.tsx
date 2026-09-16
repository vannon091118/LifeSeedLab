// Owner: UI (Feld-Rückmeldung). LOC ≤ 400.
// Befund beider Spielerberichte: „bei ungültigem Platzieren oder zu wenig Energie passierte
// sichtbar nichts — kein Grund, kein rotes Signal". Der Aufwand war nie das Problem: der
// PlacementController kennt den Grund längst (`rejection.reason`), er wurde nur nie gezeigt.
//
// Hier steht deshalb NUR die Übersetzung Grund → Text und die Anzeige. Kein zweites Regelwerk:
// die Gründe kommen aus `simulation/placementRules` (dieselbe Wahrheit wie Sim und Vorschau).

import type { CSSProperties } from 'react';
import { useI18n, type TranslationKey } from '../i18n';
import type { Rejection, UiRejectReason } from './placementController';

/** Lebensdauer der Meldung in Sim-Ticks (4 s bei 30 tps) — Anzeige, keine Spielregel. */
export const TOAST_TICKS = 120;

const REASON_KEY: Record<UiRejectReason, TranslationKey> = {
  occupied: 'field.reject.occupied',
  on_path: 'field.reject.on_path',
  no_inventory: 'field.reject.no_inventory',
  no_energy: 'field.reject.no_energy',
  no_energy_tile: 'field.reject.no_energy_tile',
  unknown: 'field.reject.unknown',
};

/** Grund ⇒ i18n-Schlüssel. Exportiert, damit der Vertrag ohne DOM testbar bleibt. */
export function rejectTextKey(reason: UiRejectReason): TranslationKey {
  return REASON_KEY[reason] ?? 'field.reject.unknown';
}

/** true ⇒ die Meldung ist noch gültig (Zeitbasis ist der Sim-Tick, nicht die Wanduhr). */
export function toastVisible(rejection: Rejection | null, tick: number): boolean {
  if (!rejection) return false;
  const age = tick - rejection.tick;
  // Ein zurückgesetzter Tick (neuer Run) darf die Meldung nicht ewig stehen lassen.
  return age >= 0 && age < TOAST_TICKS;
}

export function FieldToast({ rejection, tick }: { rejection: Rejection | null; tick: number }) {
  const { t } = useI18n();
  if (!toastVisible(rejection, tick)) return null;
  return (
    <div className="field-toast" style={styles.toast} role="status" data-field-toast={rejection!.reason}>
      <span style={styles.mark} aria-hidden>!</span>
      {t(rejectTextKey(rejection!.reason))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  toast: {
    position: 'absolute',
    left: '50%',
    bottom: 120,
    transform: 'translateX(-50%)',
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
    maxWidth: '86%',
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

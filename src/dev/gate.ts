// Owner: DevGate (presentation only). LOC ≤ 200.
// Kein Gameplay-Schreibrecht, nur Sichtbarkeit (AGENTS: DevGate ?dev=1).
// Reine Funktion für Testbarkeit; window-Ableitung nur über isDevActive().

export function isDevMode(search: string, hash: string): boolean {
  // ?dev=1  (AGENTS), auch ?dev, #dev, #dev=1, ?debug=1 toleriert
  const params = new URLSearchParams(search);
  if (params.get('dev') === '1' || params.get('dev') === '' || params.has('dev')) return true;
  if (params.get('debug') === '1') return true;
  const h = (hash || '').toLowerCase();
  if (h.includes('dev')) return true;
  return false;
}

export function isDevActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return isDevMode(window.location.search, window.location.hash);
  } catch {
    return false;
  }
}

/**
 * B21: Sichtbarkeit des Onboardings (Krix-Tutorial).
 *
 * Das DevGate ist ein Werkzeug: wer mit `?dev=1` arbeitet, will nicht bei jedem Run durch die
 * acht Feldnotizen — das Onboarding startet dort **nicht** automatisch. Zwei ausdrückliche
 * Parameter überstimmen das: `tutorial=1` erzwingt es (so läuft der E2E-Beweis hinter dem Gate)
 * und `tutorial=0` unterdrückt es (z. B. für eine schnelle Messung ohne Gate).
 *
 * Die Release-Fläche (kein DevGate) zeigt es automatisch — der DevGate-Zustand ist die einzige
 * Abweichung, kein zweiter Zustandsspeicher.
 */
export function onboardingAutoStart(search: string, hash: string): boolean {
  const forced = new URLSearchParams(search).get('tutorial');
  if (forced === '1') return true;
  if (forced === '0') return false;
  return !isDevMode(search, hash);
}

export function isOnboardingAutoStart(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return onboardingAutoStart(window.location.search, window.location.hash);
  } catch {
    return false;
  }
}

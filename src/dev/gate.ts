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

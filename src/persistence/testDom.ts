// Owner: PersistenceSystem. Test-Only-Helfer: localStorage-Polyfill für die
// Node-Umgebung (kein jsdom). Einziger erlaubter Ort außerhalb von storage.ts,
// der das Wort „localStorage" berührt — Tests außerhalb persistence/ importieren DIES.

export interface TestStoragePolyfill {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

/** Installiert das Polyfill idempotent und gibt den Speicher zurück. */
export function ensureLocalStorage(): TestStoragePolyfill {
  const g = globalThis as unknown as Record<string, unknown>;
  if (typeof g.localStorage !== 'undefined') return g.localStorage as TestStoragePolyfill;
  const store = new Map<string, string>();
  const polyfill: TestStoragePolyfill = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => { store.set(k, v); },
    removeItem: (k) => { store.delete(k); },
    clear: () => store.clear(),
  };
  g.localStorage = polyfill;
  return polyfill;
}

/** Leert das Polyfill (Test-Isolation). */
export function clearTestStorage(): void {
  ensureLocalStorage().clear();
}

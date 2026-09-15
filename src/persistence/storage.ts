// Owner: PersistenceSystem (storage). LOC ≤ 250.
// EIN Speicher-Owner: versionierte Saves + Migrationskette + FNV-Checksumme +
// Quarantäne bei Korruption. meta.ts/runSave.ts sind nur Schema-Adapter (QUALITY_SPEC B2).

const CHECKSUM_SEP = '|';

function fnv1a(str: string): number {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface StoreOptions<T> {
  version: number;
  /** Ordered migration chain: (oldRaw, oldVersion) → new shape. Ascending applied. */
  migrate?: (raw: unknown, fromVersion: number) => T | null;
  /** Defaults on missing/quarantined data. */
  fallback: () => T;
  /** Backend: 'local' (sync, meta) or 'idb' (async, run snapshots). Default local. */
  backend?: 'local' | 'idb';
}

interface Envelope {
  v: number;
  checksum: number;
  data: unknown;
}

function encode<T>(value: T, version: number): string {
  const data = JSON.stringify(value);
  const envelope: Envelope = { v: version, checksum: fnv1a(data), data: JSON.parse(data) };
  return JSON.stringify(envelope);
}

function quarantine(key: string, raw: string): void {
  try { localStorage.setItem(`${key}.corrupt`, raw); } catch { /* ignore */ }
}

// ── localStorage backend (sync — meta) ───────────────────────
export function load<T>(key: string, opts: StoreOptions<T>): T {
  let raw: string | null = null;
  try { raw = localStorage.getItem(key); } catch { return opts.fallback(); }
  if (!raw) return opts.fallback();

  let env: Envelope;
  try { env = JSON.parse(raw) as Envelope; } catch {
    quarantine(key, raw);
    return opts.fallback();
  }
  if (typeof env.v !== 'number' || typeof env.checksum !== 'number' || env.data == null) {
    quarantine(key, raw);
    return opts.fallback();
  }

  const serialized = JSON.stringify(env.data);
  if (fnv1a(serialized) !== env.checksum) {
    // integrity failure → quarantine, never trust partial data
    quarantine(key, raw);
    return opts.fallback();
  }

  if (env.v === opts.version) return env.data as T;
  if (env.v > opts.version) return opts.fallback(); // newer save (downgrade) → defaults
  if (!opts.migrate) return opts.fallback();

  const migrated = opts.migrate(env.data, env.v);
  if (migrated === null) {
    quarantine(key, raw);
    return opts.fallback();
  }
  save(key, migrated, opts.version);
  return migrated;
}

export function save<T>(key: string, value: T, version: number): void {
  try { localStorage.setItem(key, encode(value, version)); } catch { /* full/private mode */ }
}

export function remove(key: string): void {
  try { localStorage.removeItem(key); localStorage.removeItem(`${key}.corrupt`); } catch { /* ignore */ }
}

// ── IndexedDB backend (async — run snapshots, ARCHITECTURE.md §4) ──
const IDB_NAME = 'lifegamelab';
const IDB_STORE = 'runs';

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

export async function idbSet(key: string, value: unknown, version: number): Promise<void> {
  try {
    const db = await openIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(encode(value, version), key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* storage unavailable — skip */ }
}

export async function idbGet<T>(key: string, opts: StoreOptions<T>): Promise<T> {
  try {
    const db = await openIdb();
    const raw = await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result as string | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!raw) return opts.fallback();

    // PARITÄT zum localStorage-Backend (Contract: EIN Integritätsvertrag):
    // parse-fail / Envelope-Defekt / Checksum-Mismatch → Quarantäne + fallback.
    let env: Envelope;
    try { env = JSON.parse(raw) as Envelope; } catch {
      quarantine(key, raw);
      return opts.fallback();
    }
    if (typeof env.v !== 'number' || typeof env.checksum !== 'number' || env.data == null) {
      quarantine(key, raw);
      return opts.fallback();
    }
    if (fnv1a(JSON.stringify(env.data)) !== env.checksum) {
      quarantine(key, raw);
      return opts.fallback();
    }

    if (env.v === opts.version) return env.data as T;
    if (env.v > opts.version) return opts.fallback(); // newer save (downgrade) → defaults
    if (!opts.migrate) return opts.fallback();
    const migrated = opts.migrate(env.data, env.v);
    if (migrated === null) {
      quarantine(key, raw);
      return opts.fallback();
    }
    await idbSet(key, migrated, opts.version);
    return migrated;
  } catch {
    return opts.fallback();
  }
}

export async function idbRemove(key: string): Promise<void> {
  try {
    const db = await openIdb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch { /* ignore */ }
}

export const STORAGE_CHECKSUM_SEP = CHECKSUM_SEP;

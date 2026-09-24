// Owner: PersistenceSystem (storage). LOC ≤ 250.
// EIN Speicher-Owner: versionierte Saves + Migrationskette + FNV-Checksumme +
// Quarantäne bei Korruption. meta.ts/runSave.ts sind nur Schema-Adapter (QUALITY_SPEC B2).

function fnv1a(str: string): number {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface StoreOptions<T> {
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

export type WriteResult = { status: 'written' } | { status: 'skipped' } | { status: 'failed'; error?: unknown };
export type LoadResult<T> =
  | { status: 'valid'; value: T }
  | { status: 'missing' }
  | { status: 'corrupt' }
  | { status: 'failed'; error?: unknown };

/**
 * Kanonische Serialisierung: Objekt-Keys sortiert, Array-Reihenfolge bleibt (sie ist fachlich).
 * Die Integritätsprüfung muss am INHALT hängen, nicht an der Darstellung — sonst quarantäniert
 * jede Umsortierung von Keys ein gültiges Save (A13.5/B14.6).
 */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

/**
 * Integritätsvertrag: kanonische Checksumme. Die reine `JSON.stringify`-Reihenfolge wird weiter
 * akzeptiert, damit Bestands-Saves lesbar bleiben; beim nächsten Schreiben werden sie kanonisiert.
 */
function checksumMatches(env: Envelope): boolean {
  if (fnv1a(canonicalJson(env.data)) === env.checksum) return true;
  return fnv1a(JSON.stringify(env.data)) === env.checksum;
}

function encode<T>(value: T, version: number): string {
  const data = JSON.parse(JSON.stringify(value)) as T;
  const envelope: Envelope = { v: version, checksum: fnv1a(canonicalJson(data)), data };
  return JSON.stringify(envelope);
}

function quarantine(key: string, raw: string): void {
  try { localStorage.setItem(`${key}.corrupt`, raw); } catch { /* ignore */ }
}

/**
 * A18.4: Envelope-Validierung existierte doppelt (load + idbGet, ~15 Zeilen je Stelle).
 * Eine Wahrheit: parse/Defekt/Checksum ⇒ Quarantäne + null; sonst der Envelope.
 */
function isEnvelope(value: unknown): value is Envelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { v?: unknown; checksum?: unknown; data?: unknown };
  return typeof candidate.v === 'number' && typeof candidate.checksum === 'number' && candidate.data != null;
}

function validateEnvelope(raw: string, key: string): Envelope | null {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch {
    quarantine(key, raw);
    return null;
  }
  if (!isEnvelope(parsed)) {
    quarantine(key, raw);
    return null;
  }
  const env = parsed;
  if (!checksumMatches(env)) {
    // integrity failure → quarantine, never trust partial data
    quarantine(key, raw);
    return null;
  }
  return env;
}

/**
 * A18.4: Version-Differenz mit EINER Regel: **unter** uns → migrieren, **über** uns →
 * Quarantäne. Vorher kehrte ein Downgrade (env.v > version) still zum Fallback zurück —
 * das nächste save() hätte dann das NEUERE Save überschrieben. Die Quarantäne erhält
 * die Rohdaten unter `<key>.corrupt` (bewusst localStorage: klein, überall verfügbar;
 * Run-Snapshots sind groß — sie werden hier gar nicht erst hingeschrieben, s. u.).
 */
function resolveVersion<T>(key: string, env: Envelope, raw: string, opts: StoreOptions<T>, writeBack: (migrated: T) => void): T {
  if (env.v === opts.version) return env.data as T;
  if (env.v > opts.version) {
    // newer save (downgrade) → NOT silent defaults; preserve the newer data
    quarantine(key, raw);
    return opts.fallback();
  }
  if (!opts.migrate) return opts.fallback();
  const migrated = opts.migrate(env.data, env.v);
  if (migrated === null) {
    quarantine(key, raw);
    return opts.fallback();
  }
  writeBack(migrated);
  return migrated;
}

// ── localStorage backend (sync — meta) ───────────────────────
export function loadResult<T>(key: string, opts: StoreOptions<T>): LoadResult<T> {
  let raw: string | null;
  try { raw = localStorage.getItem(key); } catch (error) { return { status: 'failed', error }; }
  if (!raw) return { status: 'missing' };

  const env = validateEnvelope(raw, key);
  if (!env) return { status: 'corrupt' };
  try {
    if (env.v === opts.version) return { status: 'valid', value: env.data as T };
    if (env.v > opts.version) { quarantine(key, raw); return { status: 'corrupt' }; }
    if (!opts.migrate) { quarantine(key, raw); return { status: 'corrupt' }; }
    const migrated = opts.migrate(env.data, env.v);
    if (migrated === null) { quarantine(key, raw); return { status: 'corrupt' }; }
    const write = save(key, migrated, opts.version);
    return write.status === 'written' ? { status: 'valid', value: migrated } : { status: 'failed', ...('error' in write ? { error: write.error } : {}) };
  } catch (error) {
    return { status: 'failed', error };
  }
}

export function load<T>(key: string, opts: StoreOptions<T>): T {
  const result = loadResult(key, opts);
  return result.status === 'valid' ? result.value : opts.fallback();
}

export function save<T>(key: string, value: T, version: number): WriteResult {
  try { localStorage.setItem(key, encode(value, version)); return { status: 'written' }; }
  catch (error) { return { status: 'failed', error }; }
}

export function remove(key: string): void {
  try { localStorage.removeItem(key); localStorage.removeItem(`${key}.corrupt`); } catch { /* ignore */ }
}

// ── IndexedDB backend (async — run snapshots, ARCHITECTURE.md §4) ──
// A18.4 (bewusst, NICHT bereinigen): der Name `lifegamelab` ist Legacy-Branding —
// eine Umbenennung würde bestehende Run-Snapshots verwaisen. Ein neuer Name wäre
// KEINE Migration, sondern Datenverlust.
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

export async function idbSet(key: string, value: unknown, version: number): Promise<WriteResult> {
  try {
    const db = await openIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(encode(value, version), key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return { status: 'written' };
  } catch (error) {
    return { status: 'failed', error };
  }
}

export async function idbGetResult<T>(key: string, opts: StoreOptions<T>): Promise<LoadResult<T>> {
  let db: IDBDatabase | undefined;
  let raw: string | undefined;
  try {
    db = await openIdb();
    raw = await new Promise<string | undefined>((resolve, reject) => {
      const tx = db!.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result as string | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    return { status: 'failed', error };
  } finally {
    if (db) db.close();
  }
  if (!raw) return { status: 'missing' };
  const env = validateEnvelope(raw, key);
  if (!env) return { status: 'corrupt' };
  if (env.v === opts.version) return { status: 'valid', value: env.data as T };
  if (env.v > opts.version) { quarantine(key, raw); return { status: 'corrupt' }; }
  if (!opts.migrate) { quarantine(key, raw); return { status: 'corrupt' }; }
  const migrated = opts.migrate(env.data, env.v);
  if (migrated === null) { quarantine(key, raw); return { status: 'corrupt' }; }
  const write = await idbSet(key, migrated, opts.version);
  return write.status === 'written' ? { status: 'valid', value: migrated } : { status: 'failed', ...('error' in write ? { error: write.error } : {}) };
}

export async function idbGet<T>(key: string, opts: StoreOptions<T>): Promise<T> {
  const result = await idbGetResult(key, opts);
  return result.status === 'valid' ? result.value : opts.fallback();
}

export async function idbRemove(key: string): Promise<WriteResult> {
  try {
    const db = await openIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return { status: 'written' };
  } catch (error) {
    return { status: 'failed', error };
  }
}

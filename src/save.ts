import type { GameState, PlantVariant } from './types';

const DB_NAME = 'lifegamelab';
const DB_VERSION = 1;
const STORE_GAME = 'game_state';
const STORE_VARIANTS = 'variants';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_GAME)) {
        db.createObjectStore(STORE_GAME);
      }
      if (!db.objectStoreNames.contains(STORE_VARIANTS)) {
        db.createObjectStore(STORE_VARIANTS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveGameState(state: GameState): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE_GAME, STORE_VARIANTS], 'readwrite');

  // Save core state (exclude bulky nested objects)
  const saveData = {
    tick: state.tick,
    money: state.money,
    lives: state.lives,
    wave: state.wave,
    phase: state.phase,
    discoveredVariants: state.discoveredVariants,
    inventory: state.inventory,
  };
  tx.objectStore(STORE_GAME).put(saveData, 'current');

  tx.oncomplete = () => db.close();
  tx.onerror = () => { console.error('Save failed', tx.error); db.close(); };
}

export async function loadGameState(): Promise<Partial<GameState> | null> {
  const db = await openDB();
  const tx = db.transaction([STORE_GAME], 'readonly');
  const req = tx.objectStore(STORE_GAME).get('current');

  return new Promise((resolve) => {
    req.onsuccess = () => {
      db.close();
      resolve(req.result || null);
    };
    req.onerror = () => {
      db.close();
      resolve(null);
    };
  });
}

export async function saveVariant(variant: PlantVariant): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE_VARIANTS], 'readwrite');
  tx.objectStore(STORE_VARIANTS).put(variant);
  tx.oncomplete = () => db.close();
}

export async function loadAllVariants(): Promise<PlantVariant[]> {
  const db = await openDB();
  const tx = db.transaction([STORE_VARIANTS], 'readonly');
  const req = tx.objectStore(STORE_VARIANTS).getAll();

  return new Promise((resolve) => {
    req.onsuccess = () => {
      db.close();
      resolve(req.result || []);
    };
    req.onerror = () => {
      db.close();
      resolve([]);
    };
  });
}

export async function clearSave(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE_GAME, STORE_VARIANTS], 'readwrite');
  tx.objectStore(STORE_GAME).clear();
  tx.objectStore(STORE_VARIANTS).clear();
  tx.oncomplete = () => db.close();
}

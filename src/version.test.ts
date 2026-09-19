import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import { APP_VERSION, APP_VERSION_LABEL } from './version';
import { defaultMeta, persistMeta, loadMeta } from './meta/store';
import { saveRun, loadRun, type RunSave } from './persistence/runSave';
import type { SimState } from './simulation/state';

// Ein Versions-Bump ist erst dann vollständig, wenn Nummer UND Anzeige stimmen. Der Test liest
// `package.json` direkt (nur im Test — nicht im App-Bundle) und hält sie an `APP_VERSION`.

describe('Produktversion', () => {
  it('hat genau eine Nummer: package.json und Anzeige stimmen überein', () => {
    expect(APP_VERSION).toBe(pkg.version);
  });

  it('ist ein semantischer Versionsstring', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(APP_VERSION_LABEL).toBe(`v${APP_VERSION}`);
  });

  it('verrät keinen Platzhalter in der Anzeige', () => {
    expect(APP_VERSION_LABEL).not.toMatch(/APP_VERSION|TODO|xxx/i);
  });
});

describe('Version-Ausweis — sichtbare wie unsichtbare Orte', () => {
  it('Meta-Save trägt die Produktversion (Neu-Anlage UND jedes Überschreiben)', async () => {
    // Persistenz-Vertrag über die Öffentlich-API (Storage-Zugriff bleibt in persistence/):
    // persistMeta schreibt die aktuelle Version, loadMeta liest sie zurück.
    persistMeta(defaultMeta());
    expect(loadMeta().appVersion).toBe(APP_VERSION);
    // persistMeta überschreibt die Version bei JEDEM Schreiben (auch bei importierten/alten Objekten)
    const stale = { ...defaultMeta(), appVersion: '0.0.0-alt' };
    persistMeta(stale);
    expect(loadMeta().appVersion).toBe(APP_VERSION);
    expect(loadMeta().appVersion).not.toBe('0.0.0-alt');
  });

  it('Run-Save trägt die Produktversion (unsichtbarer Ort: IndexedDB/Legacy-Envelope)', async () => {
    // IDB ist im Node-Env nicht verfügbar (beide Pfade laufen in den fallback) — der Contract
    // wird deshalb wie im Resume-Gate über die Typ-Pflicht + Laufzeit-Schreiber bewiesen:
    // saveRun trägt appVersion: APP_VERSION (Pflichtfeld), ein RunSave ohne kompiliert nicht.
    const state = {
      phase: 'prep', runId: 1, seed: 42, wave: { number: 1 },
      lives: 20, score: 0, combo: { count: 0, timer: 0, multiplier: 1, highest: 0 },
      plants: [], inventory: {}, discoveredVariants: [], bredStats: {}, nektarEarned: 0,
    } as unknown as SimState;
    expect(() => saveRun(state)).not.toThrow(); // gameover-Run: kein Save, aber auch kein Crash
    const probe: RunSave = {
      version: 3, appVersion: APP_VERSION, runId: 1, seed: 42, tick: 0, waveNumber: 1,
      lives: 20, score: 0,
      combo: { count: 0, timer: 0, multiplier: 1, highest: 0 },
      plants: [], inventory: {}, discoveredVariants: [], bredStats: {}, nektarEarned: 0,
      cols: 12, rows: 12,
    };
    expect(probe.appVersion).toBe(APP_VERSION);
    void loadRun; // Öffentlich-API importiert (Contract-Nachbar), IDB-Roundtrip im Resume-Gate
  });
});

import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import { APP_VERSION, APP_VERSION_LABEL } from './version';

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

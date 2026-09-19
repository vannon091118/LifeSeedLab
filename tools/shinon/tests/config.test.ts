import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultConfig, loadConfig, mergeConfig, writeConfigTemplate } from '../config.ts';
import { tempDir } from './helpers.ts';

describe('Shinon-Konfiguration', () => {
  it('liefert das LifeSeedLab-Profil mit Caps, Patterns und Kommandos', () => {
    const config = defaultConfig('/tmp/shinon');
    expect(config.gate.locCaps.length).toBeGreaterThan(0);
    expect(config.gate.forbiddenPatterns.some((rule) => rule.pattern.includes('Math'))).toBe(true);
    expect(config.gate.commands.typecheck.command).toBe('npx');
    expect(config.push.autoAfterCommit).toBe(true);
  });

  it('merged Objekte rekursiv und ersetzt Arrays vollständig', () => {
    const merged = mergeConfig(
      { a: { b: 1, c: 2 }, list: [1, 2, 3] },
      { a: { c: 9 }, list: [7] },
    ) as { a: { b: number; c: number }; list: number[] };
    expect(merged.a).toEqual({ b: 1, c: 9 });
    expect(merged.list).toEqual([7]);
  });

  it('liest Overrides aus shinon.config.json im Repository-Root', () => {
    const dir = tempDir('config-read');
    const config = defaultConfig(dir);
    config.push.autoAfterCommit = false;
    config.gate.checks.tests = false;
    config.gate.locCaps = [{ path: 'src/', cap: 42, label: 'Test' }];
    writeConfigTemplate(dir, config);

    const loaded = loadConfig(dir);
    expect(loaded.source).toBe(path.join(dir, 'shinon.config.json'));
    expect(loaded.config.push.autoAfterCommit).toBe(false);
    expect(loaded.config.gate.checks.tests).toBe(false);
    expect(loaded.config.gate.locCaps).toEqual([{ path: 'src/', cap: 42, label: 'Test' }]);
    // Nicht überschriebene Felder bleiben aus den Defaults erhalten.
    expect(loaded.config.commit.prefixes.length).toBeGreaterThan(0);
    expect(fs.existsSync(loaded.source as string)).toBe(true);
  });

  it('nutzt Defaults, wenn keine Konfigurationsdatei existiert', () => {
    const dir = tempDir('config-defaults');
    const loaded = loadConfig(dir);
    expect(loaded.source).toBeNull();
    expect(loaded.config.gate.checks.typecheck).toBe(true);
  });
});

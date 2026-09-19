import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultConfig, loadConfig, writeConfigOverride, writeConfigTemplate } from '../config.ts';
import { ShinonGate, formatGateReport, snapshotOf } from '../gate.ts';
import { finding, isBlocking } from '../checks/check.ts';
import type { Finding, ShinonCheck } from '../checks/check.ts';
import { contextFor, initTempRepo, tempDir } from './helpers.ts';

/**
 * Enforcement-Modus des Gates.
 *
 * Vertrag: `advisory` (Default) lässt Warnungen passieren, `strict` behandelt sie wie Fehler —
 * überall dieselbe Regel (Fail-Fast, Einzelurteil, Gesamturteil, Nachrichtenprüfung). Der Modus
 * wird **persistiert**, nicht pro Aufruf übergeben; es gibt bewusst keinen Per-Lauf-Schalter.
 */

function check(id: string, findings: Finding[], expensive = false): ShinonCheck {
  return { id, title: `Prüfung ${id}`, expensive, run: () => findings };
}

const warning = finding('warn-check', 'W1', 'nur eine Warnung', { severity: 'warn' });

describe('Enforcement-Modus', () => {
  it('advisory (Default): Warnungen lassen das Gate offen', async () => {
    const { git, config } = initTempRepo('enforce-advisory');
    expect(config.gate.enforcement).toBe('advisory');

    const report = await new ShinonGate([check('warn-check', [warning])]).run(contextFor(git, config, { quiet: true }));

    expect(report.enforcement).toBe('advisory');
    expect(report.passed).toBe(true);
  });

  it('strict: Warnungen schließen das Gate und tragen den Modus im Bericht', async () => {
    const { git, config } = initTempRepo('enforce-strict');
    config.gate.enforcement = 'strict';

    const report = await new ShinonGate([check('warn-check', [warning])]).run(contextFor(git, config, { quiet: true }));

    expect(report.passed).toBe(false);
    expect(report.outcomes[0]?.ok).toBe(false);
    const text = formatGateReport(report, { quiet: true });
    expect(text).toContain('Modus: ENFORCEMENT');
    expect(text).toContain('GATE GESCHLOSSEN (Enforcement)');
    expect(snapshotOf(report)).toMatchObject({ passed: false, enforcement: 'strict', warnings: 1, errors: 0 });
  });

  it('strict: eine Warnung triggert Fail-Fast wie ein Fehler', async () => {
    const { git, config } = initTempRepo('enforce-failfast');
    config.gate.enforcement = 'strict';
    let expensiveRan = false;
    const expensive: ShinonCheck = {
      id: 'teuer',
      title: 'teure Prüfung',
      expensive: true,
      run: () => {
        expensiveRan = true;
        return [];
      },
    };

    const report = await new ShinonGate([check('warn-check', [warning]), expensive]).run(
      contextFor(git, config, { quiet: true }),
    );

    expect(expensiveRan).toBe(false);
    expect(report.outcomes[1]?.skipped).toBe(true);
  });

  it('dieselbe Blockier-Regel gilt für die Nachrichtenprüfung', () => {
    expect(isBlocking(warning, 'advisory')).toBe(false);
    expect(isBlocking(warning, 'strict')).toBe(true);
    expect(isBlocking(finding('x', 'E1', 'Fehler'), 'advisory')).toBe(true);
    expect(isBlocking(finding('x', 'I1', 'Hinweis', { severity: 'info' }), 'strict')).toBe(false);
  });

  it('persistiert den Modus partiell, ohne den Rest der Konfiguration zu verlieren', () => {
    const dir = tempDir('enforce-persist');
    const template = defaultConfig(dir);
    template.push.autoAfterCommit = false;
    writeConfigTemplate(dir, template);

    const file = writeConfigOverride(dir, { gate: { enforcement: 'strict' } });
    expect(file).toBe(path.join(dir, 'shinon.config.json'));

    const loaded = loadConfig(dir);
    expect(loaded.config.gate.enforcement).toBe('strict');
    // Der Patch ist partiell: bestehende Overrides und nicht gesetzte Defaults bleiben erhalten.
    expect(loaded.config.push.autoAfterCommit).toBe(false);
    expect(loaded.config.gate.checks.typecheck).toBe(true);
    expect(loaded.config.commit.prefixes.length).toBeGreaterThan(0);
  });

  it('schreibt auch ohne Bestandsdatei eine minimale Override-Datei', () => {
    const dir = tempDir('enforce-fresh');
    writeConfigOverride(dir, { gate: { enforcement: 'strict' } });

    const loaded = loadConfig(dir);
    expect(loaded.source).toBe(path.join(dir, 'shinon.config.json'));
    expect(loaded.config.gate.enforcement).toBe('strict');
  });
});

// Owner: Process-Test (E2E-Impact-Lane). LOC ≤ 200.
// Vertragstest der Lane-Entscheidung (`scripts/e2e-lane-map.mjs` + `scripts/e2e-lane.mjs`).
//
// Der Test prüft drei Dinge, die die Lane sonst still falsch machen könnte:
//   1. Jede Spec erklärt ihre Quelle (`// E2E-COVERAGE:`), die Erklärung löst auf etwas Echtes auf.
//   2. Jede E2E-relevante Quelldatei unter `src/` ist beansprucht — sonst gäbe es einen Pfad,
//      für den die Lane eine Änderung übersieht (statt zu eskalieren).
//   3. Die Entscheidung selbst: Impact bleibt Impact, Fundament/Unbeanspruchtes eskaliert auf
//      Voll, Ausgenommenes läuft gar nicht, das Instrument nie.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { claims, isExempt, parseCoverage, planE2e } from '../scripts/e2e-lane-map.mjs';

const SPEC_DIR = 'tests';

function gitLines(args: string[]): string[] {
  return execFileSync('git', args, { encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean);
}

function loadSpecs() {
  return readdirSync(SPEC_DIR)
    .filter((f) => f.endsWith('.spec.ts'))
    .sort()
    .map((f) => ({ file: `${SPEC_DIR}/${f}`, ...parseCoverage(readFileSync(`${SPEC_DIR}/${f}`, 'utf8')) }));
}

/** Alle Quelldateien unter `src/`, für die E2E überhaupt zuständig ist (getrackt + neu). */
function e2eRelevantSources(): string[] {
  return [...gitLines(['ls-files', 'src']), ...gitLines(['ls-files', '--others', '--exclude-standard', 'src'])]
    .filter((p) => /\.(ts|tsx|css)$/.test(p) && !isExempt(p));
}

const specs = loadSpecs();
const runnable = specs.filter((s) => !s.instrument).map((s) => s.file);

describe('E2E-Impact-Lane — Vertrag', () => {
  it('jede Spec nennt ihre Quelle (kein stiller Durchfall)', () => {
    expect(specs.filter((s) => s.missing).map((s) => s.file)).toEqual([]);
    expect(specs.length).toBeGreaterThanOrEqual(10);
  });

  it('jede genannte Quelle existiert wirklich', () => {
    const bogus = specs.flatMap((s) => s.areas.filter((a) => !existsSync(a)).map((a) => `${s.file}: ${a}`));
    expect(bogus).toEqual([]);
  });

  it('jede E2E-relevante Quelldatei unter src/ ist beansprucht', () => {
    const sources = e2eRelevantSources();
    expect(sources.length).toBeGreaterThan(100); // Plausibilität: die Liste ist nicht leer gelaufen
    const unclaimed = sources.filter((p) => !specs.some((s) => !s.instrument && claims(s, p)));
    expect(unclaimed).toEqual([]);
  });

  it('Instrument steht nie in einer Lane-Auswahl', () => {
    const instrument = specs.filter((s) => s.instrument).map((s) => s.file);
    expect(instrument.length).toBeGreaterThan(0);
    const plans = [
      planE2e(['src/simulation/waveSystem.ts'], specs),
      planE2e(['tests/helpers/harness.ts'], specs),
      planE2e(['src/irgendwas/neu.ts'], specs),
      planE2e([], specs, { full: true }),
    ];
    for (const plan of plans) expect(plan.specs.filter((f) => instrument.includes(f))).toEqual([]);
  });

  it('Grafik-Änderung zieht nur die Specs, die diese Fläche messen', () => {
    const plan = planE2e(['src/components/gameViewStyles.ts'], specs);
    expect(plan.mode).toBe('impacted');
    expect(plan.specs).toEqual(['tests/layout_regie.spec.ts', 'tests/run.spec.ts']);
  });

  it('Sim-Änderung trifft die Sim-Specs, nicht die Screen-Specs', () => {
    const plan = planE2e(['src/simulation/waveSystem.ts'], specs);
    expect(plan.mode).toBe('impacted');
    expect(plan.specs).toContain('tests/run.spec.ts');
    expect(plan.specs).toContain('tests/gamebreaker.spec.ts');
    expect(plan.specs).not.toContain('tests/preview.spec.ts');
    expect(plan.specs).not.toContain('tests/krix_bubble.spec.ts');
    expect(plan.specs).not.toContain('tests/router.spec.ts');
  });

  it('eine geänderte Spec läuft selbst — nicht die Vollsicht', () => {
    const plan = planE2e(['tests/krix_bubble.spec.ts', 'tests/krix_bubble.spec.ts'], specs);
    expect(plan.mode).toBe('impacted');
    expect(plan.specs).toEqual(['tests/krix_bubble.spec.ts']);
  });

  it('Lane-Fundament eskaliert auf die Vollsicht', () => {
    for (const p of ['index.html', 'package-lock.json', 'tests/helpers/harness.ts', 'playwright.config.ts', 'tests/e2eLock.ts']) {
      const plan = planE2e([p], specs);
      expect(plan.mode, p).toBe('full');
      expect(plan.specs, p).toEqual(runnable);
    }
  });

  it('der Regel-0-Versionsvorsprung löst keinen E2E-Lauf aus', () => {
    // `package.json` und `src/version.ts` sind in JEDEM Commit geändert (Hook hebt +1) — wären
    // sie Fundament oder Quelle, liefe die Lane immer voll. Genau das schafft sie ab.
    const plan = planE2e(['package.json', 'src/version.ts'], specs);
    expect(plan.mode).toBe('none');
    expect(plan.specs).toEqual([]);
  });

  it('unbeanspruchte Quelle eskaliert statt zu schweigen', () => {
    const plan = planE2e(['src/irgendwas/neu.ts'], specs);
    expect(plan.mode).toBe('full');
    expect(plan.unmatched).toEqual(['src/irgendwas/neu.ts']);
  });

  it('Doku- und Einheitentest-Änderung brauchen kein E2E', () => {
    for (const p of ['docs/process/ROADMAP.md', 'src/simulation/waveSystem.test.ts', 'scripts/foo.mjs', 'tools/indexer/cli.ts']) {
      expect(planE2e([p], specs).mode, p).toBe('none');
    }
  });

  it('--full nimmt alle Specs außer dem Instrument', () => {
    const plan = planE2e([], specs, { full: true });
    expect(plan.mode).toBe('full');
    expect(plan.specs).toEqual(runnable);
    expect(runnable.length).toBe(specs.length - 1);
  });
});

// Owner: Gate (E2E-Impact-Lane). Regel: E2E läuft im Commit-Pfad nur für die Specs, die die
// GEÄNDERTE Quelle beanspruchen — die Vollsicht bleibt als Flag (`--full`) fürs Sprintende.
//
// Warum kein Ableiten aus dem Import-Graph: Playwright-Specs importieren die App nicht, sie
// bedienen sie über den Browser. „Wen könnte diese Datei berühren" wäre deshalb immer „die
// ganze App" — die Antwort kann nicht aus dem Graph kommen, sondern nur aus einer Erklärung
// neben der Spec. Diese Erklärung steht als `// E2E-COVERAGE:`-Kopf IN der Spec (dieselbe
// Stelle, die auch `Owner:` trägt) und ist damit genau eine Wahrheit: kein zweites Verzeichnis,
// das mit den Specs driftet.
//
// Kein stiller Durchfall: Änderungen, die keine Spec beansprucht (oder am Harness/Entrypoint
// liegen), eskalieren auf die Voll-Lane. Die Lane wird dadurch kürzer, nie blinder.

/** Reservierter Marker: Instrument, kein Gate-Test (misst Zahlen statt Verhalten). */
export const INSTRUMENT = 'INSTRUMENT';

/** Kopfzeile, die in jeder Spec stehen muss — Format: `// E2E-COVERAGE: <area> <area> …` */
export const COVERAGE_HEADER = 'E2E-COVERAGE:';

/**
 * Pfade, die die Lane selbst betreffen (Browser, Harness, Entrypoint, Build): dort ist keine
 * Aussage „nur Spec X betroffen" ehrlich → Voll-Lane.
 *
 * `package.json` steht hier bewusst NICHT: die Datei ist wegen des Regel-0-Vorsprungs (Version +1,
 * uncommitted) in JEDEM Commit geändert — als Fundament hätte die Lane damit permanent die
 * Vollsicht gefahren, also genau das, was sie abschafft. Sie ist ausgenommen; `package-lock.json`
 * bleibt Fundament, eine echte Dependency-Änderung eskaliert also weiterhin.
 */
export const FOUNDATION_PATTERNS = [
  'index.html',
  'package-lock.json',
  'vite.config.*',
  'vitest.config.*',
  'playwright.config.ts',
  'tsconfig*.json',
  'tests/helpers/**',
  'tests/e2eLock.ts',
];

/**
 * Pfade, die E2E nicht brauchen: Einheitentests, Test-Support, Doku, Werkzeug, generierter
 * Bestand, Version-Vorsprung. Reine Test-/Doku-Änderung ⇒ die Lane meldet „nichts zu tun".
 */
export const EXEMPT_PATTERNS = [
  'package.json',
  'src/version.ts',
  '**/*.md',
  '**/*.txt',
  'docs/**',
  'plan/**',
  'tools/**',
  'scripts/**',
  'tests/**/*.test.ts',
  'src/**/*.test.ts',
  'src/**/*.test.tsx',
  'src/testing/**',
  'src/vite-env.d.ts',
  'shinon.config.json',
  'commit_msg.txt',
];

/** Glob (nur `*` innerhalb eines Segments, `**` über Segmente) → RegExp. */
function globToRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '\u0000SLASHSTAR\u0000')
    .replace(/\*\*/g, '\u0000STARSTAR\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000SLASHSTAR\u0000/g, '(?:.*/)?')
    .replace(/\u0000STARSTAR\u0000/g, '.*');
  return new RegExp(`^${escaped}$`);
}

const cache = new Map();

/** `path` gegen ein Glob-Muster prüfen (Zwischenspeicher: die Lane prüft viele Pfade). */
export function matchesPattern(path, pattern) {
  let re = cache.get(pattern);
  if (!re) {
    re = globToRegExp(pattern);
    cache.set(pattern, re);
  }
  return re.test(path);
}

/**
 * Spec-Kopf lesen. Gibt die beanspruchten Pfad-Präfixe (Verzeichnis mit `/` oder Datei) zurück;
 * `instrument: true` beim reservierten Marker. Fehlender Kopf ⇒ `missing: true` — der Aufrufer
 * wertet das als Vertragsbruch (Contract-Test), die Lane eskaliert konservativ.
 */
export function parseCoverage(source) {
  const line = source.split('\n').find((l) => l.includes(COVERAGE_HEADER));
  if (!line) return { areas: [], instrument: false, missing: true };
  const raw = line.slice(line.indexOf(COVERAGE_HEADER) + COVERAGE_HEADER.length).trim();
  const tokens = raw.split(/[\s,]+/).filter(Boolean);
  if (tokens.includes(INSTRUMENT)) return { areas: [], instrument: true, missing: false };
  return { areas: tokens, instrument: false, missing: false };
}

/** Gehört die Änderung zur Lane selbst? */
export function isFoundation(path) {
  return FOUNDATION_PATTERNS.some((p) => matchesPattern(path, p));
}

/** Braucht die Änderung kein E2E? */
export function isExempt(path) {
  return EXEMPT_PATTERNS.some((p) => matchesPattern(path, p));
}

/** Geänderte Spec-Datei — sie läuft selbst, statt die Vollsicht zu erzwingen. */
export function isSpecFile(path) {
  return /^tests\/[^/]+\.spec\.ts$/.test(path);
}

/** Beansprucht eine Spec diesen Pfad? (Präfix = Verzeichnis oder exakte Datei) */
export function claims(spec, path) {
  return spec.areas.some((area) => {
    if (area.endsWith('/')) return path.startsWith(area);
    return path === area;
  });
}

/**
 * Die Entscheidung der Lane — rein aus (changed, specs, flags), ohne Dateisystem.
 *
 * Modi:
 *  - `none`      — nur ausgenommene Pfade: kein E2E-Lauf (Doku, Einheitentests, Werkzeug)
 *  - `impacted`  — genau die Specs, die die geänderten Quellen beanspruchen
 *  - `full`      — Voll-Lane: Flag, Lane-Fundament oder eine Quelle ohne beanspruchende Spec
 */
export function planE2e(changed, specs, { full = false } = {}) {
  const runnable = specs.filter((s) => !s.instrument).map((s) => s.file).sort();
  if (full) return { mode: 'full', specs: runnable, reason: 'Flag --full', unmatched: [] };

  const foundation = changed.filter(isFoundation);
  if (foundation.length > 0) {
    return {
      mode: 'full',
      specs: runnable,
      reason: `Lane-Fundament geändert (${foundation.length}): ${foundation.slice(0, 5).join(', ')}`,
      unmatched: [],
    };
  }

  const sources = changed.filter((p) => p.startsWith('src/') && !isExempt(p));
  const unmatched = sources.filter((p) => !specs.some((s) => !s.instrument && claims(s, p)));
  if (unmatched.length > 0) {
    return {
      mode: 'full',
      specs: runnable,
      reason: `keine Spec beansprucht (${unmatched.length}): ${unmatched.slice(0, 5).join(', ')}`,
      unmatched,
    };
  }

  const selected = runnable.filter((file) => {
    if (isSpecFile(file) && changed.includes(file)) return true;
    const spec = specs.find((s) => s.file === file);
    return sources.some((p) => claims(spec, p));
  });

  if (selected.length === 0) {
    return { mode: 'none', specs: [], reason: 'keine E2E-relevante Änderung', unmatched: [] };
  }
  return {
    mode: 'impacted',
    specs: selected,
    reason: `${sources.length} berührte Quelle(n)`,
    unmatched: [],
  };
}

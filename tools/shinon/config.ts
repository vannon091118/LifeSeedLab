import fs from 'node:fs';
import path from 'node:path';

/**
 * Shinon-Konfiguration — eine Quelle für alle Gate-, Commit- und Push-Parameter.
 *
 * Die Defaults bilden das LifeSeedLab-Profil ab (LOC-Caps, verbotene Patterns, Verifikations-
 * kommandos). Jedes Projekt kann sie über `tools/shinon.config.json` (oder die Umgebungs-
 * variable SHINON_CONFIG) überschreiben. Damit ist Shinon generisch: kein Pfad, kein Cap und
 * kein Kommando ist im Code hart verdrahtet.
 */

export interface LocCapRule {
  /** Verzeichnis-Präfix relativ zum Repository-Root. */
  path: string;
  /** Harte Obergrenze in Zeilen. */
  cap: number;
  label: string;
}

export interface ForbiddenRule {
  /** RegExp-Quelltext (wird ohne Flags kompiliert). */
  pattern: string;
  message: string;
  exclude?: string[];
}

export interface CommandSpec {
  command: string;
  args: string[];
  enabled: boolean;
}

export interface GateChecks {
  locCaps: boolean;
  forbiddenPatterns: boolean;
  typecheck: boolean;
  tests: boolean;
  /** E2E-Stufe (Playwright) — Stufe 2 des verbindlichen Sprint-Abschlusses (AGENTS.md). */
  e2e: boolean;
  build: boolean;
  commitMessage: boolean;
  /** Doku-Referenzen gegen git ls-files statt Worktree (A13.14-Regel automatisiert). */
  docLinks: boolean;
}

/**
 * Enforcement-Modus des Gates.
 *
 * `advisory` (Default): nur Fehler schließen das Gate, Warnungen werden berichtet.
 * `strict`: Warnungen blockieren wie Fehler — ein grüner Lauf ist dann wirklich grün.
 *
 * Der Modus ist **persistente Konfiguration, kein Aufruf-Flag**: Es gibt keinen Schalter, der ihn
 * für einen einzelnen Lauf aushebelt. Genau das wäre ein zweiter Weg am Gate vorbei.
 */
export type GateEnforcement = 'advisory' | 'strict';

export interface GateConfig {
  checks: GateChecks;
  /** 'advisory' ⇒ nur Fehler blockieren · 'strict' ⇒ Warnungen blockieren mit. */
  enforcement: GateEnforcement;
  /** Billige Prüfungen zuerst; scheitern sie, werden teure Prüfungen übersprungen. */
  failFast: boolean;
  fileExtensions: string[];
  locCaps: LocCapRule[];
  forbiddenPatterns: ForbiddenRule[];
  commands: {
    typecheck: CommandSpec;
    tests: CommandSpec;
    e2e: CommandSpec;
    build: CommandSpec;
  };
}

export interface CommitConfig {
  /** Quelle der Commit-Nachricht — der Komponist liest ausschließlich diese Datei. */
  messageFile: string;
  conventional: boolean;
  prefixes: string[];
  /** true ⇒ nur Leerheit und Kommentarreste werden geprüft (freie Betreffzeilen erlaubt). */
  freeForm: boolean;
}

export interface PushConfig {
  remote: string;
  branch: string;
  /** Nach grünem Gate und erfolgreichem Commit automatisch pushen. */
  autoAfterCommit: boolean;
  setUpstream: boolean;
  /** Verlangt erfolgreiche gh-Authentifizierung vor dem Push. */
  requireAuth: boolean;
}

export interface StarterConfig {
  readme: string;
  /** Überschrift, falls die Marker noch nicht in der README stehen (Anhänge-Fall). */
  sectionTitle: string;
  beginMarker: string;
  endMarker: string;
  /** Anzahl der im README gelisteten LOC-Hotspots. */
  hotspots: number;
}

export interface ShinonConfig {
  repository: { root: string };
  commit: CommitConfig;
  gate: GateConfig;
  push: PushConfig;
  starter: StarterConfig;
}

export const CONFIG_RELATIVE_PATH = 'shinon.config.json';

export function defaultConfig(root: string): ShinonConfig {
  return {
    repository: { root },
    commit: {
      messageFile: 'commit_msg.txt',
      conventional: true,
      prefixes: ['FOLD', 'CUT', 'SEED', 'STAMP'],
      freeForm: false,
    },
    gate: {
      checks: {
        locCaps: true,
        forbiddenPatterns: true,
        typecheck: true,
        tests: true,
        e2e: true,
        build: false,
        commitMessage: true,
        docLinks: true,
      },
      failFast: true,
      enforcement: 'advisory',
      fileExtensions: ['.ts', '.tsx'],
      locCaps: [
        { path: 'src/simulation/', cap: 300, label: 'Simulationssystem' },
        { path: 'src/bus/', cap: 300, label: 'Bus/Clock' },
        { path: 'src/core/', cap: 300, label: 'Core (Clock/RNG/IDs/Hash)' },
        { path: 'src/visual/', cap: 400, label: 'Visual/Generator' },
        { path: 'src/render/', cap: 400, label: 'Renderer' },
        { path: 'src/observers/', cap: 400, label: 'Observer' },
        { path: 'src/components/', cap: 400, label: 'UI-Komponente' },
        { path: 'src/types/', cap: 200, label: 'Types' },
        { path: 'src/config/', cap: 200, label: 'Source/Config' },
        { path: 'src/persistence/', cap: 200, label: 'Persistenz' },
      ],
      forbiddenPatterns: [
        {
          pattern: 'Math\\.random\\(\\)',
          message: 'Verboten: Math.random() — Zufall ausschließlich über core/rng.ts',
          exclude: ['src/core/rng.ts', 'tools/'],
        },
        {
          // Geltung: **Spielcode**. `tools/` ist Werkzeug, kein Spiel: das Gate misst eigene
          // Laufzeiten (Date.now) und seine Tests prüfen VERBOTENES absichtlich (Fixtures) —
          // beides ist Verifikation, keine Verletzung. Der Ausschluss bleibt sichtbar und ist in
          // tools/shinon/tests/checks.test.ts gegen stilles Ausweiten gelockt.
          pattern: 'Date\\.now\\(\\)',
          message: 'Verboten: Date.now() — nur GameClock, performance.now() nur im Frame-Timing',
          exclude: ['tools/'],
        },
        {
          // Geltung: **Spielcode**. Der Playwright-Harness unter `tests/` läuft außerhalb der App,
          // kann `persistence/` nicht importieren und beobachtet den Browser-Save schwarzbox — das
          // ist die Verifikation der Ownership, nicht ihre Verletzung. Die Ausnahme ist in
          // `tests/checks.test.ts` gegen stilles Ausweiten gelockt.
          pattern: 'localStorage\\.|indexedDB',
          message: 'Verboten: Persistenz-Zugriff außerhalb von persistence/',
          exclude: ['src/persistence/', 'tests/', 'tools/'],
        },
      ],
      commands: {
        typecheck: { command: 'npx', args: ['tsc', '-b', '--noEmit'], enabled: true },
        tests: { command: 'npx', args: ['vitest', 'run'], enabled: true },
        // E2E laeuft gegen Chromium; Playwright verwaltet seinen Dev-Server selbst (webServer
        // mit reuseExistingServer) — der Gate-Lauf startet nichts von Hand.
        e2e: { command: 'npx', args: ['playwright', 'test', '--reporter=line'], enabled: true },
        build: { command: 'npx', args: ['vite', 'build'], enabled: false },
      },
    },
    push: {
      remote: 'origin',
      branch: 'main',
      autoAfterCommit: true,
      setUpstream: true,
      requireAuth: true,
    },
    starter: {
      readme: 'README.md',
      sectionTitle: '## 🧭 Projektstatus',
      beginMarker: '<!-- SHINON:STATUS:BEGIN -->',
      endMarker: '<!-- SHINON:STATUS:END -->',
      hotspots: 5,
    },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Rekursiver Merge: Objekte werden vereinigt, Arrays und Skalare ersetzt. */
export function mergeConfig(base: unknown, override: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : override;
  }
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    result[key] = isPlainObject(current) && isPlainObject(value) ? mergeConfig(current, value) : value;
  }
  return result;
}

export function configPathFor(root: string): string {
  return process.env.SHINON_CONFIG
    ? path.resolve(process.env.SHINON_CONFIG)
    : path.join(root, CONFIG_RELATIVE_PATH);
}

export interface LoadedConfig {
  config: ShinonConfig;
  /** Pfad der benutzten Override-Datei (null ⇒ reine Defaults). */
  source: string | null;
}

export function loadConfig(root: string): LoadedConfig {
  const base = defaultConfig(root);
  const file = configPathFor(root);
  if (!fs.existsSync(file)) {
    return { config: base, source: null };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Shinon-Konfiguration ist kein gültiges JSON (${file}): ${String(error)}`);
  }
  const merged = mergeConfig(base, parsed) as ShinonConfig;
  merged.repository = { ...merged.repository, root };
  return { config: merged, source: file };
}

/** Schreibt das aufgelöste Profil als Vorlage — Grundlage für projektfremde Nutzung. */
export function writeConfigTemplate(root: string, config: ShinonConfig): string {
  const file = path.join(root, CONFIG_RELATIVE_PATH);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  return file;
}

/**
 * Schreibt eine **partielle** Override-Datei und gibt ihren Pfad zurück.
 *
 * Gedacht für Entscheidungen, die dauerhaft gelten müssen statt pro Aufruf wiederholt zu werden
 * (z. B. `gate.enforcement`). Eine unlesbare Bestandsdatei wird bewusst als leer behandelt: Der
 * Aufrufer hat das Schreiben angefordert, aber der Rest der Konfiguration darf dabei nicht
 * stillschweigend verschwinden.
 */
export function writeConfigOverride(root: string, patchValues: Record<string, unknown>): string {
  const file = configPathFor(root);
  let current: Record<string, unknown> = {};
  if (fs.existsSync(file)) {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (isPlainObject(parsed)) current = parsed;
    } catch {
      // Ungültiges JSON: Der Aufruf verlangt einen Schreibvorgang, also ersetzen wir sie.
    }
  }
  const merged = mergeConfig(current, patchValues) as Record<string, unknown>;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  return file;
}

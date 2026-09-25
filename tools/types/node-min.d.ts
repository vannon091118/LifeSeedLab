/**
 * Minimale Ambient-Deklarationen für die Node-APIs, die Shinon tatsächlich benutzt.
 *
 * Grund: `tools/` ist lokales Agent-Tooling und darf die `package.json` des Projekts nicht
 * verändern (neue Dependency ⇒ Auswirkung auf alle Klone, und `@types/node` würde die globalen
 * Typen des Spielcodes mitverschieben). Deshalb deklariert Shinon hier nur den genutzten Teil —
 * bewusst klein, bewusst lokal. Wächst die Nutzung, wächst diese Datei, nicht das Projekt.
 */

declare var process: {
  argv: string[];
  env: Record<string, string | undefined>;
  exitCode: number | undefined;
  platform: string;
  cwd(): string;
  exit(status?: number): void;
  stdout: { write(text: string): boolean };
  stderr: { write(text: string): boolean };
};

// `console` und `URL` fehlen in `lib: ES2022` (sie sind DOM/Node-Globals) — der Drill und seine
// Vertragstests nutzen beide; ohne Deklaration war `tsc -p tools` rot, obwohl der Lauf korrekt war.
declare var console: {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

declare class URL {
  constructor(input: string, base?: string | URL);
}

interface ImportMeta {
  readonly url: string;
}

declare module 'node:process' {
  const process: {
    argv: string[];
    execPath: string;
    env: Record<string, string | undefined>;
    exitCode: number | undefined;
    platform: string;
    cwd(): string;
    stdout: { write(text: string): boolean };
    stderr: { write(text: string): boolean };
  };
  export default process;
}

declare module 'node:child_process' {
  export interface SpawnSyncOptions {
    cwd?: string;
    input?: string;
    encoding?: string;
    env?: Record<string, string | undefined>;
    /** Kurzform `'pipe'`/`'inherit'` UND die Array-Form sind in Node beide gültig. */
    stdio?: string | Array<string | number>;
    shell?: boolean;
    timeout?: number;
    maxBuffer?: number;
  }
  export interface SpawnSyncResult {
    status: number | null;
    stdout: string;
    stderr: string;
    error?: Error;
  }
  export function spawnSync(command: string, args?: string[] | SpawnSyncOptions, options?: SpawnSyncOptions): SpawnSyncResult;
  /** Synchron und shell-fähig — der Drill fährt damit Git, vitest und PowerShell. */
  export function execSync(command: string, options?: SpawnSyncOptions): string;
}

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string | number, encoding?: string): string;
  export function writeFileSync(path: string, data: string, encoding?: string): void;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function chmodSync(path: string, mode: number): void;
  export function readdirSync(path: string, options?: { recursive?: boolean; encoding?: string }): string[];
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
  export function unlinkSync(path: string): void;
  export function cpSync(src: string, dest: string, options?: { recursive?: boolean }): void;
  /** Legt ein temporäres Verzeichnis an — Rückgabe ist der Pfad (Drill-Worktree). */
  export function mkdtempSync(prefix: string): string;
}

declare module 'node:os' {
  export function tmpdir(): string;
}

declare module 'node:path' {
  // `posix` ist die plattformneutrale Sicht: Doku-Referenzen werden damit unabhängig vom
  // Windows-Trenner aufgelöst (doc-link-check). Fehlte im Shim und machte `tsc -p tools` rot,
  // obwohl der Lauf zur Laufzeit korrekt war.
  const posix: {
    join(...parts: string[]): string;
    resolve(...parts: string[]): string;
    dirname(value: string): string;
    basename(value: string): string;
    relative(from: string, to: string): string;
    normalize(value: string): string;
    readonly sep: string;
  };
  const path: {
    join(...parts: string[]): string;
    resolve(...parts: string[]): string;
    dirname(value: string): string;
    basename(value: string): string;
    relative(from: string, to: string): string;
    normalize(value: string): string;
    readonly posix: typeof posix;
    readonly sep: string;
  };
  // Auch NAMED exports: `import { join, dirname, sep } from 'node:path'` ist die Schreibweise
  // des Drills und seiner Tests — ohne diese Zeilen war der Tooling-Typecheck rot.
  export function join(...parts: string[]): string;
  export function dirname(value: string): string;
  export const sep: string;
  export default path;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}

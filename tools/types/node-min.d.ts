/**
 * Minimale Ambient-Deklarationen für die Node-APIs, die Shinon tatsächlich benutzt.
 *
 * Grund: `git-noir/` ist lokales Agent-Tooling und darf die `package.json` des Projekts nicht
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
  stdout: { write(text: string): boolean };
  stderr: { write(text: string): boolean };
};

declare module 'node:process' {
  const process: {
    argv: string[];
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
    stdio?: Array<string | number>;
    shell?: boolean;
  }
  export interface SpawnSyncResult {
    status: number | null;
    stdout: string;
    stderr: string;
    error?: Error;
  }
  export function spawnSync(command: string, args?: string[], options?: SpawnSyncOptions): SpawnSyncResult;
}

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string | number, encoding?: string): string;
  export function writeFileSync(path: string, data: string, encoding?: string): void;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function chmodSync(path: string, mode: number): void;
  export function readdirSync(path: string, options?: { recursive?: boolean; encoding?: string }): string[];
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
}

declare module 'node:path' {
  const path: {
    join(...parts: string[]): string;
    resolve(...parts: string[]): string;
    dirname(value: string): string;
    basename(value: string): string;
    relative(from: string, to: string): string;
    readonly sep: string;
  };
  export default path;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}

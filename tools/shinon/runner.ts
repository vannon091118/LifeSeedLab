import { spawnSync } from 'node:child_process';

/**
 * Prozessausführung — eine Verantwortung: einen Prozess starten und sein Ergebnis normalisieren.
 *
 * Keine Shell-Option, keine Argumentverkettung: Argumente bleiben exakt, was sie sind. Auf Windows
 * sind `npx` und `npm` jedoch `.cmd`-Shims, die sich nicht direkt starten lassen; dafür springt
 * einmalig `cmd.exe /d /s /c` mit korrekt quotierter Kommandozeile ein — und nur, wenn der direkte
 * Start fehlgeschlagen ist.
 */

export interface CommandResult {
  ok: boolean;
  status: number | null;
  stdout: string;
  stderr: string;
  /** Kommandozeile ohne Geheimnisse — für Fehlermeldungen. */
  label: string;
}

export interface SpawnOptions {
  input?: string;
  /** true ⇒ nicht-null Exit ist kein Fehler (z. B. `git diff --quiet`). */
  allowFailure?: boolean;
  cwd?: string;
}

/** Quotiert ein Argument nur, wenn es das braucht (Leerzeichen oder Anführungszeichen). */
export function quoteArgument(argument: string): string {
  return /[\s"]/.test(argument) ? `"${argument.replace(/"/g, '\\"')}"` : argument;
}

export function runProcess(command: string, args: string[], options: SpawnOptions = {}): CommandResult {
  const base = { cwd: options.cwd, input: options.input, encoding: 'utf8' };
  let result = spawnSync(command, args, base);
  let label = [command, ...args].join(' ');

  if (result.error !== undefined && process.platform === 'win32') {
    const line = [command, ...args].map(quoteArgument).join(' ');
    const retry = spawnSync('cmd.exe', ['/d', '/s', '/c', line], base);
    if (retry.error === undefined) {
      result = retry;
      label = line;
    }
  }

  const status = result.status ?? null;
  const ok = result.error === undefined && status === 0;
  return {
    ok: options.allowFailure === true ? true : ok,
    status,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? result.error?.message ?? ''),
    label,
  };
}

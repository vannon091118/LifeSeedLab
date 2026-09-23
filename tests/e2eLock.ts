// Owner: Process (E2E-Lauf-Garde, P-35). LOC ≤ 200.
// Befund P-35 (21.09.2026): unter paralleler Last (zweite Playwright-Instanz im selben
// Worktree) meldete die E2E-Lane Zeitüberschreitungen, die isoliert verschwinden — ein roter
// Lauf war danach nicht mehr von einem echten Defekt zu unterscheiden. Diese Garde macht die
// Last zur VORBEDINGUNG: läuft hier schon ein E2E-Lauf, bricht der neue SOFORT mit klarer
// Meldung ab, statt flaky zu rot. Das Lock lebt in `node_modules` (niemals im Index, nie im
// Playwright-Output); ein verwaistes Lock (abgestürzter Lauf) wird an der nicht mehr lebenden
// PID erkannt und ersetzt. Das Verzeichnis ist über `E2E_LOCK_DIR` lenkbar (Test).
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function lockPath(): string {
  return join(process.env.E2E_LOCK_DIR ?? process.cwd(), 'node_modules', '.e2e-lock.json');
}

/** PID lebt? (Signal 0 = Existenzprobe; EPERM zählt als lebend — fremder Nutzer.) */
export function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export default function acquireLock(): () => void {
  const path = lockPath();
  if (existsSync(path)) {
    let blocker: number | null = null;
    try {
      const { pid } = JSON.parse(readFileSync(path, 'utf8')) as { pid: number };
      if (Number.isFinite(pid) && pid !== process.pid && pidAlive(pid)) blocker = pid;
    } catch {
      // kaputtes/leeres Lock: gilt als verwaist, wird unten ersetzt
    }
    if (blocker !== null) {
      throw new Error(
        `E2E-Lauf abgebrochen (P-35 Last-Vorbedingung): eine zweite Playwright-Instanz ` +
        `(pid ${blocker}) läuft bereits in diesem Worktree. Unter Last ist die Lane flaky — ` +
        `bitte seriell fahren oder die andere Instanz beenden.`,
      );
    }
  }
  writeFileSync(path, JSON.stringify({ pid: process.pid, started: new Date().toISOString() }));

  // Playwright nutzt die Rückgabe als globalTeardown (Lock wieder frei für den nächsten Lauf).
  return () => {
    try {
      const { pid } = JSON.parse(readFileSync(path, 'utf8')) as { pid: number };
      if (pid === process.pid) rmSync(path);
    } catch {
      // nichts zu tun: Lock fehlt oder gehört jemandem anderen
    }
  };
}

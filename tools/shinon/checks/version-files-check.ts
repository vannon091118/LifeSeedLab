import { finding } from './check.ts';
import type { CheckContext, Finding, ShinonCheck } from './check.ts';

/**
 * VersionFilesCheck — die Versionswahrheit wird nicht mitcommittet.
 *
 * Anlass (Befund 21.09.2026): der Regel-0-Hook hebt `package.json` und `src/version.ts`
 * zusammen an (+1 uncommitted für den Folge-Commit, s. AGENTS.md Regel 0). Wer die beiden
 * Dateien trotzdem stagt, committet den Vorsprung weg und der nächste Regel-0-Bump drifft —
 * genau das passierte in Commit `d924a17`: beide Dateien waren Teil des Index, das Gate ließ
 * es durch, weil keine Prüfung diesen Vertrag kannte. Der Zustand „beide Dateien stehen im
 * Index" ist ab jetzt ein Fehler, unabhängig vom Inhalt: Die Version gehört zur Arbeitskopie,
 * nicht zum Commit — sie fliegt erst mit dem Sprint-Abschluss-Commit, der sie bewusst tragen
 * darf (`--allow-version-files` im Aufruf bleibt vorbehalten, heute nicht nötig).
 *
 * Geprüft wird ausschließlich der INDEX — ein unaufgeräumter Arbeitsbaum blockiert nicht
 * (dasselbe Prinzip wie CommitSizeCheck).
 */
const VERSION_FILES: ReadonlySet<string> = new Set(['package.json', 'src/version.ts']);

export class VersionFilesCheck implements ShinonCheck {
  readonly id = 'version-files';
  readonly title = 'Versions-Wahrheit bleibt uncommittet (Regel-0-Vorsprung)';

  run(ctx: CheckContext): Finding[] {
    // Der Versions-Vorsprung ist eine Eigenschaft des Commits, den man SCHREIBT — nicht des
    // Zustands, den man zusammenführt. Bei einem Merge steht `package.json` zwangsläufig im
    // Index, sobald die Gegenseite sie angefasst hat; VRF001 würde daraus einen Fehler machen
    // und jeden Merge blockieren, der die Versionsdatei einbringt. Deshalb ausschließlich in der
    // Commit-Phase — dort ist der Index genau die beabsichtigte Änderung.
    if (ctx.phase !== 'pre-commit') {
      return [
        finding(this.id, 'VRF000', `Versions-Vorsprung wird nur im Index geprüft (Phase ${ctx.phase})`, {
          severity: 'info',
        }),
      ];
    }

    const files = [...ctx.stagedFiles].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const hits = files.filter((f) => VERSION_FILES.has(f.replace(/\\/g, '/')));

    if (hits.length === 0) {
      return [
        finding(this.id, 'VRF000', 'Versionsdateien nicht im Index — Vorsprung intakt', {
          severity: 'info',
        }),
      ];
    }
    return hits.map((file) =>
      finding(
        this.id,
        'VRF001',
        `${file} steht im Index — die Versions-Wahrheit (package.json + src/version.ts) bleibt ` +
          'als uncommitteter Regel-0-Vorsprung in der Arbeitskopie (Hook hebt +1 an). Aus dem ' +
          'Index nehmen: `git restore --staged ${file}`',
        { file },
      ),
    );
  }
}

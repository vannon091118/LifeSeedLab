import { finding } from './check.ts';
import type { CheckContext, Finding, ShinonCheck } from './check.ts';

/**
 * CommitSizeCheck — die Slice-Regel als Prüfung, nicht als Vorsatz.
 *
 * Anlass (Befund 20.09.2026): Commit `eccfede` hieß „fix(sim): Attraktor-Zug auf den Weg
 * begrenzen", hatte keinen Body und fasste 152 Dateien an — eine komplette Vektor-Engine, zwei
 * UI-Splits, Bus-Typen, gelöschte `src/cloud/*` und alte `.bak`-Dateien in EINEM Schritt. Ein
 * Gate, das nur das Betreff-Format prüft, lässt das durch; per `bisect` ist danach nicht mehr
 * trennbar, was Mechanik und was Aufräumen war. Deshalb ist die Obergrenze jetzt eine Prüfung:
 * mehr als `commit.maxFiles` Dateien im Index ⇒ Fehler mit der Anweisung, zu schneiden.
 *
 * Geprüft wird ausschließlich der INDEX — also genau das, was committet würde. Ein voller oder
 * unaufgeräumter Arbeitsbaum ist ein normaler Zustand und darf keinen Commit blockieren; wer
 * 152 Dateien bewusst stagen will, bekommt den Befund, wer sie nur herumliegen hat, nicht.
 */
export class CommitSizeCheck implements ShinonCheck {
  readonly id = 'commit-size';
  readonly title = 'Commit-Größe (Slice-Regel)';

  run(ctx: CheckContext): Finding[] {
    // Die Slice-Regel misst genau das, was EIN Commit einführt — das ist der Index, und der
    // Index ist nur in der Commit-Phase der Gegenstand. In den Merge-/Rebase-/Push-Phasen ist
    // der Index bereits gefüllt (Merge) bzw. nicht die Aussage (Push); dort würde die Datei-
    // zahl eines fremden Zusammenfügens als „unzulässig großer Commit" gemeldet und der Merge
    // würde an einer Regel scheitern, die für ihn gar nicht geschrieben wurde.
    if (ctx.phase !== 'pre-commit') {
      return [
        finding(this.id, 'CSZ000', `Slice-Grenze gilt nur im Index (Phase ${ctx.phase}) — nicht geprüft`, {
          severity: 'info',
        }),
      ];
    }

    // Kein Sortierzwang für das Urteil, aber eine stabile Reihenfolge im Bericht — Code-Units,
    // weil die Reihenfolge hier nur Darstellung ist und nichts entscheiden darf.
    const files = [...ctx.stagedFiles].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const limit = ctx.config.commit.maxFiles;

    if (files.length === 0) {
      return [
        finding(this.id, 'CSZ000', 'Index ist leer — keine Commit-Größe zu prüfen', { severity: 'info' }),
      ];
    }
    if (files.length <= limit) {
      return [
        finding(this.id, 'CSZ000', `${files.length} von höchstens ${limit} Dateien im Commit`, {
          severity: 'info',
        }),
      ];
    }
    return [
      finding(
        this.id,
        'CSZ001',
        `${files.length} Dateien im Index überschreiten die Slice-Grenze von ${limit} — in kleinere, ` +
          'einzeln prüfbare Commits schneiden (`git diff --cached --name-only` listet sie)',
      ),
    ];
  }
}

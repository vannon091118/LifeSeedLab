import { finding, type CheckContext, type ShinonCheck } from './check.ts';
import { isIndexInput } from '../../indexer/input-policy.ts';

/**
 * Untracked-Quellen sind kein gültiger Indexinput: Der Indexer darf sie weder
 * aufnehmen noch stillschweigend übersehen. Diese Prüfung liest denselben Git-Status
 * wie der übrige Gate-Kontext und benutzt die kanonische Indexer-Klassifikation.
 */
export class UntrackedInputCheck implements ShinonCheck {
  readonly id = 'untracked-inputs';
  readonly title = 'Untracked-Indexquellen';

  run(ctx: CheckContext) {
    // Untracked-Quellen gehören zur Index-Vorbereitung. Im Pre-Commit ist der Index bereits der
    // bewusst gewählte Slice; eine nicht gestagte Nachbardatei kann weder mitcommittet noch von
    // dieser Prüfung erfunden werden. Der Preflight darf sie dagegen weiterhin fail-closed melden.
    if (ctx.phase !== 'preflight') return [];

    return ctx.git.status().untracked
      .filter(isIndexInput)
      .sort()
      .map((file) => finding(this.id, 'UNP001', `Untracked-Indexquelle: ${file} — git add ausführen, bevor der Index gebaut wird.`, { file }));
  }
}

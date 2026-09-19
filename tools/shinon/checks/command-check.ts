import { finding, tail } from './check.ts';
import type { CheckContext, Finding, ShinonCheck } from './check.ts';
import type { CommandSpec, ShinonConfig } from '../config.ts';
import type { CommandResult } from '../git-helfer.ts';

/**
 * Generische Prüfklasse für Verifikationskommandos.
 *
 * Die Ausgabe wird immer erfasst (nicht geerbt) und anschließend ausgegeben. Grund: das Gate
 * braucht die Zahlen der Testzusammenfassung für Statusberichte, und Hooks brauchen bei roten
 * Gates die letzten Zeilen als Befund. Konkrete Prüfungen liefern nur den Kommando-Schlüssel
 * aus der Konfiguration — kein Kommando ist im Code verdrahtet.
 */
export class CommandCheck implements ShinonCheck {
  readonly id: string;
  readonly title: string;
  readonly expensive = true;
  private readonly key: keyof ShinonConfig['gate']['commands'];
  /** Letzte erfasste Ausgabe — Grundlage der Auswertung in Unterklassen. */
  protected lastOutput = '';

  constructor(id: string, title: string, key: keyof ShinonConfig['gate']['commands']) {
    this.id = id;
    this.title = title;
    this.key = key;
  }

  spec(ctx: CheckContext): CommandSpec {
    return ctx.config.gate.commands[this.key];
  }

  run(ctx: CheckContext): Finding[] {
    const spec = this.spec(ctx);
    if (!spec.enabled) {
      return [finding(this.id, 'CMD000', `${this.title}: in der Konfiguration deaktiviert`, { severity: 'info' })];
    }

    const result = ctx.git.spawn(spec.command, spec.args);
    this.lastOutput = `${result.stdout}\n${result.stderr}`;
    if (!ctx.quiet) this.echo(result);

    if (!result.ok) {
      return [
        finding(
          this.id,
          'CMD001',
          `${this.title} fehlgeschlagen (${result.label})${ctx.quiet ? `:\n${tail(this.lastOutput)}` : ''}`,
        ),
      ];
    }
    return this.onSuccess(ctx, spec);
  }

  /** Hook: zusätzliche Befunde aus der erfassten Ausgabe ziehen. */
  protected onSuccess(_ctx: CheckContext, spec: CommandSpec): Finding[] {
    return [
      finding(this.id, 'CMD100', `${this.title} bestanden (${spec.command} ${spec.args.join(' ')})`, {
        severity: 'info',
      }),
    ];
  }

  private echo(result: CommandResult): void {
    const text = `${result.stdout}${result.stderr}`.trimEnd();
    if (text !== '') process.stdout.write(`${text}\n`);
  }
}

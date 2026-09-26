import fs from 'node:fs';
import process from 'node:process';
import { loadConfig, writeConfigOverride } from './config.ts';
import { PUSH_AFTER_COMMIT_ENV, ShinonGitHelfer } from './git-helfer.ts';
import { ShinonStateStore } from './state.ts';
import { ShinonGate, formatGateReport, snapshotOf } from './gate.ts';
import { buildChecks, knownCheckIds } from './checks/index.ts';
import { createCheckContext } from './context.ts';
import { ShinonStarter, formatPrepareResult } from './starter.ts';
import { ShinonCommitKomponist } from './commit-komponist.ts';
import { ShinonPushExecutor, formatPushOutcome } from './push-executor.ts';
import { ShinonPipeline, formatPipelineResult } from './pipeline.ts';
import { ShinonInit, describeInitReport } from './init.ts';
import { describeHookInstall, installHooks } from './hooks.ts';
import { allowedForms, readMessage, runMessageSelfTest, validateMessage } from './checks/commit-message-check.ts';
import {
  MIN_MERGE_BODY_WORDS,
  runMergeMessageSelfTest,
  validateMergeMessage,
} from './checks/merge-message-check.ts';
import { MergeExecutor, formatWorkflowResult } from './merge-helfer.ts';
import { PrHelfer, formatPrResult } from './pr-helfer.ts';
import { isBlocking } from './checks/check.ts';
import { has, parseCliArgs, text } from './cli-args.ts';
import type { ShinonPhase } from './checks/check.ts';

/**
 * Shinon CLI — Implementierung des einzigen ausführbaren Einstiegs `hook-entry.mjs`.
 *
 * Agent → Shinon bereitet vor und prüft → Gate entscheidet → Komponist committet → Push-Executor
 * pusht. Die Hooks rufen exakt dieselben Stufen auf, die hier von Hand gestartet werden können;
 * damit gibt es keinen zweiten Weg am Gate vorbei.
 */

const USAGE = `⛩️  Shinon — Commit + Push Executor

Aufruf: node tools/shinon/hook-entry.mjs <Befehl> [Optionen]

Befehle
  status          Projektstatus lesen (nur lesend, kein Gate, keine README-Änderung)
  prepare         Starter: Projektstatus lesen, README aktualisieren, Gate im Preflight
  gate            Gate ausführen (Prüfklassen laden, Befunde sammeln)
  commit          Komponist: commit_msg.txt prüfen und committen (einziger Commit-Pfad)
  push            Push-Executor: Pushen (Vorbedingungen + Auth-Prüfung)
  finish          Voller Ablauf: Vorbereitung → Gate → Commit → Push
  merge           Merge gegen --branch mit Gate (Phase pre-merge), --abort nimmt zurück
  rebase          Rebase auf --upstream mit Gate (Phase pre-rebase)
  pr              Pull-Request: 'pr create' / 'pr merge' — beide mit Body- und Standprüfung
  message         Commit-Nachricht prüfen (--file, --message, stdin) oder --self-test
  merge-message   Merge-Nachricht prüfen (Pflicht-Body MSG010) oder --self-test
  init            Repository, Remote, GitHub-Repository und Hooks einrichten (ohne Push)
  install-hooks   Hooks schreiben und core.hooksPath setzen
  checks          Registrierte Prüfklassen auflisten
  enforce         Enforcement-Modus anzeigen oder persistieren (advisory|strict)
  help            Diese Hilfe

Optionen
  --phase=<preflight|pre-commit|pre-push|pre-merge|pre-rebase>   Phase des Gate-Laufs
  --only=<id,id>        Nur diese Prüfklassen ausführen
  --message-file=<pfad> Nachrichtendatei für Commit (Default aus der Konfiguration)
  --message=<text>      Nachricht direkt übergeben (nur CLI, nicht für Hooks)
  --file=<pfad>         Nachrichtendatei für 'message' (Hook-Aufruf)
  --upstream=<name>     Rebase-Ziel (Default: workflow.merge.base)
  --base=<name>         Ziel-Branch für 'merge' und 'pr create'
  --title=<text>        PR-Titel
  --body=<text>         PR-Body
  --method=<merge|squash|rebase>  PR-Merge-Methode
  --subcommand=<create|merge>     Aktion für 'pr' (Default: create)
  --pr=<nummer>         PR-Nummer für 'pr merge'
  --draft              PR als Draft anlegen
  --delete-branch      Ziel-Branch nach 'pr merge' löschen
  --abort              Laufenden Merge abbrechen ('merge --abort')
  --no-gate            Gate überspringen (nur 'rebase'; nicht für Commit/Push)
  --gate                Vor dem Commit das Preflight-Gate ausführen
  --all                 Vor dem Commit alles stagen (git add -A)
  --no-prepare          Ohne Starter/Gate-Preflight arbeiten
  --no-push             Push-Stufe überspringen
  --dry-run             Read-only für prepare/gate/commit/push/finish
  --auto                Push im Hook-Kontext (Fehler blockieren den Commit nicht)
  --quiet               Ausgabe reduzieren (Hook-Kontext)
  --json                Befund als JSON
  --url=<git-url>       Remote-URL für 'init'
  --slug=<owner/repo>   GitHub-Repository für 'init'
  --public              GitHub-Repository öffentlich anlegen
  --description=<text>  Beschreibung für 'init'
  --branch=<name>       Branch-Override
  --remote=<name>       Remote-Override
  --write-config        Konfigurationsvorlage schreiben
  --no-hooks            Hooks nicht installieren (init)
  --root=<pfad>         Repository-Root-Override
`;

function readStdin(): string {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

async function main(): Promise<number> {
  const args = parseCliArgs(process.argv.slice(2));
  const quiet = has(args, 'quiet');
  const json = has(args, 'json');
  const dryRun = has(args, 'dry-run');
  const cwd = text(args, 'root') ?? ShinonGitHelfer.detectRoot(process.cwd()) ?? process.cwd();
  const { config, source } = loadConfig(cwd);
  const only = args.only;
  const git = new ShinonGitHelfer(config.repository.root);
  const state = new ShinonStateStore(git.root);

  switch (args.command) {
    case 'help':
      process.stdout.write(USAGE);
      return 0;

    case 'status': {
      const status = new ShinonStarter(git, config, state).collect();
      process.stdout.write(
        json
          ? `${JSON.stringify(status, null, 2)}\n`
          : [
              `🧭 Branch ${status.branch ?? '(detached)'} · HEAD ${status.headHash ?? '—'} — ${status.headSubject || 'kein Commit'}`,
              `   Upstream: ${status.upstream ?? 'keiner'} (+${status.ahead}/-${status.behind})`,
              `   Arbeitsbaum: ${status.clean ? 'sauber' : `${status.staged} gestaged, ${status.modified} geändert, ${status.untracked} neu`}`,
              `   Konfiguration: ${source ?? 'Defaults (keine Datei)'}`,
              `   Enforcement: ${config.gate.enforcement === 'strict' ? 'strict (Warnungen blockieren)' : 'advisory (nur Fehler)'}`,
              ...status.hotspots.map(
                (spot) => `   LOC ${spot.file}: ${spot.lines}/${spot.cap} (${Math.round(spot.ratio * 100)} %)`,
              ),
              '',
            ].join('\n'),
      );
      return 0;
    }

    case 'prepare': {
      const result = await new ShinonStarter(git, config, state).prepare({ quiet, only, dryRun });
      process.stdout.write(`${json ? JSON.stringify(result.report, null, 2) : formatPrepareResult(result, quiet)}\n`);
      return result.report?.passed === false ? 1 : 0;
    }

    case 'gate': {
      const phase = (text(args, 'phase') ?? 'preflight') as ShinonPhase;
      const messageFile = text(args, 'message-file');
      const message = text(args, 'message') ?? (messageFile ? (readMessage(messageFile).content ?? '') : undefined);
      const ctx = createCheckContext(git, config, { phase, quiet, message });
      const report = await new ShinonGate(buildChecks(config, only)).run(ctx);
      if (!dryRun) state.patch({ lastGate: snapshotOf(report) });
      process.stdout.write(`${formatGateReport(report, { quiet, json })}\n`);
      return report.passed ? 0 : 1;
    }

    case 'message': {
      if (has(args, 'self-test')) {
        const result = runMessageSelfTest(config);
        process.stdout.write(
          result.failed.length === 0
            ? `✅ Selbsttest der Nachrichtenregel: ${result.total} Fälle bestanden\n`
            : `🛑 Selbsttest fehlgeschlagen:\n${result.failed.map((line) => `   ${line}`).join('\n')}\n`,
        );
        return result.failed.length === 0 ? 0 : 1;
      }
      const file = text(args, 'file') ?? args.positional[0];
      const content = text(args, 'message') ?? (file ? (readMessage(file).content ?? '') : readStdin());
      const findings = validateMessage(content, config);
      // Die Blockier-Regel ist dieselbe wie im Gate: im Enforcement blockieren Warnungen mit.
      const failed = findings.filter((item) => isBlocking(item, config.gate.enforcement));
      if (failed.length === 0) {
        if (!quiet) process.stdout.write('✅ Commit-Nachricht entspricht der vereinbarten Form.\n');
        return 0;
      }
      const enforcementNote =
        config.gate.enforcement === 'strict' && failed.some((item) => item.severity === 'warn')
          ? '🛑 Enforcement aktiv: Warnungen blockieren die Nachricht ebenfalls.\n'
          : '';
      process.stdout.write(
        `${failed.map((item) => `${item.severity === 'error' ? '❌' : '⚠️'} ${item.code}: ${item.message}`).join('\n')}\n` +
          `${enforcementNote}Erlaubt ist: ${allowedForms(config)}\n`,
      );
      return 1;
    }

    case 'merge': {
      const result = await new MergeExecutor(git, config, state).merge({
        branch: text(args, 'branch') ?? text(args, 'base'),
        message: text(args, 'message'),
        messageFile: text(args, 'message-file'),
        squash: has(args, 'squash'),
        abort: has(args, 'abort'),
        dryRun,
        quiet,
        only,
      });
      process.stdout.write(`${json ? JSON.stringify(result, null, 2) : formatWorkflowResult(result, { quiet })}\n`);
      return result.ok ? 0 : 1;
    }

    case 'rebase': {
      const result = await new MergeExecutor(git, config, state).rebase({
        upstream: text(args, 'upstream'),
        message: text(args, 'message'),
        noGate: has(args, 'no-gate'),
        dryRun,
        quiet,
        only,
      });
      process.stdout.write(`${json ? JSON.stringify(result, null, 2) : formatWorkflowResult(result, { quiet })}\n`);
      return result.ok ? 0 : 1;
    }

    case 'pr': {
      const pr = new PrHelfer(git, config, git.ghHelfer());
      const sub = text(args, 'subcommand') ?? args.positional[0] ?? 'create';
      if (sub === 'create') {
        const created = await pr.create({
          base: text(args, 'base'),
          title: text(args, 'title'),
          body: text(args, 'body'),
          draft: has(args, 'draft'),
          dryRun,
          quiet,
        });
        process.stdout.write(`${json ? JSON.stringify(created, null, 2) : formatPrResult(created)}\n`);
        return created.ok ? 0 : 1;
      }
      if (sub === 'merge') {
        const merged = await pr.merge({
          number: text(args, 'pr'),
          method: text(args, 'method'),
          deleteBranch: has(args, 'delete-branch'),
          dryRun,
          quiet,
        });
        process.stdout.write(`${json ? JSON.stringify(merged, null, 2) : formatPrResult(merged)}\n`);
        return merged.ok ? 0 : 1;
      }
      process.stdout.write(`Unbekannte PR-Aktion: ${sub} — erlaubt: create | merge\n`);
      return 2;
    }

    case 'merge-message': {
      if (has(args, 'self-test')) {
        const result = runMergeMessageSelfTest(config);
        process.stdout.write(
          result.failed.length === 0
            ? `✅ Selbsttest der Merge-Regel: ${result.total} Fälle bestanden\n`
            : `🛑 Selbsttest der Merge-Regel fehlgeschlagen:\n${result.failed.map((line) => `   ${line}`).join('\n')}\n`,
        );
        return result.failed.length === 0 ? 0 : 1;
      }
      const file = text(args, 'file') ?? text(args, 'message-file');
      const content = text(args, 'message') ?? (file ? (readMessage(file).content ?? '') : readStdin());
      const findings = validateMergeMessage(content, config);
      const failed = findings.filter((item) => isBlocking(item, config.gate.enforcement));
      if (failed.length === 0) {
        if (!quiet) process.stdout.write('✅ Merge-Nachricht enthält den verpflichtenden Body.\n');
        return 0;
      }
      process.stdout.write(
        `${failed.map((item) => `${item.severity === 'error' ? '❌' : '⚠️'} ${item.code}: ${item.message}`).join('\n')}\n` +
          `Pflicht: mindestens ${MIN_MERGE_BODY_WORDS} Wörter im Body. ` +
          'Der Titel darf Git schreiben, die Begründung nicht.\n',
      );
      return 1;
    }

    case 'commit': {
      if (has(args, 'gate')) {
        const ctx = createCheckContext(git, config, { phase: 'pre-commit', quiet });
        const report = await new ShinonGate(buildChecks(config, only)).run(ctx);
        if (!dryRun) state.patch({ lastGate: snapshotOf(report) });
        if (!report.passed) {
          process.stdout.write(`${formatGateReport(report, { quiet })}\n`);
          return 1;
        }
      }
      const result = new ShinonCommitKomponist(git, config, state).commit({
        message: text(args, 'message'),
        messageFile: text(args, 'message-file'),
        dryRun,
      });
      const notes = result.findings
        .filter((item) => item.severity !== 'info')
        .map((item) => `   ${item.severity === 'error' ? '❌' : '⚠️'} ${item.code}: ${item.message}`);
      process.stdout.write(
        [`${result.ok ? `✅ ${result.detail}` : `🛑 Komponist abgebrochen: ${result.detail}`}`, ...notes, ''].join('\n'),
      );
      return result.ok ? 0 : 1;
    }

    case 'push': {
      const automatic = has(args, 'auto');
      const hookDecision = process.env[PUSH_AFTER_COMMIT_ENV];
      const pushEnabled = hookDecision === '1' || (hookDecision === undefined && config.push.autoAfterCommit);
      if (automatic && !pushEnabled) {
        if (!quiet) process.stdout.write('⏭️ Push übersprungen (push.autoAfterCommit=false).\n');
        return 0;
      }

      const outcome = new ShinonPushExecutor(git, config, state).run({
        dryRun: has(args, 'dry-run'),
        lenient: automatic,
        remote: text(args, 'remote'),
        branch: text(args, 'branch'),
      });
      if (!quiet || !outcome.ok) process.stdout.write(`${formatPushOutcome(outcome)}\n`);
      // Im Hook-Kontext darf ein Push-Problem den Commit nicht nachträglich als Fehler zeigen.
      return automatic ? 0 : outcome.ok ? 0 : 1;
    }

    case 'finish': {
      const result = await new ShinonPipeline(git, config, state).run({
        prepare: !has(args, 'no-prepare'),
        stage: has(args, 'all') ? 'all' : 'none',
        push: has(args, 'no-push') ? false : undefined,
        dryRun: has(args, 'dry-run'),
        quiet,
        only,
        message: text(args, 'message'),
        messageFile: text(args, 'message-file'),
      });
      if (json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        if (result.report !== null && !quiet) process.stdout.write(`${formatGateReport(result.report, { quiet })}\n\n`);
        process.stdout.write(`${formatPipelineResult(result)}\n`);
      }
      return result.ok ? 0 : 1;
    }

    case 'init': {
      const report = new ShinonInit(git, config).run({
        url: text(args, 'url'),
        slug: text(args, 'slug'),
        private: !has(args, 'public'),
        description: text(args, 'description'),
        branch: text(args, 'branch'),
        installHooks: !has(args, 'no-hooks'),
        writeConfig: has(args, 'write-config'),
        quiet,
      });
      process.stdout.write(`${json ? JSON.stringify(report, null, 2) : describeInitReport(report)}\n`);
      return report.steps.every((step) => step.ok) ? 0 : 1;
    }

    case 'install-hooks': {
      const result = installHooks(git);
      process.stdout.write(`${json ? JSON.stringify(result, null, 2) : describeHookInstall(result)}\n`);
      return 0;
    }

    case 'checks': {
      const list = new ShinonGate(buildChecks(config)).list();
      process.stdout.write(
        json
          ? `${JSON.stringify({ known: knownCheckIds(), active: list }, null, 2)}\n`
          : `${list.map((entry) => `• ${entry.id}: ${entry.title}`).join('\n')}\n`,
      );
      return 0;
    }

    case 'enforce': {
      const requested = args.positional[0];
      if (requested === undefined) {
        process.stdout.write(
          [
            `⛩️  Enforcement-Modus: ${config.gate.enforcement === 'strict' ? 'strict (Warnungen blockieren)' : 'advisory (nur Fehler)'}`,
            `   Quelle: ${source ?? 'Defaults (keine Override-Datei)'}`,
            `   Setzen: node tools/shinon/hook-entry.mjs enforce <advisory|strict>`,
            '',
          ].join('\n'),
        );
        return 0;
      }
      if (requested !== 'strict' && requested !== 'advisory') {
        process.stdout.write(`🛑 Unbekannter Modus „${requested}“ — erlaubt: strict | advisory\n`);
        return 1;
      }
      const file = writeConfigOverride(cwd, { gate: { enforcement: requested } });
      process.stdout.write(
        requested === 'strict'
          ? `🔒 Enforcement aktiv und persistent (${file}): Warnungen blockieren ab jetzt jeden Commit — auch über die Hooks.\n`
          : `🔓 Enforcement gelöst (${file}): Nur Fehler blockieren.\n`,
      );
      return 0;
    }

    default:
      process.stdout.write(`Unbekannter Befehl: ${args.command}\n\n${USAGE}`);
      return 2;
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(`🛑 Shinon-Fehler: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });

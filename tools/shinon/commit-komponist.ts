import fs from 'node:fs';
import path from 'node:path';
import { readMessage, validateMessage } from './checks/commit-message-check.ts';
import { nowIso } from './state.ts';
import type { Finding } from './checks/check.ts';
import type { ShinonConfig } from './config.ts';
import type { ShinonGitHelfer } from './git-helfer.ts';
import type { ShinonStateStore } from './state.ts';

/**
 * ShinonCommitKomponist — der einzige erlaubte Weg zu einem Commit.
 *
 * Er liest die vorbereitete Nachricht (Default: commit_msg.txt im Repository-Root), prüft sie mit
 * der Regel, die auch das Gate benutzt, und führt `git commit -F -` mit **genau diesem Inhalt**
 * aus. Er formuliert nichts um: keine Vorlage, kein Zusatz, kein Präfix. Ist die Nachricht
 * ungültig oder der Index leer, bricht er ab, statt zu erfinden.
 */

export interface CommitResult {
  ok: boolean;
  hash: string | null;
  subject: string;
  messageFile: string;
  verbatim: string;
  findings: Finding[];
  detail: string;
}

export interface CommitOptions {
  /** Explizite Nachricht (nur aus dem CLI-Kontext); sonst wird die Konfigurationsdatei gelesen. */
  message?: string;
  /** Pfad zur Nachrichtendatei, überschreibt `commit.messageFile`. */
  messageFile?: string;
}

export class ShinonCommitKomponist {
  private readonly git: ShinonGitHelfer;
  private readonly config: ShinonConfig;
  private readonly state: ShinonStateStore;

  constructor(git: ShinonGitHelfer, config: ShinonConfig, state: ShinonStateStore) {
    this.git = git;
    this.config = config;
    this.state = state;
  }

  resolvedMessageFile(options: CommitOptions = {}): string {
    return path.resolve(this.git.root, options.messageFile ?? this.config.commit.messageFile);
  }

  commit(options: CommitOptions = {}): CommitResult {
    const messageFile = this.resolvedMessageFile(options);
    const fail = (findings: Finding[], detail: string, verbatim = ''): CommitResult => ({
      ok: false,
      hash: null,
      subject: '',
      messageFile,
      verbatim,
      findings,
      detail,
    });

    if (!this.git.isRepository()) {
      return fail(
        [
          {
            check: 'commit',
            code: 'KOM000',
            severity: 'error',
            message: 'Kein Git-Repository — der Komponist ist nicht nutzbar',
          },
        ],
        'kein Repository',
      );
    }

    if (!this.git.hasStagedChanges()) {
      return fail(
        [
          {
            check: 'commit',
            code: 'KOM001',
            severity: 'error',
            message: 'Keine gestagten Änderungen — nichts zu committen (Index ist leer)',
          },
        ],
        'leerer Index',
      );
    }

    const message = options.message ?? readMessage(messageFile).content;
    if (message === null || message.trim() === '') {
      return fail(
        [
          {
            check: 'commit',
            code: 'KOM002',
            severity: 'error',
            message: `Keine Commit-Nachricht gefunden (${path.relative(this.git.root, messageFile)})`,
          },
        ],
        'Nachricht fehlt',
      );
    }

    const findings = validateMessage(message, this.config);
    if (findings.some((item) => item.severity === 'error')) {
      return fail(findings, 'Nachricht entspricht nicht der vereinbarten Form', message);
    }

    const result = this.git.commitWithMessage(message);
    if (!result.ok) {
      return fail(
        [
          {
            check: 'commit',
            code: 'KOM003',
            severity: 'error',
            message: `git commit fehlgeschlagen: ${result.stderr.trim() || result.stdout.trim()}`,
          },
        ],
        'git commit fehlgeschlagen',
        message,
      );
    }

    const hash = this.git.headHash();
    const subject = this.git.headSubject();
    if (hash !== null) {
      this.state.patch({ lastCommit: { hash, subject, at: nowIso() } });
    }

    // Die Nachrichtendatei wird NACH dem Commit konsumiert (gelöscht), damit keine alte
    // Nachricht beim nächsten Lauf still wiederverwendet wird (Befund Sprint e977f61:
    // eine liegengebliebene commit_msg.txt aus einer früheren Session wurde committet).
    // Eine explizit übergebene Nachricht (options.message) stammt nicht aus der Datei —
    // dann gibt es nichts zu löschen.
    if (options.message === undefined) {
      try { fs.unlinkSync(messageFile); } catch { /* schon weg — Ziel erreicht */ }
    }

    return {
      ok: true,
      hash,
      subject,
      messageFile,
      verbatim: message,
      findings,
      detail: `Commit ${hash?.slice(0, 7) ?? '?'} erstellt: ${subject}`,
    };
  }
}

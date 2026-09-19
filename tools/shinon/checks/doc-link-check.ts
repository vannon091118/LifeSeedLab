import fs from 'node:fs';
import path from 'node:path';
import { finding } from './check.ts';
import type { CheckContext, Finding, ShinonCheck } from './check.ts';

/**
 * DocLinkCheck: Doku-Referenzen gegen den GIT-TRACK prüfen, nicht gegen den Worktree.
 *
 * A13.12 (quality-spec): Datei verschoben, Referenz nicht mitgezogen — die Defekt-Klasse trat
 * ZWEIMAL auf (32 tote Links, dann Root-ROADMAP-Phantom ×4), weil „Existiert auf der Platte"
 * nicht „Existiert für einen frischen Klon" bedeutet. Gitignorierte Datei-Reste machen tote
 * Referenzen für Worktree-Prüfungen unsichtbar. Diese Prüfung extrahiert relative Pfad- und
 * Code-Referenzen aus getrackten Markdown-Dateien und hält sie gegen `git ls-files`.
 *
 * Bewusst geprüft werden nur RELATIVE Referenzen (`./*`, `../*`) — absolute Pfade, URLs
 * (`http(s)`, `#anker`) und reine Code-Bezeichner ohne Pfadtrenner sind keine Datei-Referenzen.
 * Code-Referenzen in Backticks (`` `src/foo.ts` ``) werden ebenfalls geprüft, wenn sie wie ein
 * Pfad aussehen (enthält `/` und eine Endung).
 */

const MD_EXT = /\.md$/i;

/** Eine extrahierte Datei-Referenz mit Herkunft. */
interface Ref {
  /** Referenzierter relativer Pfad (normalisiert, ohne Anker/Query). */
  target: string;
  /** Quelldatei (Repo-relativ). */
  from: string;
  line: number;
}

function extractRefs(markdown: string, fromFile: string): Ref[] {
  const refs: Ref[] = [];
  const lines = markdown.split(/\r?\n/);

  const push = (raw: string, lineNo: number): void => {
    // Anker und Query abtrennen, URL-Kodierung auflösen.
    const clean = decodeURIComponent(raw.split('#')[0].split('?')[0].trim());
    if (clean.includes('*') || clean.includes('{')) return; // Glob/Alternative, keine Einzeldatei
    if (!clean || !clean.includes('/')) return;      // keine Pfad-Referenz
    if (/^[a-z]+:/i.test(clean)) return;             // http:, mailto:, vs-code: …
    if (clean.startsWith('<')) return;               // HTML-Rest
    const target = clean.startsWith('./') || clean.startsWith('../')
      ? path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), clean))
      : path.posix.normalize(clean);
    refs.push({ target, from: fromFile, line: lineNo });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Markdown-Links: [text](pfad) — aber keine Bilder mit externen Zielen o. ä.
    for (const m of line.matchAll(/\]\(([^)\s]+)\)/g)) push(m[1], i + 1);
    // Code-Referenzen in Backticks, die wie REPO-PFADE aussehen: `docs/x.md`, `src/a/b.ts`.
    // Bewusst nur die dokumentierten Wurzelordner — sonst would jedes Code-Beispiel
    // („core/clock.ts" als Modulhinweis ohne src/) einen falschen Befund erzeugen.
    for (const m of line.matchAll(/`([^`]+\.[A-Za-z0-9]{1,5})`/g)) {
      const cand = m[1];
      if (/^(src|docs|tests|scripts)\//.test(cand)) push(cand, i + 1);
    }
  }
  return refs;
}

export class DocLinkCheck implements ShinonCheck {
  readonly id = 'doc-links';
  readonly title = 'Doku-Referenzen gegen den Git-Track (A13.12)';

  run(ctx: CheckContext): Finding[] {
    const findings: Finding[] = [];

    // Wahrheit ist der TRACK: git ls-files '*.md'. Dateien, die nur auf der Platte liegen
    // (gitignored/untracked), zählen weder als Quelle noch als Ziel.
    // A13.12-Fix: Voller Track (alle Dateien), nicht nur '*.md' — sonst wuerde jede
    // getrackte Code-Datei (src/…, tests/…) als 'nur lokal' gelten und DLK001 streuoen.
    const tracked = ctx.git.git(['ls-files'], { allowFailure: true });
    if (tracked.status !== 0) {
      return [finding(this.id, 'DLK002', `Doku-Referenzprüfung fehlgeschlagen: ${tracked.stderr || tracked.label}`)];
    }
    const trackedSet = new Set(
      tracked.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
    );
    // Nur getrackte Markdown-Dateien lesen. CHANGELOG bleibt bewusst außen vor: Es ist
    // chronologisch — ein Eintrag referenziert den Stand SEINES Commits, die Vergangenheit
    // ändert sich nicht nach. Lebende Doku ist alles andere.
    const docs = [...trackedSet].filter((f) => MD_EXT.test(f) && !/^CHANGELOG\.md$/i.test(f));

    let refCount = 0;
    for (const doc of docs) {
      const abs = path.join(ctx.root, doc);
      let content: string;
      try {
        content = fs.readFileSync(abs, 'utf8');
      } catch {
        // Getrackt, aber fehlt auf der Platte (frischer Klon ohne Checkout-Fehler?) —
        // keine Referenzen extrahierbar, aber die Datei selbst ist der Befund.
        findings.push(finding(this.id, 'DLK003', `Getrackte Doku fehlt im Arbeitsbaum: ${doc}`, { file: doc }));
        continue;
      }
      for (const ref of extractRefs(content, doc)) {
        refCount++;
        const exists = trackedSet.has(ref.target) || fs.existsSync(path.join(ctx.root, ref.target));
        // Getrackt ⇒ Ziel existiert für jeden Klon. Platte-only ⇒ Worktree-Rest, als Warn
        // gemeldet (strict blockiert damit ebenfalls — konsistent mit Enforcement).
        if (trackedSet.has(ref.target)) continue;
        if (fs.existsSync(path.join(ctx.root, ref.target))) {
          findings.push(finding(
            this.id,
            'DLK001',
            `Referenz zeigt auf eine NUR LOKALE Datei (nicht getrackt — tot für jeden Klon): ${ref.target}`,
            { severity: 'warn', file: ref.from, line: ref.line },
          ));
          continue;
        }
        if (!exists) {
          findings.push(finding(
            this.id,
            'DLK000',
            `Tote Doku-Referenz: "${ref.target}" (referenziert in ${ref.from}:${ref.line}) — existiert weder im Track noch im Arbeitsbaum`,
            { file: ref.from, line: ref.line },
          ));
        }
      }
    }

    findings.push(finding(
      this.id,
      'DLK003',
      `${docs.length} getrackte Doku-Dateien, ${refCount} relative Referenzen geprüft.`,
      { severity: 'info' },
    ));
    return findings;
  }
}

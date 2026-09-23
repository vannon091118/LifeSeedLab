// Owner: IndexerSystem (Rendering). LOC <= 200.
//
// Eine Datenbasis, mehrere Ansichten. Root-Index, Modul-Indexe, String-Matrix
// und Funktionsgraph sind AusSCHNITTE desselben `Index` — keine eigene
// Wahrheit, kein zweiter Ort, an dem eine Beziehung gepflegt werden könnte.
//
// Determinismus ist hier keine Eigenschaft, sondern eine Zusage: gleicher
// Repository-Zustand + gleiche tsconfig ⇒ bytegleiches Ergebnis. Keine
// Zeitstempel, keine Hostnamen, keine Zufallsreihenfolge. Ein Index, der
// sich bei jedem Lauf ändert, wird ignoriert — und ein ignorierter Index
// ist derselbe wie kein Index.

import type { FileEntry, Index, ModuleEntry } from './repo.ts';
import { INDEX_VERSION } from './repo.ts';
import { moduleOf } from './inventory.ts';

const GENERATED = '<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->';

/** Baut den Root-Index als Navigationsbaum über das ganze Repository. */
export function renderRootIndex(index: Index, repoSections: Array<{ title: string; entries: string[] }>): string {
  const lines: string[] = [
    '# LifeSeedLab — Repository-Index',
    '',
    GENERATED,
    '',
    'Einstiegspunkt für die Navigation: `AGENTS.md` → dieser Index → Modul-Index → Datei → Symbol → Relation.',
    'Die maschinenlesbare Quelle aller Beziehungen ist `.index/index.json`; jeder Index hier ist ein Auszug daraus.',
    '',
    '## PROJECT',
    '',
  ];

  lines.push('```text');
  lines.push('PROJECT');
  for (const module of index.modules) {
    lines.push(`├── ${module.id}  (${module.fileCount} Dateien)`);
    lines.push(`│   └── ${module.path}/INDEX.md`);
  }
  for (const section of repoSections) {
    lines.push(`├── ${section.title}`);
    for (const entry of section.entries) lines.push(`│   └── ${entry}`);
  }
  lines.push('└── .index/index.json  (Beziehungsquelle: modules, files, symbols, relations, strings)');
  lines.push('```');
  lines.push('');

  lines.push('## Module');
  lines.push('');
  lines.push('| Modul | Pfad | Dateien | Importiert | Importiert von | Aufrufe nach außen |');
  lines.push('|---|---|---|---|---|---|');
  for (const module of index.modules) {
    lines.push(
      `| \`${module.id}\` | [\`${module.path}\`](${module.path}/INDEX.md) | ${module.fileCount} | ` +
        `${list(module.imports)} | ${list(module.importedBy)} | ${list(module.calls.map((c) => `${c.to} (${c.count})`))} |`,
    );
  }
  lines.push('');

  lines.push('## Hochfrequenz-Knoten (Fan-in)');
  lines.push('');
  lines.push('Dateien, die viele andere Module kennen. Ein Fan-in-Knoten ist eine Vertragsgrenze:');
  lines.push('Änderungen daran brauchen mehr als eine Datei und gehören in den Besitzer-Slice.');
  lines.push('');
  lines.push('| Datei | Importiert von | Modul |');
  lines.push('|---|---|---|');
  for (const hotspot of index.hotspots) {
    const file = index.files.find((entry) => entry.path === hotspot.path);
    lines.push(`| \`${hotspot.path}\` | ${hotspot.importedBy} | \`${file?.module ?? '?'}\` |`);
  }
  lines.push('');

  lines.push('## Unaufgelöste Beziehungen');
  lines.push('');
  if (index.unresolvedCount === 0) {
    lines.push('Keine. Jede Kante im Index ist statisch aufgelöst.');
  } else {
    lines.push(`${index.unresolvedCount} Kanten sind statisch nicht auflösbar. Sie bleiben im Index sichtbar,`);
    lines.push('statt geraten zu werden — eine vermutete Beziehung, die als aufgelöst ausgewgeben wird,');
    lines.push('ist schlimmer als eine sichtbare Lücke.');
    lines.push('');
    lines.push('| Quelle | Zeile | Kante | Grund |');
    lines.push('|---|---|---|---|');
    for (const rel of index.relations) {
      if (!rel.unresolved) continue;
      lines.push(`| \`${rel.from}\` | ${rel.line} | ${rel.type} ${rel.symbol} | ${rel.reason ?? '—'} |`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

/** Baut den Modul-Index: Ort, Symbole, Beziehungen, Datendurchfluss. */
export function renderModuleIndex(module: ModuleEntry, index: Index, contracts: string[]): string {
  const files = index.files.filter((file) => file.module === module.id);
  const lines: string[] = [
    `# Modul: ${module.id}`,
    '',
    GENERATED,
    '',
    `Pfad: \`${module.path}/\``,
    '',
    '## Umfang',
    '',
    `${module.fileCount} Dateien · importiert ${list(module.imports)} · wird importiert von ${list(module.importedBy)}`,
    '',
  ];

  if (contracts.length > 0) {
    lines.push('## Verträge');
    lines.push('');
    lines.push('Die normative Regel steht in diesen Dokumenten, nicht hier:');
    lines.push('');
    for (const contract of contracts) lines.push(`- ${contract}`);
    lines.push('');
  }

  lines.push('## Dateien');
  lines.push('');
  lines.push('| Datei | LOC | Importiert von | Beziehungen |');
  lines.push('|---|---|---|---|');
  for (const file of files) {
    // Linkziel ist der modul-RELATIVE Pfad mit `./`-Praefix: `./greenhouse/…`.
    // Das ist nicht Kosmetik — der Doku-Referenz-Check loest einen Verweis nur
    // dann relativ zum Dokument auf, wenn er mit `./` oder `../` beginnt.
    // Ohne das Praefix wuerde `greenhouse/X.tsx` als repository-relativer
    // Wurzelpfad gelesen und als tote Referenz gemeldet.
    const relative = file.path.slice(module.path.length + 1);
    lines.push(
      `| [\`${relative}\`](./${relative}) | ${file.lines} | ${file.importedBy} | ${relationSummary(file)} |`,
    );
  }
  lines.push('');

  const exported = index.symbols.filter(
    (symbol) => symbol.exported && files.some((file) => file.path === symbol.file),
  );
  lines.push('## Öffentliche Symbole');
  lines.push('');
  if (exported.length === 0) {
    lines.push('Keine exportierten Symbole in diesem Modul.');
  } else {
    lines.push('| Symbol | Art | Datei | Zeile |');
    lines.push('|---|---|---|---|');
    for (const symbol of exported) {
      lines.push(`| \`${symbol.name}\` | ${symbol.kind} | \`${symbol.file}\` | ${symbol.line} |`);
    }
  }
  lines.push('');

  const dataRelations = index.relations.filter(
    (rel) => rel.type === 'PASS' && moduleOf(rel.from) === module.id && isIndexTarget(rel.to),
  );
  lines.push('## Datenfluss');
  lines.push('');
  if (dataRelations.length === 0) {
    lines.push('Keine aufgelösten Datenrelationen in diesem Modul.');
  } else {
    lines.push('Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).');
    lines.push('Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,');
    lines.push('nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.');
    lines.push('');
    lines.push('| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |');
    lines.push('|---|---|---|---|---|---|');
    for (const rel of dataRelations.slice(0, 40)) {
      lines.push(
        `| \`${rel.from}\` | ${rel.line} | \`${(rel.expression ?? '').replace(/\|/g, '\\|')}\` | ` +
          `${rel.position ?? '—'} | ${link(rel.to, '?', module.path)} | ${rel.toSymbol ?? '—'} |`,
      );
    }
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Ein Ziel taugt nur als Verweis, wenn es eine echte Repository-Datei ist.
 * Absolute Pfade (`C:/…/lib.es5.d.ts`) und Pfade ausserhalb des Tracks sind
 * entweder Bibliothek oder tot — beides gehoert nicht in eine
 * Navigationskarte, die einem Agenten sagen soll, wo der Code wohnt.
 */
function isIndexTarget(target: string | undefined): boolean {
  if (!target) return false;
  if (!target.includes('/') || !target.includes('.')) return false;
  if (target.includes('..')) return false;
  if (/^[A-Za-z]:/.test(target) || target.startsWith('/')) return false;
  return true;
}

/** Verhindert, dass der Index seine eigenen Ausgabedateien als Quelle zaehlt. */
function isGenerated(repoPath: string): boolean {
  return repoPath.endsWith('/INDEX.md') || repoPath === 'INDEX.md';
}

/** Kurze Relationszusammenfassung pro Datei — die Art, danach kann man fragen. */
function relationSummary(file: FileEntry): string {
  const counts = new Map<string, number>();
  for (const rel of file.relations) {
    counts.set(rel.type, (counts.get(rel.type) ?? 0) + 1);
  }
  const parts = [...counts.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  return parts.length > 0 ? parts.map(([type, count]) => `${type} ${count}`).join(', ') : '—';
}

/**
 * Baut einen klickbaren Verweis vom Modulordner auf ein Repository-Ziel.
 *
 * `src/bus` + `src/core/rng.ts` ergibt `../core/rng.ts` (Geschwister),
 * `src/bus` + `src/observers/visualObserver.ts` ergibt `../../observers/…`
 * (anderer Ast). Ein festes `../` je Ziel wäre für Geschwister richtig und für
 * alles andere falsch — und ein toter Link in einer Navigationskarte ist
 * schlimmer als gar keiner, weil der Agent ihm erst glaubt.
 */
function link(target: string | undefined, fallback: string, fromModule: string): string {
  if (!target || !isIndexTarget(target)) return fallback;
  const targetParts = target.split('/');
  const fromParts = fromModule.split('/');
  let common = 0;
  while (common < fromParts.length && common < targetParts.length && fromParts[common] === targetParts[common]) {
    common += 1;
  }
  const up = '../'.repeat(fromParts.length - common);
  const down = targetParts.slice(common).join('/');
  return `[\`${target}\`](${up}${down})`;
}

function list(values: string[]): string {
  if (values.length === 0) return '—';
  if (values.length <= 3) return values.map((v) => `\`${v}\``).join(', ');
  return `${values.slice(0, 3).map((v) => `\`${v}\``).join(', ')} +${values.length - 3}`;
}

/**
 * Schreibt den Index als JSON — stabile Reihenfolge, keine Zeitstempel.
 * Der JSON-Text ist die byteweise Referenz des `index:check`.
 */
export function renderIndexJson(index: Index): string {
  return `${JSON.stringify(
    {
      version: INDEX_VERSION,
      modules: index.modules,
      files: index.files,
      symbols: index.symbols,
      relations: index.relations,
      strings: index.strings,
      unresolvedCount: index.unresolvedCount,
      hotspots: index.hotspots,
    },
    null,
    2,
  )}\n`;
}

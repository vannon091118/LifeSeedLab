// Owner: IndexerSystem (Extraktions-Datenformen). LOC <= 200.
//
// Die Formen sind die EINZIGE Datenbasis des Navigationssystems: Indexer,
// Renderer, Validator und die generierten Markdown-Dateien sprechen alle
// dieselben Strukturen an. Ein Feld, das nur der Renderer kennt, waere eine
// zweite Wahrheit — und zwar eine, die beim naechsten Refactor still
// auseinanderlaeuft.
//
// Pfaddarstellung ist durchgaengig repository-relativ in POSIX-Form
// (`src/core/rng.ts`), weil das die einzige Schreibweise ist, die auf Windows,
// Linux und in einem Index-Dokument identisch aussieht.

/** Eine Diagnose aus dem Check. `error` blockiert, `warning` ist sichtbar. */
export interface Diagnostic {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
}

/** Eine getrackte Datei des Repositorys; der Pfad ist kanonisch (Repository-relativ, POSIX). */
export interface RepoFile {
  /** Repository-relativer POSIX-Pfad, z. B. `src/core/rng.ts`. */
  path: string;
  /** Verzeichnis, z. B. `src/core` (ohne führenden/trailing Slash). */
  dir: string;
  /** Dateiname mit Endung, z. B. `rng.ts`. */
  name: string;
  /** Endung ohne Punkt, z. B. `ts`. Leer bei `Dockerfile`-artigen Namen. */
  ext: string;
}

/**
 * Eine extrahierte Relation zwischen zwei Codebestandteilen.
 *
 * HARD-GRENZE (Slice 1): `target` ist entweder eine statisch aufgeloeste
 * Position oder das literale Feld `unresolved: true`. Es gibt kein drittes
 * Feld fuer "ich glaube, das ist X" — eine vermutete Beziehung, die als
 * aufgeloeste ausgegeben wird, waere ein Graph, der plausibel aussieht und
 * teilweise geraten ist. Genau das verbietet dieses System.
 */
export interface Relation {
  /** IMPORTS | EXPORTS | CALL | READ | WRITE | PASS | RETURN | STRING_REFERENCE */
  type: RelationType;
  /** Repository-relativer Pfad der Quelldatei. */
  from: string;
  /** Zeile der Quelle (1-basiert) — macht die Kante aufrufbar pruefbar. */
  line: number;
  /** Symbol in der Quelldatei, das die Kante traegt (Besitzer der AST-Node). */
  symbol: string;
  /** Aufgeloestes Ziel: Datei und optional Symbol. */
  to?: string;
  toSymbol?: string;
  /** true, wenn die Kante statisch nicht auflösbar war (mit `reason` belegt). */
  unresolved?: true;
  /**
   * true bei einem Paketimport (`react`, `node:fs`). Ein externes Paket ist
   * per Definition außerhalb des Repositorys — es ist KEINE offene Stelle
   * und wird deshalb getrennt geführt, damit `unresolvedCount` ausschließlich
   * echte Lücken zählt (relative Kante ohne Ziel).
   */
  external?: true;
  /** Warum nicht auflösbar — Pflicht bei `unresolved`, damit Lücken sichtbar sind. */
  reason?: string;
  /** Nur bei PASS: 1-basierte Parameterposition im Aufrufer. */
  position?: number;
  /** Nur bei PASS/READ/WRITE: der beobachtete Ausdruck als Text. */
  expression?: string;
}

export type RelationType =
  | 'IMPORTS'
  | 'EXPORTS'
  | 'CALL'
  | 'READ'
  | 'WRITE'
  | 'PASS'
  | 'RETURN'
  | 'STRING_REFERENCE';

/** Ein exportiertes oder lokales Symbol einer Datei. */
export interface SymbolEntry {
  /** Name des Symbols. */
  name: string;
  /** Repository-relativer Pfad der Datei. */
  file: string;
  /** Zeile der Deklaration. */
  line: number;
  /** Deklarationsform — entscheidet, ob `module.json.entryPoints` greift. */
  kind: 'function' | 'class' | 'const' | 'type' | 'interface' | 'enum' | 'variable';
  /** true, wenn das Symbol aus der Datei exportiert wird. */
  exported: boolean;
  /** Erste Signaturzeile — gekürzt, rein zur Orientierung im Modul-Index. */
  signature?: string;
}

/** Eine Datei mit ihren extrahierten Beziehungen. */
export interface FileEntry {
  path: string;
  module: string;
  /** Zeilen im File (rein informativ, nicht im Byte-Vergleich relevant). */
  lines: number;
  /** Aus this file herausgehende Kanten, stabil sortiert. */
  relations: Relation[];
  /** Deklarierte Symbole, stabil sortiert. */
  symbols: SymbolEntry[];
  /** Anzahl Dateien, die diese importieren (High-Fan-in). */
  importedBy: number;
}

/** Ein Ownership-Modul unter `src/`. */
export interface ModuleEntry {
  /** Modul-ID = Verzeichnisname (eindeutig, siehe `module.json`). */
  id: string;
  /** Repository-relativer Pfad, z. B. `src/core`. */
  path: string;
  /** Anzahl getrackter Quellcode-Dateien im Modul. */
  fileCount: number;
  /** IDs der Module, aus die diese Dateien importieren. */
  imports: string[];
  /** IDs der Module, die in dieses Modul importieren. */
  importedBy: string[];
  /** Aus den Relationsdaten abgeleitete Aufruf-Kanten zwischen Modulen. */
  calls: Array<{ to: string; count: number }>;
  /** Haeufigste importierte externe Pakete (nicht Teil von `allowedDependencies`). */
  externalDeps: string[];
}

/** Der vollstaendige Index — die eine Beziehungsquelle aller Ansichten. */
export interface Index {
  /** Schema-Version, damit ein alter Index nicht still akzeptiert wird. */
  version: number;
  modules: ModuleEntry[];
  files: FileEntry[];
  symbols: SymbolEntry[];
  relations: Relation[];
  /** String-Literale je Datei — die String-Matrix als Daten, nicht als Text. */
  strings: Array<{ file: string; line: number; value: string; symbol: string }>;
  /** Anzahl unauflösbarer Kanten — nie 0 ohne Begründung im Bericht. */
  unresolvedCount: number;
  /** High-Fan-in Knoten: Pfad -> Anzahl Importer, absteigend. */
  hotspots: Array<{ path: string; importedBy: number }>;
}

/** Schema-Version des Index-Formats. Bei Formatänderung hochzählen. */
export const INDEX_VERSION = 1;

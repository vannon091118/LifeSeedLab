// Owner: IndexerSystem (Extraktion). LOC <= 200.
//
// EINE Engine, EIN Ergebnis: Imports, Exporte, Symbole, Calls, Strings und
// Datenrelationen kommen alle aus demselben `ts.Program` und demselben
// TypeChecker. Wer später eine zweite Analyse danebenstellt, baut genau die
// zweite Wahrheit, die dieses System abschafft.
//
// Die Auflösungsregel ist streng: Was der TypeChecker nicht eindeutig
// auflösen kann, wird als `unresolved` markiert und NICHT geraten. Ein Graph,
// der vollständig aussieht und in Wahrheit teilweise geraten ist, ist
// schlimmer als kein Graph — weil niemand mehr nachsieht, wo er falsch liegt.

import ts from 'typescript';
import type { FileEntry, Relation, SymbolEntry } from './repo.ts';
import { moduleOf } from './inventory.ts';

/** Alles, was der Extraktor über den Program-Zustand wissen muss. */
export interface ExtractContext {
  checker: ts.TypeChecker;
  /** Repository-relativer Pfad -> SourceFile. */
  byPath: Map<string, ts.SourceFile>;
  /** Aufgelöster Dateiname (normalisiert) -> repository-relativer Pfad. */
  byResolved: Map<string, string>;
  /**
   * Nicht-TypeScript-Ziele, die der Code importiert: `.css`, `.json`, `.mjs`,
   * Source-Dateien. Sie tragen keine Relationsdaten, aber sie sind echte
   * Kanten — ein Import von `./index.css`, der als "unaufgelöst" gemeldet
   * wird, ist eine Diagnose, die den Empfänger des Problems beschuldigt.
   */
  knownAssets: Set<string>;
  /**
   * Alle versionierten Quellcode-Dateien des Repositorys, auch diejenigen
   * ausserhalb des tsconfig-`include` (`tests/`, `tools/`). Der TypeChecker
   * kennt sie nicht und kann endungslose Specifier dort nicht aufloesen —
   * die Endungsprobe in `resolveImport` braucht sie trotzdem.
   */
  knownModules: Set<string>;
  program: ts.Program;
}

/** Stabile Kanten-Sortierung: Typ, Ziel, Zeile, Symbol. */
function compareRelation(a: Relation, b: Relation): number {
  return (
    cmp(a.type, b.type) || cmp(a.to ?? '', b.to ?? '') || a.line - b.line || cmp(a.symbol, b.symbol)
  );
}

function compareSymbol(a: SymbolEntry, b: SymbolEntry): number {
  return cmp(a.name, b.name) || a.line - b.line;
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Normalisiert einen Dateinamen auf den Schlüssel des `byResolved`-Maps. */
function resolvedKey(fileName: string): string {
  return fileName.replace(/\\/g, '/');
}

/** Repository-relativer Pfad einer beliebigen SourceFile. */
function repoPathOf(ctx: ExtractContext, file: ts.SourceFile): string {
  return ctx.byResolved.get(resolvedKey(file.fileName)) ?? resolvedKey(file.fileName);
}

/** 1-basierte Zeile einer Position in der Datei. */
function lineOf(source: ts.SourceFile, pos: number): number {
  return source.getLineAndCharacterOfPosition(pos).line + 1;
}

/** Deklarationsform eines deklarierten Symbols. */
function symbolKind(node: ts.Declaration): SymbolEntry['kind'] {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) return 'function';
  if (ts.isClassDeclaration(node)) return 'class';
  if (ts.isInterfaceDeclaration(node)) return 'interface';
  if (ts.isTypeAliasDeclaration(node)) return 'type';
  if (ts.isEnumDeclaration(node)) return 'enum';
  if (ts.isVariableDeclaration(node)) return 'const';
  return 'variable';
}

/** Name einer Deklaration, sofern sie einen trägt. */
function declaredName(node: ts.Node): string | undefined {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isVariableDeclaration(node) ||
    ts.isMethodDeclaration(node)
  ) {
    return node.name && ts.isIdentifier(node.name) ? node.name.text : undefined;
  }
  return undefined;
}

function isDeclaration(node: ts.Node): node is ts.Declaration {
  return declaredName(node) !== undefined;
}

/** Kürzt eine Signatur auf eine Zeile — Orientierung, nie Vertragsinhalt. */
function signatureOf(node: ts.Declaration, source: ts.SourceFile): string | undefined {
  const text = node.getText(source).split('\n')[0].trim();
  return text.length > 120 ? undefined : text;
}

/**
 * Import-Kanten: specifier -> aufgelöste Datei.
 * Aliase lösen sich über `getTargetSymbol` auf, damit der Index den echten
 * Namen kennt statt des lokalen (`breed` -> `breedGenome`).
 */
function importRelations(
  ctx: ExtractContext,
  path: string,
  relations: Relation[],
): void {
  const source = ctx.byPath.get(path)!;
  const options = ctx.program.getCompilerOptions();

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const spec = statement.moduleSpecifier;
    if (!spec || !ts.isStringLiteral(spec)) continue;

    const to = resolveImport(ctx, path, spec.text, options);
    const external = !spec.text.startsWith('.');
    const localNames = importedNames(ctx, statement);

    relations.push({
      type: 'IMPORTS',
      from: path,
      line: lineOf(source, statement.getStart(source)),
      symbol: localNames.length > 0 ? localNames.join(', ').slice(0, 120) : spec.text,
      to,
      // Ein externes Paket (`react`, `node:fs`) ist KEINE Lücke: es liegt
      // per Definition außerhalb des Repositorys und wird deshalb weder
      // aufgelöst noch als unaufgelöst gemeldet — nur als Auszeichnung.
      // Unaufgelöst ist nur, was RELATIV zeigt und trotzdem nicht existiert.
      external: external || undefined,
      unresolved: to ? undefined : !external ? true : undefined,
      reason: to || external ? undefined : `Relativer Import nicht auflösbar: ${spec.text}`,
      expression: spec.text,
    });
  }
}

/**
 * Löst einen Import-Specifier auf eine repository-relative Datei auf.
 *
 * Reihenfolge: erst der TypeChecker (der die Symbolauflösung kennt), dann eine
 * eigene Endungsprobe für relative Specifier. Die eigene Probe ist nötig,
 * weil `ts.Program` mit expliziten rootNames und `moduleResolution: bundler`
 * Endungslose relative Angaben (`../types`) nicht zuordnen kann — obwohl das
 * Projekt sie über Vite tadellos auflöst. Ohne diese Probe wären über 1300
 * funktionierende Kanten als "unaufgelöst" gemeldet und damit als Lüge.
 */
function resolveImport(
  ctx: ExtractContext,
  from: string,
  specifier: string,
  options: ts.CompilerOptions,
): string | undefined {
  const resolved = ctx.program.getResolvedModule(ctx.byPath.get(from)!, specifier, options);
  if (resolved) {
    const file = ctx.program.getSourceFile(resolved.resolvedFileName);
    if (file) return repoPathOf(ctx, file);
  }
  if (!specifier.startsWith('.')) return undefined;

  const base = posixNormalize(posixDirname(from) + '/' + specifier);
  // Source-Dateien tragen eine Doppel-Endung im Namen: der Specifier
  // `../config/effects.source` zeigt auf `effects.source.ts`. Deshalb wird
  // auch `.source.ts` (und `.source.tsx`) geprüft — die Content-Wahrheit
  // ist kein Sonderfall, sondern der Normalfall dieses Projekts.
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mjs`,
    `${base}.js`,
    `${base}.css`,
    `${base}.json`,
    `${base}.source.ts`,
    `${base}.source.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ];
  // Reihenfolge ist bedeutsam: erst der exakte Pfad, dann die Endungsprobe.
  // `./check.ts` muss als Datei gefunden werden und nicht als `check.ts.ts`.
  for (const candidate of candidates) {
    if (ctx.byPath.has(candidate) || ctx.knownModules.has(candidate)) return candidate;
    if (ctx.knownAssets.has(candidate)) return candidate;
  }
  return undefined;
}

function posixDirname(p: string): string {
  const index = p.lastIndexOf('/');
  return index <= 0 ? '' : p.slice(0, index);
}

/**
 * Normalisiert `..`- und `.`-Segmente — die einzige Pfad-Arithmetik, die es
 * hier gibt.
 *
 * `..` verbraucht das letzte Segment, das selbst kein `..` ist. Die Bedingung
 * `length > 1` allein reicht nicht: bei `tests/../src` ist `tests` das erste
 * Segment und wird trotzdem korrekt entfernt. Sonst entstünde `tests/src/…`
 * statt `src/…` — und die Kante zeigt auf eine Datei, die es nicht gibt.
 */
function posixNormalize(p: string): string {
  const segments: string[] = [];
  for (const segment of p.split('/')) {
    if (segment === '.' || segment === '') {
      if (segments.length === 0 && segment === '') segments.push('');
      continue;
    }
    if (segment === '..') {
      const last = segments[segments.length - 1];
      if (segments.length > 0 && last !== '' && last !== '..') segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.join('/');
}

/** Importierte Namen einer Deklaration, Aliase auf den Zielnamen geführt. */
function importedNames(ctx: ExtractContext, node: ts.ImportDeclaration): string[] {
  const clause = node.importClause;
  if (!clause) return [];
  const parts: string[] = [];
  const named = clause.namedBindings;
  if (named && ts.isNamedImports(named)) {
    for (const element of named.elements) {
      const symbol = ctx.checker.getSymbolAtLocation(element.name);
      parts.push(symbol?.getName() ?? element.name.text);
    }
  }
  if (clause.name) parts.push(clause.name.text);
  return parts;
}

/** Exportierte und lokal deklarierte Symbole einer Datei. */
function symbolEntries(ctx: ExtractContext, path: string): SymbolEntry[] {
  const source = ctx.byPath.get(path)!;
  const found: SymbolEntry[] = [];

  const visit = (node: ts.Node): void => {
    if (isDeclaration(node)) {
      const name = declaredName(node)!;
      const symbol = ctx.checker.getSymbolAtLocation((node as ts.Declaration & ts.NamedDeclaration).name!);
      found.push({
        name,
        file: path,
        line: lineOf(source, node.getStart(source)),
        kind: symbolKind(node),
        exported: symbol ? isExported(symbol, ctx) : false,
        signature: signatureOf(node, source),
      });
    }
    ts.forEachChild(node, visit);
  };
  source.forEachChild(visit);
  return found.sort(compareSymbol);
}

/** Prüft anhand der Modul-Exporte, ob ein Symbol nach außen sichtbar ist. */
function isExported(symbol: ts.Symbol, ctx: ExtractContext): boolean {
  const declaration = symbol.getDeclarations()?.[0];
  if (!declaration) return false;
  const source = declaration.getSourceFile();
  const path = repoPathOf(ctx, source);
  const sourceSymbol = ctx.checker.getSymbolAtLocation(source);
  if (!sourceSymbol) return false;
  const exportedNames = new Set(ctx.checker.getExportsOfModule(sourceSymbol).map((s) => s.getName()));
  return exportedNames.has(symbol.getName());
}

/** Aufruf-, Lese-, Schreib- und String-Kanten einer Datei. */
function bodyRelations(ctx: ExtractContext, path: string, relations: Relation[]): void {
  const source = ctx.byPath.get(path)!;

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const symbol = ctx.checker.getSymbolAtLocation(node.expression);
      const declaration = symbol?.getDeclarations()?.[0];
      const targetFile = declaration ? repoPathOf(ctx, declaration.getSourceFile()) : undefined;
      const line = lineOf(source, node.getStart(source));
      const expression = node.expression.getText(source).slice(0, 80);
      relations.push({
        type: 'CALL',
        from: path,
        line,
        symbol: expression,
        to: targetFile,
        toSymbol: symbol?.getName(),
        unresolved: targetFile ? undefined : true,
        reason: targetFile ? undefined : `Aufrufziel nicht auflösbar: ${expression}`,
        expression,
      });
      node.arguments.forEach((argument, index) => {
        relations.push({
          type: 'PASS',
          from: path,
          line: lineOf(source, argument.getStart(source)),
          symbol: expression,
          to: targetFile,
          toSymbol: symbol?.getName(),
          unresolved: targetFile ? undefined : true,
          reason: targetFile ? undefined : `Zielsymbol nicht auflösbar: ${expression}`,
          position: index + 1,
          expression: argument.getText(source).slice(0, 80),
        });
      });
    }

    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const symbol = ctx.checker.getSymbolAtLocation(
        ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression,
      );
      const declaration = symbol?.getDeclarations()?.[0];
      const targetFile = declaration ? repoPathOf(ctx, declaration.getSourceFile()) : undefined;
      const line = lineOf(source, node.getStart(source));
      const expression = node.getText(source).slice(0, 80);
      relations.push({
        type: 'READ',
        from: path,
        line,
        symbol: expression,
        to: targetFile ?? path,
        toSymbol: symbol?.getName() ?? expression,
        expression,
      });
    }

    if (ts.isReturnStatement(node) && node.expression) {
      relations.push({
        type: 'RETURN',
        from: path,
        line: lineOf(source, node.getStart(source)),
        symbol: node.expression.getText(source).slice(0, 80),
        to: path,
        expression: node.expression.getText(source).slice(0, 80),
      });
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      relations.push({
        type: 'STRING_REFERENCE',
        from: path,
        line: lineOf(source, node.getStart(source)),
        symbol: node.getText(source).slice(0, 80),
        expression: node.text,
      });
    }

    ts.forEachChild(node, visit);
  };
  source.forEachChild(visit);
}

/** Doppelte Kanten entfernen — gleicher Typ/Datei/Zeile/Text ist eine Kante. */
function dedupe(relations: Relation[]): Relation[] {
  const seen = new Set<string>();
  const result: Relation[] = [];
  for (const rel of relations) {
    const key = [rel.type, rel.line, rel.to ?? '', rel.toSymbol ?? '', rel.symbol].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(rel);
  }
  return result;
}

/** Eine Datei vollständig extrahieren. */
export function extractFile(ctx: ExtractContext, path: string): FileEntry {
  const relations: Relation[] = [];
  importRelations(ctx, path, relations);
  bodyRelations(ctx, path, relations);

  const symbols = symbolEntries(ctx, path);
  for (const symbol of symbols) {
    if (symbol.exported) {
      relations.push({
        type: 'EXPORTS',
        from: path,
        line: symbol.line,
        symbol: symbol.name,
        to: path,
        toSymbol: symbol.name,
      });
    }
  }

  return {
    path,
    module: moduleOf(path),
    lines: (ctx.byPath.get(path)?.getLineStarts().length ?? 0) - 1,
    relations: dedupe(relations).sort(compareRelation),
    symbols,
    importedBy: 0,
  };
}

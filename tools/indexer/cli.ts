// Owner: IndexerSystem (CLI). LOC <= 200.
//
// Zwei Modi, eine Datenquelle:
//   build  — erzeugt .index/index.json, Root INDEX.md und alle Modul-INDEXe
//   check  — erzeugt dasselbe in-memory und vergleicht byteweise, schreibt nichts
//
// Der Check schreibt niemals etwas. Ein Prüfer, der beim Prüfen repariert,
// ist kein Prüfer mehr, sondern ein Autofix mit Überraschungen — und die
// Abweichung, die er gerade unsichtbar gemacht hat, ist genau die, die man
// sehen wollte.
//
// Aufruf (aus dem Repository-Root):
//   node tools/indexer/cli.ts build
//   node tools/indexer/cli.ts check

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { extractFile, type ExtractContext } from './extract.ts';
import {
  compareCodeUnits, isAssetFile, moduleIds, sourceFiles, toRepoFile, toRepoRelative, trackedFiles, untrackedSourceFiles,
} from './inventory.ts';
import { renderIndexJson, renderModuleIndex, renderRootIndex } from './render.ts';
import { INDEX_VERSION, type FileEntry, type Index, type ModuleEntry } from './repo.ts';

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');

/** Baut das TypeScript-Program aus der Projekt-tsconfig — keine zweite Config. */
function buildProgram(files: string[]): ts.Program {
  const configPath = path.join(REPO_ROOT, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config ?? {}, ts.sys, REPO_ROOT);
  return ts.createProgram({ rootNames: files, options: parsed.options });
}

/** Die Schnittstelle zwischen TypeScript und dem Repository-Pfadschema. */
function extractionContext(program: ts.Program): ExtractContext {
  const byPath = new Map<string, ts.SourceFile>();
  const byResolved = new Map<string, string>();
  for (const source of program.getSourceFiles()) {
    if (source.isDeclarationFile) continue;
    const key = source.fileName.replace(/\\/g, '/');
    const repo = toRepoRelative(REPO_ROOT, source.fileName);
    byPath.set(repo, source);
    byResolved.set(key, repo);
  }
  const knownAssets = new Set(assetFiles().filter((file) => !byPath.has(file)));
  const knownModules = new Set<string>();
  return { checker: program.getTypeChecker(), byPath, byResolved, knownAssets, knownModules, program };
}

/**
 * Nicht-TypeScript-Dateien, die der Code importieren kann (Styles, JSON,
 * Source-Wahrheiten, Skripte). Sie gehören zum Repository und damit zu den
 * Kanten — sie tragen nur keine Symbol-Relationen.
 */
function assetFiles(): string[] {
  return trackedFiles(REPO_ROOT).filter(isAssetFile);
}

/** Fasst die Extraktion zu Modulen zusammen und berechnet Fan-in und Aufrufe. */
function aggregate(files: FileEntry[]): { modules: ModuleEntry[]; hotspots: Index['hotspots'] } {
  const byModule = new Map<string, FileEntry[]>();
  for (const file of files) {
    const list = byModule.get(file.module) ?? [];
    list.push(file);
    byModule.set(file.module, list);
  }

  const moduleImports = new Map<string, Set<string>>();
  const moduleCalls = new Map<string, Map<string, number>>();
  const importedByCount = new Map<string, number>();

  for (const file of files) {
    const importer = file.module;
    for (const rel of file.relations) {
      if (rel.type === 'IMPORTS' && rel.to) {
        const targetModule = targetModuleOf(rel.to, byModule);
        if (!targetModule || targetModule === importer) continue;
        const set = moduleImports.get(targetModule) ?? new Set<string>();
        set.add(importer);
        moduleImports.set(targetModule, set);
        importedByCount.set(rel.to, (importedByCount.get(rel.to) ?? 0) + 1);
      }
      if (rel.type === 'CALL' && rel.to) {
        const targetModule = targetModuleOf(rel.to, byModule);
        if (!targetModule || targetModule === importer) continue;
        const counts = moduleCalls.get(importer) ?? new Map<string, number>();
        counts.set(targetModule, (counts.get(targetModule) ?? 0) + 1);
        moduleCalls.set(importer, counts);
      }
    }
  }

  const modules: ModuleEntry[] = [...byModule.entries()]
    .filter(([id]) => id.length > 0)
    .map(([id, moduleFiles]) => ({
      id,
      path: id === 'src' ? 'src' : `src/${id}`,
      fileCount: moduleFiles.length,
      imports: [...new Set(moduleFiles.flatMap((file) => [...(moduleImports.get(id) ?? [])]))].sort(
        compareCodeUnits,
      ),
      importedBy: [],
      calls: [...(moduleCalls.get(id) ?? new Map<string, number>())]
        .map(([to, count]) => ({ to, count }))
        .sort((a, b) => compareCodeUnits(a.to, b.to)),
      externalDeps: [],
    }))
    .sort((a, b) => compareCodeUnits(a.id, b.id));

  // Rückkanten (importedBy) aus den gesammelten Vorwaerten ableiten.
  for (const target of modules) {
    const importers = new Set<string>();
    for (const [targetModule, sources] of moduleImports) {
      if (targetModule === target.id) sources.forEach((source) => importers.add(source));
    }
    target.importedBy = [...importers].sort(compareCodeUnits);
  }

  for (const file of files) {
    file.importedBy = importedByCount.get(file.path) ?? 0;
  }

  const hotspots = [...files]
    .filter((file) => file.importedBy > 0)
    .map((file) => ({ path: file.path, importedBy: file.importedBy }))
    .sort((a, b) => b.importedBy - a.importedBy || compareCodeUnits(a.path, b.path))
    .slice(0, 20);

  return { modules, hotspots };
}

/** Das Modul, in dem eine aufgelöste Datei liegt (leer, wenn außerhalb von src). */
function targetModuleOf(target: string, byModule: Map<string, FileEntry[]>): string {
  if (!target.startsWith('src/')) return '';
  const module = target.split('/')[1] ?? '';
  if (module.includes('.')) return byModule.has('src') ? 'src' : '';
  return byModule.has(module) ? module : '';
}

/** Führt den ganzen Build aus und liefert den Index — die eine Quelle. */
export function buildIndex(): Index {
  const repoFiles = sourceFiles(REPO_ROOT)
    .map((file) => file.path)
    // Der Index zaehlt nicht sich selbst: eine erzeugte INDEX.md ist eine
    // Ausgabe, kein Quellcode. Ohne diesen Filter waechse der Dateibestand
    // bei jedem Build um die eigene Ausgabe — ein Index, der sich selbst
    // frisst, ist irgendwann nur noch Rauschen.
    .filter((repoPath) => !repoPath.endsWith('INDEX.md'));
  const program = buildProgram(repoFiles);
  const ctx = extractionContext(program);

  // Endungslose Specifier auf existierende Dateien (`../config/effects.source`
  // -> `effects.source.ts`) kann der TypeChecker nicht aufloesen, wenn die
  // importierende Datei ausserhalb des tsconfig-`include` liegt (tests/, tools/).
  // Sie sind trotzdem gueltige Kanten. Deshalb traegt `knownModules` das
  // versionierte Repo-Inventar — getrennt vom Program, damit dort keine
  // Null-Eintraege entstehen, die spaeter als "gefunden" gelten.
  for (const repoPath of repoFiles) ctx.knownModules.add(repoPath);

  const files: FileEntry[] = [];
  for (const repoPath of repoFiles) {
    if (!ctx.byPath.has(repoPath)) continue;
    files.push(extractFile(ctx, repoPath));
  }
  files.sort((a, b) => compareCodeUnits(a.path, b.path));

  const { modules, hotspots } = aggregate(files);
  const allRelations = files.flatMap((file) => file.relations);
  return {
    version: INDEX_VERSION,
    modules,
    files,
    symbols: files.flatMap((file) => file.symbols).sort((a, b) => compareCodeUnits(a.name, b.name) || a.line - b.line),
    relations: allRelations,
    strings: allRelations
      .filter((rel) => rel.type === 'STRING_REFERENCE')
      .map((rel) => ({ file: rel.from, line: rel.line, value: rel.expression ?? '', symbol: rel.symbol })),
    unresolvedCount: allRelations.filter((rel) => rel.unresolved).length,
    hotspots,
  };
}

/** Schreibt nur tatsächlich veränderte Index-Ausgaben. */
function writeIfChanged(file: string, content: string): boolean {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

/** Schreibt alle erzeugten Dateien — der einzige Ort, der auf die Platte schreibt. */
export function writeIndex(index: Index, repoRoot = REPO_ROOT): string[] {
  const written: string[] = [];
  const indexDir = path.join(repoRoot, '.index');
  const outputs: Array<[string, string]> = [
    [path.join(indexDir, 'index.json'), renderIndexJson(index)],
    [path.join(repoRoot, 'INDEX.md'), renderRootIndex(index, repositorySections())],
  ];
  for (const module of index.modules) {
    outputs.push([path.join(repoRoot, module.path, 'INDEX.md'), renderModuleIndex(module, index, [])]);
  }
  for (const [file, content] of outputs) {
    if (writeIfChanged(file, content)) written.push(file);
  }
  return written;
}

/** Die Bereiche des Repositorys, die kein Ownership-Modul unter src/ sind. */
function repositorySections(): Array<{ title: string; entries: string[] }> {
  return [
    { title: 'Root-Infrastruktur', entries: ['package.json', 'tsconfig.json', 'index.html', 'AGENTS.md'] },
    { title: 'Dokumentation / Verträge', entries: ['docs/architecture/', 'docs/quality/', 'docs/process/'] },
    { title: 'Werkzeuge', entries: ['tools/indexer/', 'tools/shinon/', 'scripts/'] },
  ];
}

function untrackedIndexInputs(repoRoot: string): string[] {
  return untrackedSourceFiles(repoRoot).filter((repoPath) => !repoPath.endsWith('INDEX.md'));
}

/** Prüft den gespeicherten Index gegen eine frische Extraktion — ohne Schreiben. */
export function checkIndex(index: Index, repoRoot = REPO_ROOT): number {
  const indexDir = path.join(repoRoot, '.index');
  const expected = new Map<string, string>();
  expected.set(path.join(indexDir, 'index.json'), renderIndexJson(index));
  expected.set(path.join(repoRoot, 'INDEX.md'), renderRootIndex(index, repositorySections()));
  for (const module of index.modules) {
    expected.set(
      path.join(repoRoot, module.path, 'INDEX.md'),
      renderModuleIndex(module, index, []),
    );
  }

  const problems: string[] = [];
  const untrackedSources = untrackedIndexInputs(repoRoot);
  if (untrackedSources.length > 0) {
    problems.push(
      `untracked: ${untrackedSources.join(', ')} (git add ausführen, danach index:build)`,
    );
  }
  for (const [file, content] of expected) {
    if (!fs.existsSync(file)) {
      problems.push(`fehlt: ${toRepoRelative(repoRoot, file)} (index:build ausführen)`);
      continue;
    }
    const actual = fs.readFileSync(file, 'utf8');
    if (actual !== content) {
      problems.push(`veraltet: ${toRepoRelative(repoRoot, file)} (index:build ausführen)`);
    }
  }
  if (problems.length > 0) {
    for (const problem of problems) console.error(`✗ ${problem}`);
    return 1;
  }
  console.log(`✓ Index aktuell — ${index.files.length} Dateien, ${index.relations.length} Kanten, ${index.unresolvedCount} unaufgelöst`);
  return 0;
}

function main(): void {
  const command = process.argv[2] ?? 'check';
  if (command !== 'build' && command !== 'check') {
    console.error(`Unbekannter Befehl: ${command} (erwartet: build | check)`);
    process.exit(2);
  }
  const untracked = untrackedIndexInputs(REPO_ROOT);
  if (command === 'build' && untracked.length > 0) {
    console.error(`✗ index:build verweigert untracked Indexquellen: ${untracked.join(', ')} (git add ausführen)`);
    process.exit(1);
  }
  const index = buildIndex();
  if (command === 'build') {
    const written = writeIndex(index);
    console.log(`✓ Index erzeugt — ${written.length} Dateien, ${index.files.length} Quellcode-Dateien, ${index.modules.length} Module`);
    for (const file of written) console.log(`  ${toRepoRelative(REPO_ROOT, file)}`);
    return;
  }
  process.exit(checkIndex(index));
}

if (process.argv[1] && toRepoRelative(REPO_ROOT, process.argv[1]).endsWith('tools/indexer/cli.ts')) {
  main();
}

export { moduleIds };

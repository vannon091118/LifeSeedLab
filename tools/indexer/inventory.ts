// Owner: IndexerSystem (Inventar). LOC <= 200.
//
// Schritt 1 des Builds: das Repository einlesen. Das ist bewusst KEIN
// Verzeichnisbaum-Walk, sondern der Git-Arbeitsbestand: versionierte Dateien
// aus `git ls-files` plus untracked Dateien aus `git status`. Dadurch bleibt der
// Build klein und deterministisch, während `index:check` eine neue Datei nicht
// mehr als unsichtbar bestätigen kann.

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { RepoFile } from './repo.ts';
import { isAssetFile, isIndexInput } from './input-policy.ts';

/** Dateiendungen, die als Quellcode gelten (und damit Relationsdaten tragen). */
const SOURCE_EXTENSIONS = new Set(['ts', 'tsx']);

/** Verzeichnisse, die nie Code enthalten — Laufzeit- und Werkzeugbestand. */
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  '.index',
]);

/** Holt die Liste der versionierten Dateien über den Git-Index. */
export function trackedFiles(repoRoot: string): string[] {
  const output = execFileSync('git', ['ls-files'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort(compareCodeUnits);
}

/** Holt untracked Dateien, die Git als einzelne Pfade meldet. */
export function untrackedFiles(repoRoot: string): string[] {
  const output = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return output
    .split('\0')
    .filter((entry) => entry.startsWith('?? '))
    .map((entry) => entry.slice(3))
    .filter((file) => file.length > 0)
    .sort(compareCodeUnits);
}

/** Der vollständige Arbeitsbestand für Inventar- und Diagnosezwecke. */
export function repositoryFiles(repoRoot: string): string[] {
  return [...new Set([...trackedFiles(repoRoot), ...untrackedFiles(repoRoot)])].sort(compareCodeUnits);
}

/** Untracked Quell- und Asset-Dateien, die der Index vor dem Build melden muss. */
export function untrackedSourceFiles(repoRoot: string): string[] {
  return untrackedFiles(repoRoot).filter(isIndexInput);
}

/** Code-Units-Vergleich — sprachneutral, deterministisch, ohne `localeCompare`. */
function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Zerlegt einen Pfad in die Bestandteile des Dateisystems (POSIX). */
function parts(p: string): string[] {
  return p.split('/').filter((part) => part.length > 0);
}

/** Erzeugt den Datei-Eintrag mit Verzeichnis, Name und Endung. */
export function toRepoFile(repoPath: string): RepoFile {
  const segments = parts(repoPath);
  const name = segments.length > 0 ? segments[segments.length - 1] : repoPath;
  const dot = name.lastIndexOf('.');
  return {
    path: repoPath,
    dir: segments.slice(0, -1).join('/'),
    name,
    ext: dot > 0 ? name.slice(dot + 1) : '',
  };
}

/** Nur versionierte Quellcodedateien sind gültige Indexquellen. */
export function sourceFiles(repoRoot: string): RepoFile[] {
  return trackedFiles(repoRoot)
    .filter((repoPath) => {
      const file = toRepoFile(repoPath);
      if (!SOURCE_EXTENSIONS.has(file.ext)) return false;
      return !parts(file.dir).some((segment) => IGNORED_DIRS.has(segment));
    })
    .map(toRepoFile);
}

/**
 * Das Ownership-Modul einer Datei: das Verzeichnis direkt unter `src/`.
 *
 * Dateien direkt in `src/` haben KEIN Modul — sie gehören zu `src/` selbst.
 * `src/App.tsx` hat den Besitzer `src` (den Bootstrap-Bereich), nicht etwa
 * `App.tsx`: ein Dateiname ist nie ein Modul, sonst hieße jede Datei am Ende
 * nach sich selbst. Der Architecture-Check meldet diesen Zustand später als
 * Fehler (Ownership Closure) — bis dahin ist er mindestens benannt statt
 * stillschweigend falsch zugeordnet.
 */
export function moduleOf(repoPath: string): string {
  const segments = parts(repoPath);
  if (segments[0] !== 'src') return '';
  if (segments.length <= 1) return 'src';
  const module = segments[1];
  return module.includes('.') ? 'src' : module;
}

/** Die Modul-IDs, die im Bestand tatsächlich als Verzeichnis existieren. */
export function moduleIds(repoRoot: string): string[] {
  const ids = new Set<string>();
  for (const file of sourceFiles(repoRoot)) {
    const id = moduleOf(file.path);
    if (id.length > 0) ids.add(id);
  }
  return [...ids].sort(compareCodeUnits);
}

/**
 * Die Zuordnungsmechanik: Repository-Pfad -> Bereich -> Kategorie.
 *
 * Längster passender Bereichspfad gewinnt, eine ausdrücklich definierte
 * technische Ausnahme schlägt die normale Pfadzuordnung. Genau diese Regel
 * liest später der Validator, damit Index und Check nicht auseinanderlaufen.
 */
export interface Area {
  /** Repository-relativer Pfad dieses Bereichs, z. B. `src/` oder `tools/`. */
  path: string;
  /** Kategorie laut Architecture-Contract. */
  category: string;
  /** Modul-ID innerhalb von `src/`, sonst leer. */
  module?: string;
  /** Technische Ausnahmen haben Vorrang vor der normalen Pfadzuordnung. */
  exception?: boolean;
}

/** Löst einen Pfad gegen die Bereichsliste auf (längster Treffer gewinnt). */
export function resolveArea(repoPath: string, areas: Area[]): Area | undefined {
  let best: Area | undefined;
  let bestLength = -1;
  for (const area of areas) {
    const prefix = area.path.endsWith('/') ? area.path : `${area.path}/`;
    if (repoPath !== area.path && !repoPath.startsWith(prefix)) continue;
    if (area.length > bestLength) {
      best = area;
      bestLength = area.length;
    }
  }
  if (best?.exception) return best;
  const normal = areas
    .filter((area) => !area.exception)
    .filter((area) => {
      const prefix = area.path.endsWith('/') ? area.path : `${area.path}/`;
      return repoPath === area.path || repoPath.startsWith(prefix);
    })
    .sort((a, b) => b.path.length - a.path.length)[0];
  return normal ?? best;
}

/** Wandelt einen absoluten Pfad in einen repository-relativen POSIX-Pfad. */
export function toRepoRelative(repoRoot: string, absolute: string): string {
  const relative = path.relative(repoRoot, absolute);
  return relative.split(path.sep).join('/');
}

export { compareCodeUnits, isAssetFile };

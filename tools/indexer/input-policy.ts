const SOURCE_EXTENSIONS = new Set(['ts', 'tsx']);
const ASSET_EXTENSIONS = new Set(['css', 'json', 'mjs', 'js', 'svg', 'png']);

function extensionOf(repoPath: string): string {
  const name = repoPath.slice(repoPath.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1) : '';
}

/** Dateiendungen, die als Asset-Kante im Index berücksichtigt werden. */
export function isAssetFile(repoPath: string): boolean {
  const name = repoPath.slice(repoPath.lastIndexOf('/') + 1);
  return ASSET_EXTENSIONS.has(extensionOf(repoPath)) || name.includes('.source.');
}

/** Ob eine Datei als gültige Indexquelle behandelt werden darf. */
export function isIndexInput(repoPath: string): boolean {
  return SOURCE_EXTENSIONS.has(extensionOf(repoPath)) || isAssetFile(repoPath);
}

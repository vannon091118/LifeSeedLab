import fs from 'node:fs/promises';
import ts from 'typescript';

/** Node can execute the CLI's TypeScript modules without downloading a second runtime. */
export async function load(url, context, nextLoad) {
  if (!url.endsWith('.ts')) return nextLoad(url, context);

  const source = await fs.readFile(new URL(url), 'utf8');
  const output = ts.transpileModule(source, {
    fileName: url,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      sourceMap: false,
    },
  }).outputText;

  return { format: 'module', source: output, shortCircuit: true };
}

import { register } from 'node:module';

register('./hook-loader.mjs', import.meta.url);
await import('./cli.ts');

import { build } from 'esbuild';
import { mkdir } from 'fs/promises';

await mkdir('workbench/dist/main', { recursive: true });

await build({
  entryPoints: [
    'workbench/main/index.ts',
    'workbench/main/preload.ts',
  ],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outdir: 'workbench/dist/main',
  outExtension: { '.js': '.cjs' },
  external: ['electron'],
  sourcemap: true,
});

console.log('[workbench] Main process compiled.');

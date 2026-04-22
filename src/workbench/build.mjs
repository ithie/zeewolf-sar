// Compiles the Electron main process (TypeScript → CommonJS) into src/workbench/dist/.
// Electron cannot run TypeScript directly — this build step is required before launch.
// tsc handles type-checking only (noEmit); esbuild produces the actual output.
import { build } from 'esbuild';
import { mkdir } from 'fs/promises';

await mkdir('src/workbench/dist/main', { recursive: true });

await build({
  entryPoints: [
    'src/workbench/main/index.ts',
    'src/workbench/main/preload.ts',
  ],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outdir: 'src/workbench/dist/main',
  outExtension: { '.js': '.cjs' },
  external: ['electron'],
  sourcemap: true,
});

console.log('[workbench] Main process compiled.');

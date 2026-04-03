import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { gzipSync } from 'zlib';
import type { Plugin } from 'vite';
import { zsongPlugin } from './plugins/zsong';
import { zdefPlugin } from './plugins/zdef';
import { makeSingleFile } from './plugins/make-single-file';
import { injectCookieBanner } from './plugins/inject-cookie-banner';

const GZIP_WARN_THRESHOLD = 500 * 1024; // 500 kB

const bundleSizeGuard = (): Plugin => ({
    name: 'bundle-size-guard',
    closeBundle() {
        const outFile = resolve(__dirname, 'dist/index.html');
        let raw: Buffer;
        try { raw = readFileSync(outFile); } catch { return; }
        const gzipped = gzipSync(raw).length;
        const kb = (gzipped / 1024).toFixed(1);
        if (gzipped > GZIP_WARN_THRESHOLD) {
            console.warn(`\n⚠  Bundle size warning: dist/index.html is ${kb} kB gzipped (threshold: ${GZIP_WARN_THRESHOLD / 1024} kB)\n`);
        } else {
            console.info(`✓  Bundle size: dist/index.html ${kb} kB gzipped`);
        }
    },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { version } = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig(() => {
    return {
        define: { __APP_VERSION__: JSON.stringify(version) },
        plugins: [zsongPlugin(), zdefPlugin(), injectCookieBanner(), makeSingleFile(), bundleSizeGuard()],
        build: {
            outDir: 'dist/',

            emptyOutDir: false,

            rollupOptions: {
                input: resolve(__dirname, 'index.html'),
            },
            assetsInlineLimit: 100000000,
        },
    };
});

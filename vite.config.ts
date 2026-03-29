import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { zsongPlugin } from './plugins/zsong';
import { zdefPlugin } from './plugins/zdef';
import { makeSingleFile } from './plugins/make-single-file';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(() => {
    return {
        plugins: [zsongPlugin(), zdefPlugin(), makeSingleFile()],
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

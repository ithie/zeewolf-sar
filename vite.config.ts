import { defineConfig, Plugin } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const makeSingleFile = (): Plugin => ({
    name: 'inline-assets',
    enforce: 'post',
    transformIndexHtml(html, context) {
        let newHtml = html;
        const bundle = context.bundle;
        if (!bundle) return html;

        for (const chunk of Object.values(bundle)) {
            if (chunk.type === 'asset' && chunk.fileName.endsWith('.css')) {
                newHtml = newHtml.replace(
                    new RegExp(`<link[^>]*?href="[^"]*?${chunk.fileName}"[^>]*?>`),
                    `<style>\n${chunk.source}\n</style>`
                );
                delete bundle[chunk.fileName];
            } else if (chunk.type === 'chunk' && chunk.isEntry) {
                newHtml = newHtml.replace(
                    new RegExp(`<script[^>]*?src="[^"]*?${chunk.fileName}"[^>]*?></script>`),
                    `<script type="module">\n${chunk.code}\n</script>`
                );
                delete bundle[chunk.fileName];
            }
        }
        return newHtml.replace(/<link rel="modulepreload"[^>]*?>/g, '');
    },
});

export default defineConfig(() => {
    return {
        plugins: [makeSingleFile()],
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

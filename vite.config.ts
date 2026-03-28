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
                const css = chunk.source as string;
                newHtml = newHtml.replace(
                    new RegExp(`<link[^>]*?href="[^"]*?${chunk.fileName}"[^>]*?>`),
                    () => `<style>\n${css}\n</style>`
                );
                delete bundle[chunk.fileName];
            } else if (chunk.type === 'chunk' && chunk.isEntry) {
                const code = chunk.code.replace('isMuted:!0', 'isMuted:!1').replace('isMuted: true', 'isMuted: false');
                newHtml = newHtml.replace(
                    new RegExp(`<script[^>]*?src="[^"]*?${chunk.fileName}"[^>]*?></script>`),
                    () => `<script type="module">\n${code}\n</script>`
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

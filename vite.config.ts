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

export default defineConfig(({ mode }) => {
    const isEditorBuild = mode === 'editor';

    return {
        plugins: [makeSingleFile()],
        build: {
            // Trennung der Ausgabeverzeichnisse
            outDir: isEditorBuild ? 'dist/editor' : 'dist',

            // Da wir jetzt in Unterordner bauen, können wir das Leeren
            // wieder auf true setzen, damit alte Artefakte verschwinden.
            emptyOutDir: true,

            rollupOptions: {
                input: isEditorBuild ? resolve(__dirname, 'editor.html') : resolve(__dirname, 'index.html'),
            },
            assetsInlineLimit: 100000000,
        },
    };
});

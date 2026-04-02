import type { Plugin } from 'vite';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const injectCookieBanner = (): Plugin => ({
    name: 'inject-cookie-banner',
    enforce: 'pre',
    transformIndexHtml(html, context) {
        if (!context.bundle) return html; // dev: JS handles it at runtime
        const inner = readFileSync(
            resolve(__dirname, '../src/game/ui/cookie-banner/cookie-banner-content.html'),
            'utf-8'
        );
        return html.replace(
            '<div id="cookie-banner"></div>',
            `<div id="cookie-banner">\n${inner}\n        </div>`
        );
    },
});

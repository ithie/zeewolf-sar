import type { Plugin } from 'vite';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type ChangelogEntry = { version: string; title: string; items: string[] };

const parseLatest = (): ChangelogEntry => {
    const md = readFileSync(resolve(__dirname, '../CHANGELOG.md'), 'utf-8');
    const match = md.match(/^## (v[\d.]+) — (.+?)\n([\s\S]+?)(?=\n---|\n## |$)/m);
    if (!match) return { version: '', title: '', items: [] };
    const version = match[1];
    const title   = match[2].trim();
    const items   = [...match[3].matchAll(/^- (.+)$/gm)].map(m => m[1].trim());
    return { version, title, items };
};

export const changelogLatestPlugin = (): Plugin => ({
    name: 'changelog-latest',
    config() {
        const entry = parseLatest();
        return { define: { __WHATS_NEW__: JSON.stringify(entry) } };
    },
});

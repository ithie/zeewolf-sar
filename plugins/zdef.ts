import type { Plugin } from 'vite';

export const zdefPlugin = (): Plugin => ({
    name: 'zdef',
    transform(code: string, id: string) {
        if (!id.endsWith('.zdef')) return null;
        return { code: `export default ${code};`, map: null };
    },
});

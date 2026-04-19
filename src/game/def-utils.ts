import type { DEF, DEFFace } from './defs';

const _rotateVerts = (
    verts: number[][],
    pivot: [number, number, number],
    axis: [number, number, number],
    angle: number,
): number[][] => {
    const [px, py, pz] = pivot;
    const [ax, ay, az] = axis;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const t = 1 - cos;
    return verts.map(([x, y, z]) => {
        const dx = x - px, dy = y - py, dz = z - pz;
        const dot = ax * dx + ay * dy + az * dz;
        return [
            px + dx * cos + (ay * dz - az * dy) * sin + ax * dot * t,
            py + dy * cos + (az * dx - ax * dz) * sin + ay * dot * t,
            pz + dz * cos + (ax * dy - ay * dx) * sin + az * dot * t,
        ];
    });
};

/**
 * Bakes parts (and legacy rotateNodes) into regular faces by applying Rodrigues' rotation formula.
 * opts.only filters which part IDs to include (default: all parts).
 * Call this each frame before passing a DEF to SceneRenderer.
 */
const applyParts = (def: DEF, params: Record<string, number>, opts?: { only?: string[] }): DEF => {
    const extraFaces: DEFFace[] = [];

    if (def.parts?.length) {
        for (const part of def.parts) {
            if (opts?.only && !opts.only.includes(part.id)) continue;
            if (part.rotate) {
                const angle = params[part.rotate.param] ?? 0;
                for (const face of part.faces) {
                    extraFaces.push({ ...face, verts: _rotateVerts(face.verts, part.rotate.pivot, part.rotate.axis, angle) });
                }
            } else {
                extraFaces.push(...part.faces);
            }
        }
    }

    if (def.rotateNodes?.length) {
        for (const node of def.rotateNodes) {
            const angle = params[node.param] ?? 0;
            for (const face of node.faces) {
                extraFaces.push({ ...face, verts: _rotateVerts(face.verts, node.pivot, node.axis, angle) });
            }
        }
    }

    return { ...def, faces: [...def.faces, ...extraFaces] };
};

const applyRotateNodes = (def: DEF, params: Record<string, number>): DEF => applyParts(def, params);

export { applyParts, applyRotateNodes };

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
 * Parts with a parent field are rotated in the already-transformed space of their parent.
 * Call this each frame before passing a DEF to SceneRenderer.
 */
const applyParts = (def: DEF, params: Record<string, number>, opts?: { only?: string[] }): DEF => {
    const extraFaces: DEFFace[] = [];

    if (def.parts?.length) {
        const partMap = new Map(def.parts.map(p => [p.id, p]));
        const rotFnCache = new Map<string, (verts: number[][]) => number[][]>();

        const getRotFn = (partId: string): (verts: number[][]) => number[][] => {
            if (rotFnCache.has(partId)) return rotFnCache.get(partId)!;
            const part = partMap.get(partId);
            if (!part) {
                const identity = (v: number[][]) => v;
                rotFnCache.set(partId, identity);
                return identity;
            }

            let fn: (verts: number[][]) => number[][];
            if (part.parent) {
                const parentFn = getRotFn(part.parent);
                if (part.rotate) {
                    const angle = params[part.rotate.param] ?? 0;
                    const tPivot = parentFn([part.rotate.pivot])[0] as [number, number, number];
                    const { axis } = part.rotate;
                    fn = (verts) => _rotateVerts(parentFn(verts), tPivot, axis, angle);
                } else {
                    fn = parentFn;
                }
            } else if (part.rotate) {
                const angle = params[part.rotate.param] ?? 0;
                const { pivot, axis } = part.rotate;
                fn = (verts) => _rotateVerts(verts, pivot, axis, angle);
            } else {
                fn = (verts) => verts;
            }

            rotFnCache.set(partId, fn);
            return fn;
        };

        for (const part of def.parts) {
            if (opts?.only && !opts.only.includes(part.id)) continue;
            const rotFn = getRotFn(part.id);
            for (const face of part.faces) {
                extraFaces.push({ ...face, verts: rotFn(face.verts) });
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

/**
 * Returns the world-space pivot position for every part that has a rotate node,
 * after applying the full parent-chain transformation.
 * Use this to draw pivot indicators that follow their parent's animation.
 */
const getTransformedPivots = (def: DEF, params: Record<string, number>): Map<string, [number, number, number]> => {
    const result = new Map<string, [number, number, number]>();
    if (!def.parts?.length) return result;

    const partMap = new Map(def.parts.map(p => [p.id, p]));
    const rotFnCache = new Map<string, (verts: number[][]) => number[][]>();

    const getRotFn = (partId: string): (verts: number[][]) => number[][] => {
        if (rotFnCache.has(partId)) return rotFnCache.get(partId)!;
        const part = partMap.get(partId);
        if (!part) {
            const identity = (v: number[][]) => v;
            rotFnCache.set(partId, identity);
            return identity;
        }
        let fn: (verts: number[][]) => number[][];
        if (part.parent) {
            const parentFn = getRotFn(part.parent);
            if (part.rotate) {
                const angle = params[part.rotate.param] ?? 0;
                const tPivot = parentFn([part.rotate.pivot])[0] as [number, number, number];
                const { axis } = part.rotate;
                fn = (verts) => _rotateVerts(parentFn(verts), tPivot, axis, angle);
            } else {
                fn = parentFn;
            }
        } else if (part.rotate) {
            const angle = params[part.rotate.param] ?? 0;
            const { pivot, axis } = part.rotate;
            fn = (verts) => _rotateVerts(verts, pivot, axis, angle);
        } else {
            fn = (verts) => verts;
        }
        rotFnCache.set(partId, fn);
        return fn;
    };

    for (const part of def.parts) {
        if (!part.rotate) continue;
        const parentFn = part.parent ? getRotFn(part.parent) : null;
        const pivot = parentFn ? (parentFn([part.rotate.pivot])[0] as [number, number, number]) : part.rotate.pivot;
        result.set(part.id, pivot);
    }
    return result;
};

export { applyParts, applyRotateNodes, getTransformedPivots };

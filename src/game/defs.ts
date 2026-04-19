// ─── Decoupled Element Facets (DEF) ──────────────────────────────────────────
// Declarative geometry for isometric game objects.
// See DEF_SPEC.md for the full specification.
// ──────────────────────────────────────────────────────────────────────────────

export interface DEFFace {
    id: string;
    /** [x, y, z] tuples in local object space */
    verts: number[][];
    color: string;
    stroke?: string | null;
    strokeWidth?: number;
    /** Isometric backface cull: [nx, ny] in local XY. Face hidden when nx+ny ≤ 0 after rotation. */
    normal?: [number, number];
}

export interface DEFCollisionBox {
    id: string;
    xMin: number; xMax: number;
    yMin: number; yMax: number;
    zMin: number; zMax: number;
}

export interface DEFRotateNode {
    /** Pivot point in local object space */
    pivot: [number, number, number];
    /** Unit rotation axis, e.g. [0,0,1] for Z */
    axis: [number, number, number];
    /** Name of the runtime parameter that drives the angle (radians) */
    param: string;
    faces: DEFFace[];
}

export interface DEFPart {
    id: string;
    faces: DEFFace[];
    rotate?: {
        pivot: [number, number, number];
        axis: [number, number, number];
        param: string;
    };
}

export interface DEF {
    id: string;
    /** Rotation pivot in local coords (default [0,0,0]) */
    pivot?: number[];
    faces: DEFFace[];
    collisionBoxes?: DEFCollisionBox[];
    /** Legacy: runtime-animated sub-geometry — use parts instead */
    rotateNodes?: DEFRotateNode[];
    /** Named sub-geometry groups; call applyParts() before passing to SceneRenderer */
    parts?: DEFPart[];
}

// ─── Cylinder helpers ─────────────────────────────────────────────────────────

/** n evenly-spaced points on a circle of radius r at height z */
export const nGonRing = (r: number, z: number, n: number): number[][] =>
    Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return [Math.cos(a) * r, Math.sin(a) * r, z];
    });

/**
 * Cylinder face set: top cap + camera-facing side quads.
 * Backface culled: sides with nx+ny < -0.1 (camera at +X+Y) are omitted.
 */
export const cylFaces = (
    r: number, zB: number, zT: number,
    color: string, stroke: string | null, n = 16,
): DEFFace[] => {
    const faces: DEFFace[] = [];
    faces.push({ id: `cap_z${zT}`, verts: nGonRing(r, zT, n), color, stroke });
    for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2;
        const a1 = ((i + 1) / n) * Math.PI * 2;
        const nx = Math.cos((a0 + a1) / 2);
        const ny = Math.sin((a0 + a1) / 2);
        if (nx + ny < -0.1) continue;
        faces.push({
            id: `side_${i}_z${zB}`,
            verts: [
                [Math.cos(a0) * r, Math.sin(a0) * r, zB],
                [Math.cos(a1) * r, Math.sin(a1) * r, zB],
                [Math.cos(a1) * r, Math.sin(a1) * r, zT],
                [Math.cos(a0) * r, Math.sin(a0) * r, zT],
            ],
            color,
            stroke,
        });
    }
    return faces;
};

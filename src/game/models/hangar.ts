import type { DEF } from '../defs';

// Local coords: +X = forward (opening), +Y = left, +Z = up.
// Side walls: exterior normal only. Back wall: exterior + interior pair (interior shows
// through the opening). Interior side faces are intentionally omitted — they cause
// painter's-algorithm artifacts at rotation angles where the opening faces away.
export const HANGAR_DEF: DEF = {
    id: 'hangar',
    pivot: [0, 0, 0],
    collisionBoxes: [{ id: 'body', xMin: -1, xMax: 1, yMin: -2, yMax: 2, zMin: 0, zMax: 2.0 }],
    faces: [
        // ── INTERIOR (no normals → always drawn; placed first so exterior paints over them from outside) ──
        { id: 'back_int',  verts: [[-1,-2,0],[-1, 2,0],[-1, 2,2.0],[-1,-2,2.0]], color: '#888888' },
        { id: 'right_int', verts: [[-1,-2,0],[ 1,-2,0],[ 1,-2,2.0],[-1,-2,2.0]], color: '#999999' },
        { id: 'left_int',  verts: [[ 1, 2,0],[-1, 2,0],[-1, 2,2.0],[ 1, 2,2.0]], color: '#aaaaaa' },
        // ── EXTERIOR (with normals → backface-culled; drawn after interior so they cover it from outside) ─
        { id: 'back_ext', normal: [-1, 0], verts: [[-1, 2,0],[-1,-2,0],[-1,-2,2.0],[-1, 2,2.0]], color: '#999999' },
        { id: 'right_ext', normal: [0,-1], verts: [[ 1,-2,0],[-1,-2,0],[-1,-2,2.0],[ 1,-2,2.0]], color: '#aaaaaa' },
        { id: 'left_ext',  normal: [0, 1], verts: [[-1, 2,0],[ 1, 2,0],[ 1, 2,2.0],[-1, 2,2.0]], color: '#cccccc' },
        // ── ROOF ─────────────────────────────────────────────────────────────────────────────────────────
        { id: 'roof', verts: [[-1,-2,2.0],[1,-2,2.0],[1,2,2.0],[-1,2,2.0]], color: '#dddddd' },
    ],
};

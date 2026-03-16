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

export interface DEF {
    id: string;
    /** Rotation pivot in local coords (default [0,0,0]) */
    pivot?: number[];
    faces: DEFFace[];
    collisionBoxes?: DEFCollisionBox[];
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

// ─── HANGAR ───────────────────────────────────────────────────────────────────
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

// ─── LIGHTHOUSE ───────────────────────────────────────────────────────────────
// Cylindrical tower, approximated as n=16 prism stack. No rotation (angle=0).
// Light beam → drawLighthouseBeam() after flush.
export const LIGHTHOUSE_DEF: DEF = {
    id: 'lighthouse',
    pivot: [0, 0, 0],
    collisionBoxes: [
        { id: 'base',  xMin: -4.0, xMax: 4.0, yMin: -4.0, yMax: 4.0, zMin: 0,   zMax: 0.4 },
        { id: 'tower', xMin: -1.0, xMax: 1.0, yMin: -1.0, yMax: 1.0, zMin: 0.4, zMax: 8.0 },
    ],
    faces: [
        ...cylFaces(4.0, 0.0, 0.4, '#404040', null, 32),
        ...cylFaces(1.0, 0.4, 3.0, '#cc2222', null),
        ...cylFaces(1.0, 3.0, 6.0, '#eeeeee', null),
        ...cylFaces(1.0, 6.0, 7.0, '#cc2222', null),
        ...cylFaces(1.0, 7.0, 8.0, '#ffff88', null),
    ],
};

// ─── SAILBOAT ─────────────────────────────────────────────────────────────────
// Local coords: +X = bow, +Y = port, +Z = up. Origin = waterline center.
// Sail baked at fixed wind trim (0.3 rad offset from heading).
export const SAILBOAT_DEF: DEF = {
    id: 'sailboat',
    pivot: [0, 0, 0],
    collisionBoxes: [
        { id: 'hull', xMin: -1.1, xMax: 1.3, yMin: -0.45, yMax: 0.45, zMin: 0, zMax: 0.35 },
        { id: 'mast', xMin: -0.34, xMax: -0.26, yMin: -0.08, yMax: 0.08, zMin: 0.35, zMax: 3.2 },
    ],
    faces: [
        { id: 'keel',            verts: [[1.3,0,0],[0.2,-0.45,0],[-1.1,-0.35,0],[-1.1,0.35,0],[0.2,0.45,0]], color: '#822' },
        { id: 'stern',           normal: [-1,0], verts: [[-1.1,-0.35,0],[-1.1,0.35,0],[-1.1,0.35,0.35],[-1.1,-0.35,0.35]], color: '#ddd' },
        { id: 'stbd_lower_bow',  normal: [0,-1], verts: [[1.3,0,0],[0.2,-0.45,0],[0.2,-0.45,0.1],[1.3,0,0.1]], color: '#a33' },
        { id: 'stbd_lower_mid',  normal: [0,-1], verts: [[0.2,-0.45,0],[-1.1,-0.35,0],[-1.1,-0.35,0.1],[0.2,-0.45,0.1]], color: '#922' },
        { id: 'stbd_upper_bow',  normal: [0,-1], verts: [[1.3,0,0.1],[0.2,-0.45,0.1],[0.2,-0.45,0.35],[1.3,0,0.35]], color: '#fff' },
        { id: 'stbd_upper_mid',  normal: [0,-1], verts: [[0.2,-0.45,0.1],[-1.1,-0.35,0.1],[-1.1,-0.35,0.35],[0.2,-0.45,0.35]], color: '#eee' },
        { id: 'port_bow',        normal: [0, 1], verts: [[1.3,0,0],[0.2,0.45,0],[0.2,0.45,0.35],[1.3,0,0.35]], color: '#eee' },
        { id: 'port_mid',        normal: [0, 1], verts: [[0.2,0.45,0],[-1.1,0.35,0],[-1.1,0.35,0.35],[0.2,0.45,0.35]], color: '#ddd' },
        { id: 'deck',            verts: [[1.3,0,0.35],[0.2,-0.45,0.35],[-1.1,-0.35,0.35],[-1.1,0.35,0.35],[0.2,0.45,0.35]], color: '#b96', stroke: '#753' },
        { id: 'mast',            verts: [[-0.34,-0.04,0.35],[-0.26,-0.04,0.35],[-0.26,-0.04,3.2],[-0.34,-0.04,3.2]], color: '#ddd' },
        { id: 'mainsail',        verts: [[-0.3,0,0.65],[-0.3,0,3.0],[-1.83,-0.47,0.65]], color: 'rgba(255,255,250,0.95)', stroke: '#eee' },
        { id: 'jib',             verts: [[1.3,0,0.45],[-0.3,0,2.7],[-0.68,-0.12,0.55]], color: 'rgba(245,245,245,0.90)' },
    ],
};

// ─── JAYHAWK (MH-60T) ─────────────────────────────────────────────────────────
// Local coords: +X = nose, +Y = left, +Z = up. Origin = rotor hub at deck level.
// Rotors NOT included — draw via drawJayhawkRotors() after flush.
export const JAYHAWK_DEF: DEF = {
    id: 'jayhawk',
    pivot: [0, 0, 0],
    collisionBoxes: [{ id: 'body', xMin: -3.0, xMax: 1.3, yMin: -0.5, yMax: 0.5, zMin: 0, zMax: 1.3 }],
    faces: [
        { id: 'tail_rotor_bar', verts: [[-2.4, 0.6,0.25],[-2.4,-0.6,0.25],[-2.4,-0.6,0.35],[-2.4, 0.6,0.35]], color: '#222222' },
        { id: 'tail_fin',       verts: [[-2.4, 0, 0.6],[-2.9, 0, 1.3],[-3.0, 0, 0.6]], color: '#ff6600' },
        { id: 'tail_boom',      verts: [[-1.1, 0.08,0.6],[-2.4, 0.08,0.6],[-2.4,-0.08,0.6],[-1.1,-0.08,0.6]], color: '#ff6600' },
        { id: 'fuselage',       verts: [[1.3,0,0.3],[0.4,-0.45,0.4],[-1.0,-0.45,0.4],[-1.1,0,0.6],[-1.0,0.45,0.4],[0.4,0.45,0.4]], color: '#ff6600' },
        { id: 'window_right',   verts: [[0.3,-0.47,0.35],[-0.6,-0.47,0.35],[-0.6,-0.3,0.6],[0.3,-0.3,0.6]], color: '#111111' },
        { id: 'window_left',    verts: [[0.3, 0.47,0.35],[-0.6, 0.47,0.35],[-0.6, 0.3,0.6],[0.3, 0.3,0.6]], color: '#111111' },
        { id: 'cockpit_nose',   verts: [[1.3,0,0.3],[0.6,0.4,0.6],[0.6,-0.4,0.6]], color: '#111111' },
    ],
};

// ─── DOLPHIN (MH-65) ──────────────────────────────────────────────────────────
// Scale s=0.7 already baked into vertex coords.
// Rotors NOT included — draw via drawDolphinRotors() after flush.
export const DOLPHIN_DEF: DEF = {
    id: 'dolphin',
    pivot: [0, 0, 0],
    collisionBoxes: [{ id: 'body', xMin: -1.40, xMax: 0.98, yMin: -0.28, yMax: 0.28, zMin: 0, zMax: 0.84 }],
    faces: [
        { id: 'fuselage', verts: [[0.98,0,0.14],[0,-0.28,0.28],[-0.56,0,0.35],[0,0.28,0.28]], color: '#ff6600' },
        { id: 'cockpit',  verts: [[0.84,0,0.175],[0.21,-0.21,0.42],[0.21,0.21,0.42]], color: '#112233' },
        { id: 'tail_fin', verts: [[-0.56,0,0.35],[-1.26,0,0.84],[-1.40,0,0.28]], color: '#ff6600' },
    ],
};

// ─── CHINOOK (CH-47) ──────────────────────────────────────────────────────────
// Local coords: +X = nose, +Y = left, +Z = up. Origin = body center, ground level.
// Rotors NOT included — draw via drawChinookRotors() after flush.
export const CHINOOK_DEF: DEF = {
    id: 'chinook',
    pivot: [0, 0, 0],
    collisionBoxes: [{ id: 'body', xMin: -2.6, xMax: 2.8, yMin: -0.6, yMax: 0.6, zMin: 0, zMax: 1.8 }],
    faces: [
        { id: 'bottom',           verts: [[ 1.8, 0.3,0.15],[ 1.8,-0.3,0.15],[-2.0,-0.3,0.15],[-2.0, 0.3,0.15]], color: '#dd5500' },
        { id: 'side_left_lower',  verts: [[ 1.8, 0.3,0.15],[ 1.8, 0.6,0.5 ],[-2.0, 0.6,0.5 ],[-2.0, 0.3,0.15]], color: '#ff6600' },
        { id: 'side_left_upper',  verts: [[ 1.8, 0.6,0.5 ],[ 1.8, 0.3,0.85],[-2.0, 0.3,0.85],[-2.0, 0.6,0.5 ]], color: '#ff7711' },
        { id: 'side_right_lower', verts: [[ 1.8,-0.3,0.15],[ 1.8,-0.6,0.5 ],[-2.0,-0.6,0.5 ],[-2.0,-0.3,0.15]], color: '#cc4400' },
        { id: 'side_right_upper', verts: [[ 1.8,-0.6,0.5 ],[ 1.8,-0.3,0.85],[-2.0,-0.3,0.85],[-2.0,-0.6,0.5 ]], color: '#dd5500' },
        { id: 'top',              verts: [[ 1.8, 0.3,0.85],[ 1.8,-0.3,0.85],[-2.0,-0.3,0.85],[-2.0, 0.3,0.85]], color: '#ff6600' },
        { id: 'tail_roof',        verts: [[-2.0, 0.3,0.85],[-2.0,-0.3,0.85],[-2.6, 0,  1.1 ]], color: '#ff6600' },
        { id: 'tail_left',        verts: [[-2.0, 0.6,0.5 ],[-2.0, 0.3,0.85],[-2.6, 0,  1.1 ],[-2.6, 0,  0.4 ]], color: '#ff7711' },
        { id: 'tail_right',       verts: [[-2.0,-0.6,0.5 ],[-2.0,-0.3,0.85],[-2.6, 0,  1.1 ],[-2.6, 0,  0.4 ]], color: '#dd5500' },
        { id: 'nose',             verts: [[ 2.8, 0,  0.45],[ 1.8,-0.6,0.5 ],[ 1.8,-0.3,0.85],[ 1.8, 0.3,0.85],[ 1.8, 0.6,0.5 ]], color: '#ff6600' },
        { id: 'cockpit_front',    verts: [[ 2.6, 0,  0.5 ],[ 2.2,-0.35,0.6],[ 2.2, 0.35,0.6]], color: '#111111' },
        { id: 'window_left',      verts: [[ 1.5, 0.31,0.6],[ 1.0, 0.31,0.6],[ 1.0, 0.31,0.75],[ 1.5, 0.31,0.75]], color: '#111111' },
        { id: 'window_right',     verts: [[ 1.5,-0.31,0.6],[ 1.0,-0.31,0.6],[ 1.0,-0.31,0.75],[ 1.5,-0.31,0.75]], color: '#111111' },
        { id: 'fpylon_front',     verts: [[ 1.8, 0.3,0.85],[ 1.8,-0.3,0.85],[ 1.5, 0,  1.15]], color: '#ff6600' },
        { id: 'fpylon_right',     verts: [[ 1.8,-0.3,0.85],[ 1.2,-0.3,0.85],[ 1.5, 0,  1.15]], color: '#dd5500' },
        { id: 'fpylon_back',      verts: [[ 1.2,-0.3,0.85],[ 1.2, 0.3,0.85],[ 1.5, 0,  1.15]], color: '#ff6600' },
        { id: 'fpylon_left',      verts: [[ 1.2, 0.3,0.85],[ 1.8, 0.3,0.85],[ 1.5, 0,  1.15]], color: '#ff7711' },
        { id: 'rpylon_front',     verts: [[-1.9, 0.3,1.0 ],[-1.9,-0.3,1.0 ],[-2.3, 0,  1.8 ]], color: '#ff6600' },
        { id: 'rpylon_right',     verts: [[-1.9,-0.3,1.0 ],[-2.5,-0.15,1.1],[-2.3, 0,  1.8 ]], color: '#dd5500' },
        { id: 'rpylon_back',      verts: [[-2.5,-0.15,1.1],[-2.5, 0.15,1.1],[-2.3, 0,  1.8 ]], color: '#cc4400' },
        { id: 'rpylon_left',      verts: [[-2.5, 0.15,1.1],[-1.9, 0.3,1.0 ],[-2.3, 0,  1.8 ]], color: '#ff7711' },
    ],
};

// ─── ASK-21 GLIDER ────────────────────────────────────────────────────────────
// Local coords: +X = nose, +Y = left wing, +Z = up. Origin = CG, ground level.
// Wing span: ±3.0. Fuselage: -1.65 to +1.0.
export const GLIDER_DEF: DEF = {
    id: 'glider',
    pivot: [0, 0, 0],
    collisionBoxes: [{ id: 'body', xMin: -1.65, xMax: 1.0, yMin: -3.0, yMax: 3.0, zMin: 0, zMax: 0.40 }],
    faces: [
        { id: 'tail_fin',   verts: [[-1.40, 0.04,0.20],[-1.65, 0.04,0.20],[-1.65, 0.04,0.50],[-1.40, 0.04,0.32]], color: '#cc3300' },
        { id: 'h_stab',     verts: [[-1.35,-0.65,0.24],[-1.35, 0.65,0.24],[-1.55, 0.65,0.24],[-1.55,-0.65,0.24]], color: '#eeeeee' },
        { id: 'wing_right', verts: [[ 0.36,-0.10,0.27],[ 0.03,-0.10,0.27],[ 0.03,-3.0, 0.28],[ 0.36,-3.0, 0.28]], color: '#e8e8e8' },
        { id: 'fuselage',   verts: [[ 1.0,  0,   0.20],[ 0.55,-0.10,0.26],[-1.2, -0.06,0.26],[-1.65, 0,  0.22],[-1.2, 0.06,0.26],[ 0.55, 0.10,0.26]], color: '#f2f2f2' },
        { id: 'wing_left',  verts: [[ 0.36, 0.10,0.27],[ 0.36, 3.0, 0.28],[ 0.03, 3.0, 0.28],[ 0.03, 0.10,0.27]], color: '#e8e8e8' },
        { id: 'canopy',     verts: [[ 0.70, 0.07,0.26],[ 0.70,-0.07,0.26],[-0.16,-0.07,0.36],[-0.16, 0.07,0.36]], color: '#112244' },
    ],
};

// ─── CARRIER HULL ─────────────────────────────────────────────────────────────
// Local coords: +X = starboard, +Y = stern, +Z = up. Origin = hull center, waterline.
// Split from tower so each gets its own depth sort value.
// Tractors / antenna / radar → drawn separately after flush.
export const CARRIER_HULL_DEF: DEF = {
    id: 'carrier_hull',
    pivot: [0, 0, 0],
    collisionBoxes: [
        { id: 'hull', xMin: -4.2, xMax: 4.2, yMin: -8.7, yMax: 8.7, zMin: 0, zMax: 4.2 },
    ],
    faces: [
        { id: 'keel',           verts: [[-2.52,-8.7,0],[2.52,-8.7,0],[2.52,8.7,0],[-2.52,8.7,0]], color: '#0a0a14' },
        { id: 'hull_bow',       normal: [0,-1], verts: [[-2.52,-8.7,0],[2.52,-8.7,0],[4.2,-8.7,3.8],[-4.2,-8.7,3.8]], color: '#2a3a4a' },
        { id: 'hull_starboard', normal: [1, 0], verts: [[2.52,-8.7,0],[2.52,8.7,0],[4.2,8.7,3.8],[4.2,-8.7,3.8]],   color: '#3a4a5a' },
        { id: 'hull_stern',     normal: [0, 1], verts: [[2.52,8.7,0],[-2.52,8.7,0],[-4.2,8.7,3.8],[4.2,8.7,3.8]],   color: '#2a3a4a' },
        { id: 'hull_port',      normal: [-1,0], verts: [[-2.52,8.7,0],[-2.52,-8.7,0],[-4.2,-8.7,3.8],[-4.2,8.7,3.8]], color: '#223344' },
        { id: 'deck_base',      verts: [[-4.2,-8.7,3.8],[4.2,-8.7,3.8],[4.2,8.7,3.8],[-4.2,8.7,3.8]], color: '#222222' },
        { id: 'deck_bow',       normal: [0,-1], verts: [[-4.2,-8.7,3.8],[4.2,-8.7,3.8],[4.2,-8.7,4.2],[-4.2,-8.7,4.2]], color: '#2a2a33' },
        { id: 'deck_starboard', normal: [1, 0], verts: [[4.2,-8.7,3.8],[4.2,8.7,3.8],[4.2,8.7,4.2],[4.2,-8.7,4.2]],   color: '#333333' },
        { id: 'deck_stern',     normal: [0, 1], verts: [[4.2,8.7,3.8],[-4.2,8.7,3.8],[-4.2,8.7,4.2],[4.2,8.7,4.2]],   color: '#2a2a33' },
        { id: 'deck_port',      normal: [-1,0], verts: [[-4.2,8.7,3.8],[-4.2,-8.7,3.8],[-4.2,-8.7,4.2],[-4.2,8.7,4.2]], color: '#222222' },
        { id: 'flight_deck',    verts: [[-4.2,-8.7,4.2],[4.2,-8.7,4.2],[4.2,8.7,4.2],[-4.2,8.7,4.2]], color: '#3a3a44' },
        { id: 'pad_bow',        verts: [[-3.7,-5.9,4.21],[-0.9,-5.9,4.21],[-0.9,-3.1,4.21],[-3.7,-3.1,4.21]], color: '#52526a' },
        { id: 'pad_mid',        verts: [[-3.7,-1.4,4.21],[-0.9,-1.4,4.21],[-0.9, 1.4,4.21],[-3.7, 1.4,4.21]], color: '#52526a' },
        { id: 'pad_stern',      verts: [[-3.7, 3.1,4.21],[-0.9, 3.1,4.21],[-0.9, 5.9,4.21],[-3.7, 5.9,4.21]], color: '#52526a' },
    ],
};

// ─── CARRIER TOWER ────────────────────────────────────────────────────────────
// Separate DEF so the tower gets its own depth sort value.
// Pass depth override = towerWorldX + towerWorldY when calling SceneRenderer.add().
// Tower centroid in local coords: x≈3.35, y≈3.25.
export const CARRIER_TOWER_DEF: DEF = {
    id: 'carrier_tower',
    pivot: [0, 0, 0],
    collisionBoxes: [
        { id: 'tower', xMin: 2.6, xMax: 4.1, yMin: 1.0, yMax: 5.5, zMin: 4.2, zMax: 6.7 },
    ],
    faces: [
        { id: 'tower_bow',       normal: [0,-1], verts: [[2.6,1.0,4.2],[4.1,1.0,4.2],[4.1,1.0,6.7],[2.6,1.0,6.7]], color: '#555555' },
        { id: 'tower_starboard', normal: [1, 0], verts: [[4.1,1.0,4.2],[4.1,5.5,4.2],[4.1,5.5,6.7],[4.1,1.0,6.7]], color: '#444444' },
        { id: 'tower_stern',     normal: [0, 1], verts: [[2.6,5.5,4.2],[4.1,5.5,4.2],[4.1,5.5,6.7],[2.6,5.5,6.7]], color: '#333333' },
        { id: 'tower_port',      normal: [-1,0], verts: [[2.6,1.0,4.2],[2.6,5.5,4.2],[2.6,5.5,6.7],[2.6,1.0,6.7]], color: '#444444' },
        { id: 'tower_roof',      verts: [[2.6,1.0,6.7],[4.1,1.0,6.7],[4.1,5.5,6.7],[2.6,5.5,6.7]], color: '#222222' },
    ],
};

// ─── Fuel Truck ───────────────────────────────────────────────────────────────
// Local coords: +x = forward (cab), x=0 = rear (arm pivot), z=0 = ground.
// Split into three DEFs so SceneRenderer depth-sorts them correctly at any angle.
// Centroids (local x): chassis=1.1, tank=0.825, cab=1.85 — compute world depths at draw time.
// Arm is drawn as a drawFn on the cab instance (points toward heli at runtime).

// Chassis: drawn first (base layer). Wheels flush with chassis sides (y=±0.45) — no protrusion,
// no depth conflicts with tank/cab.
export const FUEL_TRUCK_CHASSIS_DEF: DEF = {
    id: 'fuel_truck_chassis',
    pivot: [0, 0, 0],
    collisionBoxes: [{ id: 'body', xMin: 0, xMax: 2.2, yMin: -0.45, yMax: 0.45, zMin: 0, zMax: 0.85 }],
    faces: [
        { id: 'ch_top',   verts: [[0,-0.45,0.3],[2.2,-0.45,0.3],[2.2,0.45,0.3],[0,0.45,0.3]], color: '#4a6a4a' },
        { id: 'ch_front', normal: [1, 0], verts: [[2.2,-0.45,0],[2.2,0.45,0],[2.2,0.45,0.3],[2.2,-0.45,0.3]], color: '#4a6a4a' },
        { id: 'ch_rear',  normal: [-1,0], verts: [[0,0.45,0],[0,-0.45,0],[0,-0.45,0.3],[0,0.45,0.3]], color: '#3a5a3a' },
        { id: 'ch_right', normal: [0, 1], verts: [[2.2,0.45,0],[0,0.45,0],[0,0.45,0.3],[2.2,0.45,0.3]], color: '#2a4a2a' },
        { id: 'ch_left',  normal: [0,-1], verts: [[0,-0.45,0],[2.2,-0.45,0],[2.2,-0.45,0.3],[0,-0.45,0.3]], color: '#2a4a2a' },
        // Wheels — listed after sides so they paint over them; slightly darker green
        { id: 'wfl', normal: [0,-1], verts: [[1.65,-0.45,0],[1.95,-0.45,0],[1.95,-0.45,0.22],[1.65,-0.45,0.22]], color: '#1a2e1a' },
        { id: 'wfr', normal: [0, 1], verts: [[1.65,0.45,0],[1.95,0.45,0],[1.95,0.45,0.22],[1.65,0.45,0.22]], color: '#1a2e1a' },
        { id: 'wrl', normal: [0,-1], verts: [[0.25,-0.45,0],[0.55,-0.45,0],[0.55,-0.45,0.22],[0.25,-0.45,0.22]], color: '#1a2e1a' },
        { id: 'wrr', normal: [0, 1], verts: [[0.25,0.45,0],[0.55,0.45,0],[0.55,0.45,0.22],[0.25,0.45,0.22]], color: '#1a2e1a' },
    ],
};

export const FUEL_TRUCK_TANK_DEF: DEF = {
    id: 'fuel_truck_tank',
    pivot: [0, 0, 0],
    faces: [
        { id: 'tk_top',   verts: [[0.25,-0.38,1.06],[1.4,-0.38,1.06],[1.4,0.38,1.06],[0.25,0.38,1.06]], color: '#cccccc' },
        { id: 'tk_front', normal: [1, 0], verts: [[1.4,-0.38,0.3],[1.4,0.38,0.3],[1.4,0.38,1.06],[1.4,-0.38,1.06]], color: '#aaaaaa' },
        { id: 'tk_right', normal: [0, 1], verts: [[1.4,0.38,0.3],[0.25,0.38,0.3],[0.25,0.38,1.06],[1.4,0.38,1.06]], color: '#999999' },
        { id: 'tk_left',  normal: [0,-1], verts: [[0.25,-0.38,0.3],[1.4,-0.38,0.3],[1.4,-0.38,1.06],[0.25,-0.38,1.06]], color: '#bbbbbb' },
        { id: 'tk_rear',  normal: [-1,0], verts: [[0.25,0.38,0.3],[0.25,-0.38,0.3],[0.25,-0.38,1.06],[0.25,0.38,1.06]], color: '#aaaaaa' },
        { id: 'tk_stripe',verts: [[0.3,-0.04,1.065],[1.35,-0.04,1.065],[1.35,0.04,1.065],[0.3,0.04,1.065]], color: '#ff4400' },
    ],
};

export const FUEL_TRUCK_CAB_DEF: DEF = {
    id: 'fuel_truck_cab',
    pivot: [0, 0, 0],
    faces: [
        { id: 'cab_top',  verts: [[1.5,-0.45,0.85],[2.2,-0.45,0.85],[2.2,0.45,0.85],[1.5,0.45,0.85]], color: '#6a9a6a', stroke: '#8aba8a' },
        { id: 'cab_front',normal: [1, 0], verts: [[2.2,-0.45,0.3],[2.2,0.45,0.3],[2.2,0.45,0.85],[2.2,-0.45,0.85]], color: '#3a6a3a' },
        { id: 'cab_win',  normal: [1, 0], verts: [[2.201,-0.25,0.45],[2.201,0.25,0.45],[2.201,0.25,0.75],[2.201,-0.25,0.75]], color: '#112233' },
        { id: 'cab_right',normal: [0, 1], verts: [[2.2,0.45,0.3],[1.5,0.45,0.3],[1.5,0.45,0.85],[2.2,0.45,0.85]], color: '#4a7a4a' },
        { id: 'cab_left', normal: [0,-1], verts: [[1.5,-0.45,0.3],[2.2,-0.45,0.3],[2.2,-0.45,0.85],[1.5,-0.45,0.85]], color: '#5a8a5a' },
        { id: 'cab_rear', normal: [-1,0], verts: [[1.5,0.45,0.3],[1.5,-0.45,0.3],[1.5,-0.45,0.85],[1.5,0.45,0.85]], color: '#3a5a3a' },
    ],
};

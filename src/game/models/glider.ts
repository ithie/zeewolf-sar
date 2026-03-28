import type { DEF } from '../defs';

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

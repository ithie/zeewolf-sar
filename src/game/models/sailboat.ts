import type { DEF } from '../defs';

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

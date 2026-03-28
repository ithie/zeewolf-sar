import type { DEF } from '../defs';
import { cylFaces } from '../defs';

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

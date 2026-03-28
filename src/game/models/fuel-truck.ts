import type { DEF } from '../defs';

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

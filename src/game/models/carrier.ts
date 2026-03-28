import type { DEF } from '../defs';

// Local coords: +X = starboard, +Y = stern, +Z = up. Origin = hull center, waterline.
// Split into hull + tower so each gets its own depth sort value.
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

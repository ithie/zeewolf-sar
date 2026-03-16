// ─── Heli Type Definitions ────────────────────────────────────────────────────
// Single source of truth for all helicopter variants.
// The game logic must not contain any `if (type === 'jayhawk')` etc.
// Import HELI_TYPES and use getHeliType(id) instead.

import { JAYHAWK_DEF, DOLPHIN_DEF, CHINOOK_DEF } from './defs';
import type { DEF } from './defs';

export interface HeliType {
    id: string;
    label: string;
    def: DEF;
    // Physics
    maxLoad: number;
    accel: number;
    friction: number;
    tiltSpeed: number;
    fuelRate: number;
    liftPower: number;
    cargoResist: number;
    // Rendering
    scale: number;         // drawHeli geometry scale
    previewScale: number;  // scale for menu icon canvas
    // Collision box (local coords, zMax relative to heli.z)
    collisionBox: { xMin: number; xMax: number; yMin: number; yMax: number; zMax: number };
    // Local-x offsets of rotor hubs (for particles/sound). Single-rotor helis: [0].
    rotorOffsets: number[];
    // Extra rotor debris piece on crash (chinook)
    extraRotorDebris: boolean;
    // Whether this heli can carry cargo crates
    canCarryCargo: boolean;
    // Select screen display
    selectLabel: string;    // e.g. "MH-65 DOLPHIN"
    selectSub: string;      // e.g. "Agile / Fast"
    selectCap: string;      // e.g. "Cap: 3 (Lightweight)"
}

export const HELI_TYPES: HeliType[] = [
    {
        id: 'dolphin',
        label: 'SA 365 Dauphin',
        def: DOLPHIN_DEF,
        maxLoad: 3,
        accel: 0.00117,
        friction: 0.995,
        tiltSpeed: 0.05,
        fuelRate: 0.012,
        liftPower: 0.0009,
        cargoResist: 2.0,
        scale: 0.7,
        previewScale: 2.5,
        collisionBox: { xMin: -1.26, xMax: 1.26, yMin: -0.28, yMax: 0.28, zMax: 0.56 },
        rotorOffsets: [0],
        extraRotorDebris: false,
        canCarryCargo: false,
        selectLabel: 'MH-65 DOLPHIN',
        selectSub: 'Agile / Fast',
        selectCap: 'Cap: 3 (Lightweight)',
    },
    {
        id: 'jayhawk',
        label: 'MH-60T Jayhawk',
        def: JAYHAWK_DEF,
        maxLoad: 10,
        accel: 0.000502,
        friction: 0.998,
        tiltSpeed: 0.015,
        fuelRate: 0.007,
        liftPower: 0.0005,
        cargoResist: 0.3,
        scale: 1.0,
        previewScale: 2.5,
        collisionBox: { xMin: -3.0, xMax: 1.3, yMin: -0.5, yMax: 0.5, zMax: 1.3 },
        rotorOffsets: [0],
        extraRotorDebris: false,
        canCarryCargo: true,
        selectLabel: 'MH-60T JAYHAWK',
        selectSub: 'Heavy / Stable',
        selectCap: 'Cap: 10 (Heavy Lift)',
    },
    {
        id: 'chinook',
        label: 'CH-47 Chinook',
        def: CHINOOK_DEF,
        maxLoad: 20,
        accel: 0.000212,
        friction: 0.9992,
        tiltSpeed: 0.01,
        fuelRate: 0.005,
        liftPower: 0.0004,
        cargoResist: 0.05,
        scale: 1.0,
        previewScale: 1.5,
        collisionBox: { xMin: -2.6, xMax: 2.8, yMin: -0.6, yMax: 0.6, zMax: 1.8 },
        rotorOffsets: [1.5, -2.3],
        extraRotorDebris: true,
        canCarryCargo: true,
        selectLabel: 'CH-47 CHINOOK',
        selectSub: 'Tandem / Ultra Heavy',
        selectCap: 'Cap: 20 (Heavy Lift)',
    },
];

export function getHeliType(id: string): HeliType {
    const ht = HELI_TYPES.find(h => h.id === id);
    if (!ht) throw new Error(`Unknown heli type: ${id}`);
    return ht;
}

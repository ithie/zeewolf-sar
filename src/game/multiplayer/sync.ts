// ─── Multiplayer state serialization ─────────────────────────────────────────
// HeliSnap  – per-peer heli state, sent ~20 Hz on the unreliable "pos" channel
// MpEvent   – game events on the reliable "events" channel
//   world   – host→guest world snap ~10 Hz
//   rescue  – either peer deposited survivors; carries new totalRescued
//   crash   – a peer crashed
//   done    – mission complete (either side may send)
//   hello   – initial handshake (callsign exchange)

import type { RemoteHeli } from '../state';

export interface HeliSnap {
    x: number; y: number; z: number;
    vx: number; vy: number; vz: number;
    angle: number; tilt: number; roll: number;
    rotorRPM: number; rotationPos: number;
    inAir: boolean;
}

export interface WorldSnap {
    /** G.seaTime – drives carrier movement */
    st: number;
    /** Payload states: idx, x, y, z, rescued flag */
    ps: [number, number, number, number, boolean][];
    /** totalRescued for HUD display */
    tr: number;
    /** countdown seconds remaining */
    cd: number;
}

export type MpEvent =
    | { t: 'world'; s: WorldSnap }
    | { t: 'rescue'; total: number }
    | { t: 'crash'; role: 'host' | 'guest' }
    | { t: 'done' }
    | { t: 'hello'; callsign: string }
    | { t: 'heli'; heliType: string }
    | { t: 'ready' }
    | { t: 'start' };

// ─── pack / apply ─────────────────────────────────────────────────────────────

export const packHeli = (h: { x: number; y: number; z: number; vx: number; vy: number; vz: number; angle: number; tilt: number; roll: number; rotorRPM: number; rotationPos: number; inAir: boolean }): HeliSnap => ({
    x: h.x, y: h.y, z: h.z,
    vx: h.vx, vy: h.vy, vz: h.vz,
    angle: h.angle, tilt: h.tilt, roll: h.roll,
    rotorRPM: h.rotorRPM, rotationPos: h.rotationPos,
    inAir: h.inAir,
});

export const applyHeliSnap = (snap: HeliSnap, target: RemoteHeli): void => {
    target.x = snap.x; target.y = snap.y; target.z = snap.z;
    target.vx = snap.vx; target.vy = snap.vy; target.vz = snap.vz;
    target.angle = snap.angle; target.tilt = snap.tilt; target.roll = snap.roll;
    target.rotorRPM = snap.rotorRPM; target.rotationPos = snap.rotationPos;
    target.inAir = snap.inAir;
};

export const packWorld = (
    seaTime: number,
    payloads: { x: number; y: number; z: number; rescued: boolean }[],
    totalRescued: number,
    countdown: number,
): WorldSnap => ({
    st: seaTime,
    ps: payloads.map((p, i) => [i, p.x, p.y, p.z, p.rescued]),
    tr: totalRescued,
    cd: countdown,
});

export const applyWorldSnap = (
    snap: WorldSnap,
    target: {
        seaTime: number;
        payloads: { x: number; y: number; z: number; rescued: boolean }[];
        totalRescued: number;
    },
    setCountdown: (n: number) => void,
): void => {
    target.seaTime = snap.st;
    target.totalRescued = snap.tr;
    setCountdown(snap.cd);
    snap.ps.forEach(([idx, x, y, z, rescued]) => {
        const p = target.payloads[idx];
        if (!p) return;
        p.x = x; p.y = y; p.z = z; p.rescued = rescued;
    });
};

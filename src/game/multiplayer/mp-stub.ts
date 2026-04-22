// No-op stub — replaces all MP modules when VITE_TARGET=app.
// Vite tree-shakes this away completely since nothing calls these exports.

import type { MpState } from './mp-state';

export const mpState: MpState = {
    active: false, isHost: false, channels: null, peerCallsign: '',
    countdown: 0, countdownMax: 0, lastPosSent: 0, lastWorldSent: 0,
    spawnX: 0, spawnY: 0, spawnZ: 0, spawnAngle: 0, respawnTimer: 0,
};
export const resetMpState = () => {};

export const packHeli = () => ({} as any);
export const applyHeliSnap = () => {};
export const packWorld = () => ({} as any);
export const applyWorldSnap = () => {};

export const MP_CAMPAIGN_INDEX = 0;
export const MP_COUNTDOWN_SEC = 0;
export const MP_PAD = { x: 0, y: 0 };

export const mountMpLobby = () => {};
export const showMpLobby = () => {};
export const hideMpLobby = () => {};
export const setLobbyCallsign = (_s: string) => {};

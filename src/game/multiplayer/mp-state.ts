// ─── Multiplayer runtime state ────────────────────────────────────────────────
// Singleton that holds all MP-specific state.
// Kept separate from G so single-player code stays untouched.

import type { MpChannels } from './rtc';

export interface MpState {
    active: boolean;
    isHost: boolean;
    channels: MpChannels | null;
    peerCallsign: string;
    countdown: number;       // seconds remaining (host is authoritative)
    countdownMax: number;
    lastPosSent: number;     // performance.now() timestamp
    lastWorldSent: number;   // performance.now() timestamp (host only)
    // Spawn / respawn
    spawnX: number;
    spawnY: number;
    spawnZ: number;
    spawnAngle: number;
    respawnTimer: number;    // 0 = not respawning; >0 = respawning (performance.now() deadline)
}

export const mpState: MpState = {
    active: false,
    isHost: false,
    channels: null,
    peerCallsign: '',
    countdown: 300,
    countdownMax: 300,
    lastPosSent: 0,
    lastWorldSent: 0,
    spawnX: 0,
    spawnY: 0,
    spawnZ: 0,
    spawnAngle: 0,
    respawnTimer: 0,
};

export const resetMpState = (): void => {
    mpState.active = false;
    mpState.isHost = false;
    mpState.channels = null;
    mpState.peerCallsign = '';
    mpState.countdown = 300;
    mpState.countdownMax = 300;
    mpState.lastPosSent = 0;
    mpState.lastWorldSent = 0;
    mpState.spawnX = 0;
    mpState.spawnY = 0;
    mpState.spawnZ = 0;
    mpState.spawnAngle = 0;
    mpState.respawnTimer = 0;
};

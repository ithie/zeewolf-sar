import '../styles/base.css';
import './ui/screens.css';
import './ui/touch-controls.css';
import { iso } from './render';
import { campaignHandler, soundHandler, zinit, musicConfig } from './main';
import {
    loadSession,
    saveSession,
    getRank,
    isCampaignUnlocked,
    isConsentExpired,
    isConsentOutdated,
    CONSENT_VERSION,
    STORAGE_KEY,
    type PlayerSession,
    type Rank,
} from './session';
import { zstate } from './state';

import HANGAR_DEF from './models/hangar.zdef';
import LIGHTHOUSE_DEF from './models/lighthouse.zdef';
import SAILBOAT_DEF from './models/sailboat.zdef';
import CARRIER_HULL_DEF from './models/carrier_hull.zdef';
import CARRIER_TOWER_DEF from './models/carrier_tower.zdef';
import { createSceneRenderer } from './scene-renderer';
import { getHeliType } from './heli-types';
import { G } from './state';
import {
    getGround,
    initGrid,
    generateTerrain,
    initCarrierFromMission,
    initBoatsFromMission,
    initPayloadsFromMission,
    initFuelTruck,
    initBirds,
    updateBirds,
    updateDebris,
    spawnExplosion,
    updatePhysics,
} from './physics';
import { createDrawObjects } from './draw-objects';
import { tileW, tileH, stepH } from './render-config';
import { toCredits } from './ui/credits-screen/credits-screen';
import { startMenuParticles, stopMenuParticles } from './ui/menu-particles/menu-particles';
import { mpState, resetMpState } from './multiplayer/mp-state';
import { packHeli, applyHeliSnap, packWorld, applyWorldSnap } from './multiplayer/sync';
import { MP_CAMPAIGN_INDEX, MP_COUNTDOWN_SEC, MP_PAD } from './multiplayer/mp-mission';
import type { MpChannels } from './multiplayer/rtc';
import { mountMpLobby, showMpLobby, hideMpLobby, setLobbyCallsign } from './ui/mp-lobby/mp-lobby';
import { initHeliInfoScreen, toHeliInfo } from './ui/heli-info-screen/heli-info-screen';
import {
    initHeliSelect,
    buildHeliSelect,
    animateHeliPreviews,
    drawMenuHeli,
    animMainMenuBg,
} from './ui/heli-select/heli-select';
import { I18N } from './i18n';
import { mountCookieBanner, notifyConsent } from './ui/cookie-banner/cookie-banner';
import { mountBriefing, initBriefing, showBriefing as _showBriefing, hideBriefing } from './ui/briefing/briefing';
import { mountSettingsRankup, initSettings, toSettings, showRankUp } from './ui/settings/settings';
import { mountWhatsNew, showWhatsNewIfNeeded } from './ui/whats-new/whats-new';
import { mountMainMenu } from './ui/main-menu/main-menu';

const REQUIRED_IDS = [
    'gameCanvas',
    'audio-mute',
    'audio-mute-active',
    'audio-mute-inactive',
    'splash',
    'main-menu',
    'menu-particles-canvas',
    'heli-info',
    'heli-info-stage',
    'heli-cards-area',
    'heli-detail-panel',
    'credits-screen',
    'credits-canvas',
    'credits-inner',
    'campaign-select',
    'heli-select',
    'crash-screen',
    'mission-success-screen',
    'win-screen',
    'mission-briefing',
    'campaign-complete-screen',
    'campaign-failed-screen',
    'settings-screen',
    'rankup-overlay',
    'cookie-banner',
    'whats-new-overlay',
    'mp-lobby-screen',
    'touch-controls',
    'debug-toggle',
    'easter-egg',
    'flash-overlay',
    'msg',
] as const;

const assertDom = () => {
    const missing = REQUIRED_IDS.filter(id => !document.getElementById(id));
    if (missing.length > 0) {
        throw new Error(`[zeewolf] Missing DOM elements: ${missing.join(', ')}`);
    }
};

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
const isoFn = (wx: number, wy: number, wz: number, cx: number, cy: number) =>
    iso(wx, wy, wz, cx, cy, { canvas, tileW, tileH, stepH });
const SceneRenderer = createSceneRenderer(ctx, isoFn);
const { drawTree, drawPerson, drawTractor, drawFuelTruck, drawHeli } = createDrawObjects(
    ctx,
    isoFn,
    tileW,
    tileH,
    SceneRenderer
);

const { parkedHelis } = G;

initHeliInfoScreen(G, drawHeli);
initHeliSelect(G, drawHeli);

// ─── helper flags ────────────────────────────────────────────────────────────
// ─── object helpers ──────────────────────────────────────────────────────────
function getObjects() {
    return campaignHandler.getCurrentMissionData().objects || [];
}
function getObjectByType(type: string) {
    return getObjects().find(o => o.type === type) || null;
}
function hasCarrier() {
    return _missionHasCarrier;
}
function hasLighthouse() {
    return _missionHasLighthouse;
}
function hasPad() {
    return _missionHasPad;
}
function isStartsOnCarrier() {
    return campaignHandler.getCurrentMissionData().spawnObject === 'carrier';
}

function drawDebris(
    debris: any[],
    camX: number,
    camY: number,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
) {
    debris.forEach(d => {
        const pos = iso(d.x, d.y, d.z, camX, camY, { stepH, tileW, tileH, canvas });
        const cosA = Math.cos(d.angle),
            sinA = Math.sin(d.angle);
        const hw = (d.w * tileW) / 2,
            hh = (d.h * tileW) / 2;
        const corners = [
            [-hw, -hh],
            [hw, -hh],
            [hw, hh],
            [-hw, hh],
        ].map(([lx, ly]) => ({
            x: pos.x + lx * cosA - ly * sinA,
            y: pos.y + lx * sinA * 0.5 + ly * cosA * 0.5,
        }));
        const alpha = Math.min(1.0, d.life * 0.5);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = d.color;
        ctx.strokeStyle = d.stroke;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        corners.slice(1).forEach(c => ctx.lineTo(c.x, c.y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    });
}

function drawBirds(camX: number, camY: number) {
    G.flocks.forEach(flock => {
        flock.birds.forEach((bird: any) => {
            if (!isVisible(bird.x, bird.y, 20)) return;
            const pos = iso(bird.x, bird.y, bird.z, camX, camY, { stepH, tileW, tileH, canvas });
            // Flügelschlag: M-Form
            const wing = Math.sin(bird.wingPhase) * 3;
            const s = flock.fleeing ? 2.5 : 2.0;
            ctx.strokeStyle = flock.fleeing ? '#ccc' : '#888';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pos.x - s * 2, pos.y - wing * 0.4);
            ctx.lineTo(pos.x - s, pos.y + wing);
            ctx.lineTo(pos.x, pos.y);
            ctx.lineTo(pos.x + s, pos.y + wing);
            ctx.lineTo(pos.x + s * 2, pos.y - wing * 0.4);
            ctx.stroke();
        });
    });
}

// ─── UI helpers ──────────────────────────────────────────────────────────────
function showMsg(txt: string) {
    const m = document.getElementById('msg')!;
    m.innerHTML = txt;
    m.style.opacity = '1';
    setTimeout(() => {
        m.style.opacity = '0';
    }, 2000);
}

function isVisible(objX: number, objY: number, margin = 16) {
    if (_isTouchDevice()) {
        const viewCX = zstate.cam.x / tileW + zstate.cam.y / tileH;
        const viewCY = zstate.cam.y / tileH - zstate.cam.x / tileW;
        return Math.abs(objX - viewCX) < margin && Math.abs(objY - viewCY) < margin;
    }
    const rx = zstate.introActive ? G.START_POS.x : G.heli.x;
    const ry = zstate.introActive ? G.START_POS.y : G.heli.y;
    return Math.abs(objX - rx) < margin && Math.abs(objY - ry) < margin;
}

// ─── screens ────────────────────────────────────────────────────────────────
function triggerCrash(reason: string) {
    if (zstate.crashed) return;
    soundHandler.play(musicConfig.defeat || 'final', false);
    spawnExplosion(G.heli, G.particles, G.debris, G.points, G.CARRIER);
    zstate.crashed = true;
    setTimeout(() => {
        cancelAnimationFrame(_rafId);
        _rafId = 0;
        document.getElementById('campaign-failed-reason')!.innerHTML = reason;
        document.getElementById('campaign-failed-screen')!.style.display = 'flex';
    }, 1800); // Explosion erst austoben lassen
}

const showBriefing = () => {
    const { headline, sublines, briefing, previewBase64 } = campaignHandler.getCurrentMissionData();
    const rank = getRank(_session);
    const address = I18N.BRIEFING_ADDRESS(rank.name, _session.playerName).toUpperCase();
    _showBriefing(headline, sublines, briefing, previewBase64, address);
    const briefingSong = campaignHandler.getActiveCampaignMusic().briefing;
    if (briefingSong) soundHandler.play(briefingSong, true);
};

const dismissBriefing = () => {
    hideBriefing();
    launchMission();
};

function missionComplete() {
    const { campaignType } = campaignHandler.getCurrentMissionData();
    const next = campaignHandler.campaign.getNextMission();
    const isTutorial = campaignType === 'tutorial';

    // ── session tracking ────────────────────────────────────────────────────
    let rankUpRank: Rank | null = null;

    // Unlock next campaign on completion — always, including tutorial
    if (next === 'DONE') {
        const allCampaigns = campaignHandler.getCampaigns();
        for (let i = _selectedCampaignIndex + 1; i < allCampaigns.length; i++) {
            if ((allCampaigns[i] as any).type !== 'glider') {
                if (!_session.unlockedCampaignIndices.includes(i)) _session.unlockedCampaignIndices.push(i);
                break;
            }
        }
    }

    // Rank progression — tutorial does not count
    if (!isTutorial) {
        const prevRank = getRank(_session);
        _session.missionsDone++;
        if (next === 'DONE') _session.campaignsDone++;
        const newRank = getRank(_session);
        if (newRank.name !== prevRank.name) rankUpRank = newRank;
    }

    saveSession(_session);

    if (next === 'DONE') {
        cancelAnimationFrame(_rafId);
        _rafId = 0;
        document.getElementById('campaign-complete-name')!.textContent = '';
        document.getElementById('campaign-complete-screen')!.style.display = 'flex';
        soundHandler.play(musicConfig.success || 'final', false);
        if (rankUpRank) showRankUp(rankUpRank, _session.playerName);
        return;
    }
    const { gridSize, objects: nextObjects } = next;
    const nextPad = (nextObjects || []).find(o => o.type === 'pad') || { x: 10, y: 10 };
    G.PAD = { xMin: nextPad.x, xMax: nextPad.x + 7, yMin: nextPad.y, yMax: nextPad.y + 7, z: 0.5 };
    G.START_POS = { x: nextPad.x + 4, y: nextPad.y + 4 };
    initGrid(gridSize, G.points);

    cancelAnimationFrame(_rafId);
    _rafId = 0;
    const successEl = document.getElementById('mission-success-screen')!;
    successEl.style.display = 'flex';
    successEl.onclick = () => {
        successEl.style.display = 'none';
        if (_partyMode) soundHandler.play(musicConfig.mainMenu || 'maintheme', true);
        _partyMode = false;
        zstate.gameStarted = false;
        setTouchVisible(false);
        zstate.crashed = false;
        G.heli.fuel = 100;
        G.heli.onboard = 0;
        G.heli.engineOn = false;
        G.heli.rotorRPM = 0;
        G.heli.vx = 0;
        G.heli.vy = 0;
        G.heli.vz = 0;
        G.particles = [];
        G.debris = [];
        showBriefing();
        if (rankUpRank) showRankUp(rankUpRank, _session.playerName);
    };
}

function returnToBase() {
    cancelAnimationFrame(_rafId);
    _rafId = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (_partyMode) soundHandler.play(musicConfig.mainMenu || 'maintheme', true);
    _partyMode = false;
    zstate.gameStarted = false;
    if (mpState.active) {
        _mpReturnToLobby();
        return;
    }
    setTouchVisible(false);
    zstate.crashed = false;
    zstate.introActive = false;
    zstate.introProgress = 0;
    G.heli.fuel = 100;
    G.heli.onboard = 0;
    G.heli.engineOn = false;
    G.heli.rotorRPM = 0;
    G.heli.vx = 0;
    G.heli.vy = 0;
    G.heli.vz = 0;
    G.particles = [];
    G.debris = [];
    G.totalRescued = 0;

    document.getElementById('campaign-complete-screen')!.style.display = 'none';
    document.getElementById('campaign-failed-screen')!.style.display = 'none';
    document.getElementById('mission-success-screen')!.style.display = 'none';
    document.getElementById('crash-screen')!.style.display = 'none';
    hideBriefing();
    document.getElementById('campaign-select')!.style.display = 'flex';
    document.getElementById('campaign-grid')!.innerHTML = _buildCampaignGrid().join('');
    soundHandler.play(musicConfig.mainMenu || 'maintheme', true);
}

// ─── Multiplayer ──────────────────────────────────────────────────────────────

const _mpReturnToLobby = () => {
    cancelAnimationFrame(_rafId);
    _rafId = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    G.remoteHeli = null;
    resetMpState();
    zstate.crashed = false;
    zstate.gameStarted = false;
    zstate.introActive = false;
    G.particles = [];
    G.debris = [];
    setTouchVisible(false);
    ['mission-success-screen', 'campaign-failed-screen', 'campaign-complete-screen', 'crash-screen'].forEach(id => {
        const e = document.getElementById(id);
        if (e) e.style.display = 'none';
    });
    toMpLobby();
};

const toMpLobby = () => {
    document.getElementById('main-menu')!.style.display = 'none';
    setLobbyCallsign(_session.playerName || 'PILOT');
    showMpLobby({
        onConnected: (isHost: boolean, peerCallsign: string, channels: MpChannels, heliType: string) => {
            _setupMpChannels(channels, isHost);
            startMpGame(isHost, peerCallsign, heliType);
        },
        onBack: () => {
            hideMpLobby();
            document.getElementById('main-menu')!.style.display = 'flex';
        },
    });
};

const _setupMpChannels = (channels: MpChannels, isHost: boolean) => {
    mpState.channels = channels;
    channels.onPos(snap => {
        if (G.remoteHeli) applyHeliSnap(snap, G.remoteHeli);
    });
    channels.onEvent(evt => {
        if (evt.t === 'world' && !isHost) {
            applyWorldSnap(evt.s, G, n => { mpState.countdown = n; });
        } else if (evt.t === 'rescue') {
            G.totalRescued = evt.total;
        } else if (evt.t === 'done') {
            _mpMissionComplete();
        } else if (evt.t === 'heli') {
            if (G.remoteHeli) G.remoteHeli.type = evt.heliType;
        }
        // 'hello', 'ready', 'start', 'crash' handled in lobby or respawn
    });
};

const startMpGame = (isHost: boolean, peerCallsign: string, heliType: string) => {
    stopMenuParticles();
    soundHandler.play(musicConfig.mainMenu || 'maintheme', false);

    mpState.active = true;
    mpState.isHost = isHost;
    mpState.peerCallsign = peerCallsign;
    mpState.countdown = MP_COUNTDOWN_SEC;
    mpState.countdownMax = MP_COUNTDOWN_SEC;
    mpState.respawnTimer = 0;

    _selectedCampaignIndex = MP_CAMPAIGN_INDEX;
    campaignHandler.campaign.setActiveCampaign(MP_CAMPAIGN_INDEX);

    const { gridSize, objects: mpObjs } = campaignHandler.getCurrentMissionData();
    const padObj = (mpObjs || []).find((o: any) => o.type === 'pad') || MP_PAD;
    G.PAD = { xMin: padObj.x, xMax: padObj.x + 7, yMin: padObj.y, yMax: padObj.y + 7, z: 0.5 };
    G.START_POS = { x: padObj.x + 3.5, y: padObj.y + 3.5 };
    initGrid(gridSize, G.points);

    // Apply selected heli type
    G.heli.type = heliType;
    const _heliType = getHeliType(heliType);
    G.heli.maxLoad = _heliType.maxLoad;
    G.heli.accel = _heliType.accel;
    G.heli.friction = _heliType.friction;
    G.heli.tiltSpeed = _heliType.tiltSpeed;
    G.heli.fuelRate = _heliType.fuelRate;
    G.heli.liftPower = _heliType.liftPower;
    G.heli.cargoResist = _heliType.cargoResist;

    G.remoteHeli = {
        type: heliType,  // placeholder until peer sends {t:'heli'}
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        angle: 0, tilt: 0, roll: 0,
        rotorRPM: 0, rotationPos: 0,
        inAir: false,
    };

    // Hide all other screens
    ['splash', 'main-menu', 'campaign-select', 'heli-select'].forEach(id => {
        const e = document.getElementById(id);
        if (e) e.style.display = 'none';
    });

    // Directly launch without briefing
    launchMission();

    // Store host spawn (carrier start position, set by launchMission)
    mpState.spawnX = G.heli.x;
    mpState.spawnY = G.heli.y;
    mpState.spawnZ = G.heli.z;
    mpState.spawnAngle = G.heli.angle;

    // Guest override: spawn on PAD instead of carrier
    if (!isHost) {
        G.heli.x = G.PAD.xMin + 3.5;
        G.heli.y = G.PAD.yMin + 3.5;
        G.heli.z = G.PAD.z + 0.1;
        G.heli.vx = 0; G.heli.vy = 0; G.heli.vz = 0;
        G.heli.angle = 0;
        G.heli.engineOn = false;
        G.heli.rotorRPM = 0;
        zstate.introActive = false;
        zstate.cam.x = (G.heli.x - G.heli.y) * (tileW / 2);
        zstate.cam.y = (G.heli.x + G.heli.y) * (tileH / 2);
        // Update guest spawn to PAD position
        mpState.spawnX = G.heli.x;
        mpState.spawnY = G.heli.y;
        mpState.spawnZ = G.heli.z;
        mpState.spawnAngle = 0;
    }

    // Tell peer which heli we chose
    mpState.channels?.sendEvent({ t: 'heli', heliType });

    soundHandler.play(campaignHandler.getActiveCampaignMusic().ingame || 'clike', false);
};

const _mpTriggerCrash = (reason: string) => {
    if (mpState.respawnTimer > 0) return;  // already respawning
    mpState.respawnTimer = 1;  // mark as active (exact value doesn't matter)
    mpState.channels?.sendEvent({ t: 'crash', role: mpState.isHost ? 'host' : 'guest' });
    spawnExplosion(G.heli, G.particles, G.debris, G.points, G.CARRIER);
    showMsg(reason);
    G.heli.vx = 0; G.heli.vy = 0; G.heli.vz = 0;
    G.heli.engineOn = false;
    G.heli.rotorRPM = 0;
    G.heli.inAir = false;
    setTimeout(() => {
        G.heli.x = mpState.spawnX;
        G.heli.y = mpState.spawnY;
        G.heli.z = mpState.spawnZ;
        G.heli.angle = mpState.spawnAngle;
        G.heli.vx = 0; G.heli.vy = 0; G.heli.vz = 0;
        G.heli.engineOn = false;
        G.heli.rotorRPM = 0;
        G.heli.fuel = 1.0;
        G.heli.onboard = 0;
        G.heli.inAir = false;
        zstate.cam.x = (G.heli.x - G.heli.y) * (tileW / 2);
        zstate.cam.y = (G.heli.x + G.heli.y) * (tileH / 2);
        mpState.respawnTimer = 0;
    }, 2500);
};

const _mpMissionComplete = () => {
    mpState.channels?.sendEvent({ t: 'done' });
    // returnToBase listener on mission-success-screen handles the click → _mpReturnToLobby
    document.getElementById('mission-success-screen')!.style.display = 'flex';
};

const _mpTimeOut = () => {
    document.getElementById('campaign-failed-reason')!.innerHTML = 'ZEIT ABGELAUFEN';
    // returnToBase listener on campaign-failed-screen handles the click → _mpReturnToLobby
    document.getElementById('campaign-failed-screen')!.style.display = 'flex';
};

// ─── campaign / G.heli select ──────────────────────────────────────────────────
function toCampaignSelect() {
    soundHandler.play(musicConfig.mainMenu || 'maintheme', false);
    document.getElementById('splash')!.style.display = 'none';
    document.getElementById('main-menu')!.style.display = 'none';
    document.getElementById('campaign-select')!.style.display = 'flex';
    document.getElementById('campaign-grid')!.innerHTML = _buildCampaignGrid().join('');
}

function launchEasterEgg() {
    const index = campaignHandler.getCampaigns().findIndex(c => c.type === 'glider');
    if (index < 0) return;
    toCampaignSelect();
    selectCampaign(String(index));
}

function setHover(type: string, state: boolean) {
    G.menuHover[type] = state;
}

function selectCampaign(index: string) {
    _selectedCampaignIndex = Number(index);
    campaignHandler.campaign.setActiveCampaign(Number(index));
    const { gridSize, objects: selObjects, campaignType } = campaignHandler.getCurrentMissionData();
    const selPad = (selObjects || []).find(o => o.type === 'pad') || { x: 10, y: 10 };
    G.PAD = { xMin: selPad.x, xMax: selPad.x + 7, yMin: selPad.y, yMax: selPad.y + 7, z: 0.5 };
    G.START_POS = { x: selPad.x + 4, y: selPad.y + 4 };
    initGrid(gridSize, G.points);
    document.getElementById('campaign-grid')!.innerHTML = '';
    document.getElementById('campaign-select')!.style.display = 'none';
    buildHeliSelect(campaignType);
    document.getElementById('heli-select')!.style.display = 'flex';
    animateHeliPreviews();
}

function startGame(type: string) {
    if (zstate.gameStarted) return;
    stopMenuParticles();
    soundHandler.play(campaignHandler.getActiveCampaignMusic().ingame || 'clike', false);
    G.heli.type = type;
    const _heliType = getHeliType(type);
    G.heli.maxLoad = _heliType.maxLoad;
    G.heli.accel = _heliType.accel;
    G.heli.friction = _heliType.friction;
    G.heli.tiltSpeed = _heliType.tiltSpeed;
    G.heli.fuelRate = _heliType.fuelRate;
    G.heli.liftPower = _heliType.liftPower;
    G.heli.cargoResist = _heliType.cargoResist;
    generateTerrain(G.points, G.PAD);
    initCarrierFromMission();
    initBoatsFromMission();
    document.getElementById('heli-select')!.style.display = 'none';
    showBriefing();
}

function launchMission() {
    generateTerrain(G.points, G.PAD);
    // Populate per-mission cache — never call getCurrentMissionData() in the render loop
    const _lmd = campaignHandler.getCurrentMissionData();
    const _lmdObjs = _lmd.objects || [];
    _missionHasPad = !!_lmdObjs.find((o: any) => o.type === 'pad');
    _missionHasCarrier = !!_lmdObjs.find((o: any) => o.type === 'carrier');
    _missionHasLighthouse = !!_lmdObjs.find((o: any) => o.type === 'lighthouse');
    _missionRain = !!_lmd.rain;
    _missionNight = !!_lmd.night;
    _missionWindStr = _lmd.windStr ?? 1;
    _missionWindDir = _lmd.windDir ?? 0;
    _missionWindVar = !!_lmd.windVar;
    const _lhObj = _lmdObjs.find((o: any) => o.type === 'lighthouse');
    _lighthouseX = _lhObj ? _lhObj.x : -1;
    _lighthouseY = _lhObj ? _lhObj.y : -1;
    _missionGridSize = campaignHandler.getTerrain().gridSize;

    _precomputeDayColors(_missionRain);
    initCarrierFromMission();
    initBoatsFromMission();
    initFoliageFromMission();
    initBirds();
    initPayloadsFromMission();
    if (hasPad()) initFuelTruck();

    G.heli.winch = 0;
    zstate.crashed = false;
    zstate.gameStarted = true;
    setTouchVisible(true);

    if (G.heli.type === 'glider') {
        zstate.introActive = false;
        G.heli.x = G.START_POS.x;
        G.heli.y = G.START_POS.y;
        G.heli.z = getGround(G.START_POS.x, G.START_POS.y, G.points, G.CARRIER) + 5;
        G.heli.vx = Math.cos(G.heli.angle) * 0.1;
        G.heli.vy = Math.sin(G.heli.angle) * 0.1;
        G.heli.vz = 0.0;
        G.heli.tilt = 0.0;
        G.heli.engineOn = false;
        G.heli.rotorRPM = 0;
        zstate.cam.x = (G.heli.x - G.heli.y) * (tileW / 2);
        zstate.cam.y = (G.heli.x + G.heli.y) * (tileH / 2);
        showMsg(I18N.SOARING);
    } else if (isStartsOnCarrier()) {
        zstate.introActive = false;
        zstate.introProgress = 1;
        G.heli.x = G.CARRIER.x;
        G.heli.y = G.CARRIER.y - 1;
        G.heli.z = G.CARRIER.zDeck + 0.1;
        G.heli.vx = 0;
        G.heli.vy = 0;
        G.heli.vz = 0;
        G.heli.inAir = false;
        G.heli.angle = G.CARRIER.angle;
        G.heli.engineOn = false;
        G.heli.rotorRPM = 0;
        zstate.cam.x = (G.heli.x - G.heli.y) * (tileW / 2);
        zstate.cam.y = (G.heli.x + G.heli.y) * (tileH / 2);
        showMsg(I18N.SYSTEM_READY);
    } else {
        zstate.introActive = true;
        zstate.introProgress = 0;
        zstate.cam.x = (G.START_POS.x - G.START_POS.y) * (tileW / 2);
        zstate.cam.y = (G.START_POS.x + G.START_POS.y) * (tileH / 2);
    }

    cancelAnimationFrame(_rafId);
    _rafId = requestAnimationFrame(drawScene);
}

//
// KOORDINATENSYSTEM (isometrisch, Kamera schaut von NW):
//   +X  = Welt-rechts  = iso: rechts-unten im Bild
//   +Y  = Welt-oben    = iso: links-unten im Bild
//   +Z  = Höhe         = iso: senkrecht nach oben im Bild
//
// PAD-Layout (Beispiel: xMin=44 xMax=51 yMin=69 yMax=76, z=0.5):
//
//   Y=76 ┌─────────────────────┐
//        │        PAD           │
//   Y=71 │       ┌─────────────┐│  ← Hangar (x: xMax-4..xMax, y: yMin..yMin+2)
//   Y=69 │       └─────────────┘│  ← Hangar-Öffnung zeigt in +Y Richtung
//        └─────────────────────┘
//        X=44                 X=51
//
// TRUCK-GEOMETRIE (lokales Koordinatensystem, +X = Vorwärts = Cab-Richtung):
//   local X=0      : Heck (Arm-Pivot)
//   local X=0.25-1.4: Tank
//   local X=1.5-2.2 : Cab / Front
//   Fahrtrichtung  : world angle = atan2(dy,dx), truck +X zeigt dahin
//
// PARKPOSITION: direkt neben linker Hangar-Wand (bei xMax-4), längs dazu
//   parkX = PAD.xMax - 5.2   (Truck-Mitte in X; rechte Seite bei xMax-4.75, Abstand 0.75 zur Wand)
//   parkY = PAD.yMin + 0.1   (Heck bündig mit Hangar-Rückwand)
//   parkAngle = +PI/2        (Nase zeigt in +Y = zur Hangar-Öffnung hin)
//
let _fpsLastTime = 0,
    _fpsSmooth = 60;
function drawScene() {
    const _now = performance.now();
    const dt = _fpsLastTime > 0 ? Math.min((_now - _fpsLastTime) / (1000 / 60), 3.0) : 1.0;
    if (_fpsLastTime) _fpsSmooth += (1000 / (_now - _fpsLastTime) - _fpsSmooth) * 0.1;
    _fpsLastTime = _now;

    const rain = _missionRain;
    const isNight = _missionNight;
    const lighthouseX = _lighthouseX;
    const lighthouseY = _lighthouseY;
    const gridSize = _missionGridSize;

    if (!zstate.gameStarted) return;
    if (!zstate.crashed) updatePhysics(dt, _physicsCtx);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!zstate.introActive) {
        const tx = (G.heli.x - G.heli.y) * (tileW / 2);
        if (_isTouchDevice()) {
            // Mobile: snap camera to heli incl. altitude so terrain shifts with height
            const ty = (G.heli.x + G.heli.y) * (tileH / 2) - G.heli.z * stepH;
            zstate.cam.x = tx;
            zstate.cam.y = ty;
        } else {
            // Desktop: smooth-follow ground point only — camera doesn't rise with heli
            const ty = (G.heli.x + G.heli.y) * (tileH / 2);
            zstate.cam.x += (tx - zstate.cam.x) * 0.1 * dt;
            zstate.cam.y += (ty - zstate.cam.y) * 0.1 * dt;
        }
    } else {
        zstate.introProgress += 0.005 * dt;
        let hX = G.PAD.xMin + 3,
            hY = G.PAD.yMin + 3;
        G.heli.x = hX + (G.START_POS.x - hX) * zstate.introProgress;
        G.heli.y = hY + (G.START_POS.y - hY) * zstate.introProgress;
        G.heli.z = G.PAD.z;
        G.heli.angle = -Math.PI / 4;
        G.heli.rotorRPM = 0;
        if (zstate.introProgress >= 1) {
            zstate.introActive = false;
            G.heli.engineOn = false;
            G.heli.rotorRPM = 0;
            G.heli.x = G.START_POS.x;
            G.heli.y = G.START_POS.y;
            showMsg(I18N.SYSTEM_READY);
        }
    }

    const camX = zstate.cam.x,
        camY = zstate.cam.y;

    let rx: number, ry: number;
    if (zstate.introActive) {
        rx = G.START_POS.x;
        ry = G.START_POS.y;
    } else if (_isTouchDevice()) {
        // Mobile: derive tile center from camera (includes z-shift)
        rx = camX / tileW + camY / tileH;
        ry = camY / tileH - camX / tileW;
    } else {
        rx = G.heli.x;
        ry = G.heli.y;
    }

    _drawTerrain(camX, camY, rx, ry, isNight, rain);

    if (hasLighthouse() && isVisible(lighthouseX, lighthouseY)) drawLighthouse(camX, camY);
    if (hasCarrier() && isVisible(G.CARRIER.x, G.CARRIER.y, 25)) drawVectorCarrier(camX, camY);
    drawParkedHelis(camX, camY);
    G.BOATS.forEach(b => {
        if (isVisible(b.x, b.y, 15)) drawSailboat(b.x, b.y, b.angle, camX, camY);
    });
    if (hasPad() && isVisible(G.PAD.xMin + 3, G.PAD.yMin + 3)) drawHangar();
    if (hasPad() && G.fuelTruck && isVisible(G.fuelTruck.x, G.fuelTruck.y))
        drawFuelTruck(G.fuelTruck.x, G.fuelTruck.y, G.fuelTruck.angle, {
            z: G.PAD ? G.PAD.z : 0,
            armExtend: G.fuelTruck.arm,
            armTarget: { x: G.heli.x, y: G.heli.y },
            getFuelingState: () => G.fuelTruck.state === 'FUELING',
        });
    SceneRenderer.flush(camX, camY);
    if (hasPad()) drawPadLights(camX, camY, G.PAD.z, false);
    if (hasPad() && isVisible(G.PAD.xMin, G.PAD.yMin)) drawWindsock(camX, camY); // pad always in range if visible

    // Test-Bäume
    G.TREES_MAP.forEach((t: any) => {
        if (isVisible(t.x, t.y))
            drawTree(t.x, t.y, camX, camY, t.s, t.gz, t.type || 'pine', G.wind, _partyMode && t.type !== 'dead');
    });

    // Vögel
    updateBirds();
    drawBirds(camX, camY);

    // shadow pass
    if (!isNight && !zstate.crashed) {
        drawHeli(
            G.heli.type,
            G.heli.x,
            G.heli.y,
            G.heli.z,
            G.heli.angle,
            G.heli.tilt,
            G.heli.roll,
            G.heli.rotationPos,
            camX,
            camY,
            { isShadow: true, shadowGetGround: (x, y) => getGround(x, y, G.points, G.CARRIER) }
        );
        if (G.remoteHeli) {
            drawHeli(G.remoteHeli.type, G.remoteHeli.x, G.remoteHeli.y, G.remoteHeli.z,
                G.remoteHeli.angle, G.remoteHeli.tilt, G.remoteHeli.roll, G.remoteHeli.rotationPos,
                camX, camY,
                { isShadow: true, shadowGetGround: (x, y) => getGround(x, y, G.points, G.CARRIER) });
        }
    }

    // G.particles
    G.particles.forEach(p => {
        p.vz = (p.vz || 0) + (p.gravity || 0);
        p.z = (p.z || 0) + p.vz;
        p.x += p.vx || 0;
        p.y += p.vy || 0;
        p.life -= p.isSmoke ? 0.018 : 0.025;
        let pos = iso(p.x, p.y, Math.max(p.z, 0), camX, camY, { stepH, tileW, tileH, canvas });
        const alpha = Math.min(1.0, p.life * (p.isSmoke ? 1.5 : 2.0));
        const size = p.size || 3;
        ctx.globalAlpha = Math.max(0, alpha);
        if (p.isSmoke) {
            ctx.fillStyle = `rgb(${p.color})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size * (1.5 - p.life * 0.5), 0, Math.PI * 2);
            ctx.fill();
        } else if (p.isMetal) {
            ctx.fillStyle = `rgb(${p.color})`;
            ctx.fillRect(pos.x - 1.5, pos.y - 1.5, 3, 3);
        } else if (p.isConfetti) {
            ctx.fillStyle = `rgb(${p.color})`;
            ctx.fillRect(pos.x - 2, pos.y - 2, 4, 4);
        } else {
            ctx.fillStyle = `rgb(${p.color})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    });
    G.particles = G.particles.filter(p => p.life > 0);

    // G.debris (Heli-Trümmer)
    if (G.debris.length > 0) {
        updateDebris();
        drawDebris(G.debris, camX, camY, ctx, canvas);
    }

    // Heli nur rendern wenn nicht gecrasht
    if (!zstate.crashed) {
        // ground persons drawn BEFORE heli for correct depth order
        drawPayloadObjects(false);
        // ropes drawn BEFORE heli so heli body renders over rope top
        drawPayloadObjects(true, true);

        // winch line (only when nothing hanging, not for glider)
        if (!G.activePayload && G.heli.type !== 'glider') {
            const rs = G.rescuerSwing;
            const winchTipZ = Math.max(getGround(rs.x, rs.y), G.heli.z - G.heli.winch);
            let hP = iso(G.heli.x, G.heli.y, G.heli.z, camX, camY, { stepH, tileW, tileH, canvas });
            let wP = iso(rs.x, rs.y, winchTipZ, camX, camY, { stepH, tileW, tileH, canvas });
            ctx.strokeStyle = '#bbb';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(hP.x, hP.y);
            ctx.lineTo(wP.x, wP.y);
            ctx.stroke();
        }
        // rescuer always at winch tip when winch is extended
        if (G.heli.type !== 'glider' && G.heli.winch > 0.3) {
            const rs = G.rescuerSwing;
            const winchTipZ = G.activePayload
                ? G.activePayload.z + (G.activePayload.type === 'person' ? 0.35 : 0)
                : Math.max(getGround(rs.x, rs.y), G.heli.z - G.heli.winch);
            drawPerson(
                rs.x,
                rs.y,
                winchTipZ,
                0,
                false,
                camX,
                camY,
                'rescuer',
                _partyMode ? { shirt: '#ffffff', pants: '#ffffff' } : undefined
            );
        }

        if (_partyMode && Math.floor(Date.now() / 80) % 2 === 0) _refreshPartyColors();
        drawHeli(
            G.heli.type,
            G.heli.x,
            G.heli.y,
            G.heli.z,
            G.heli.angle,
            G.heli.tilt,
            G.heli.roll,
            G.heli.rotationPos,
            camX,
            camY,
            {
                shadowGetGround: (x, y) => getGround(x, y),
                ...(_partyMode ? { fillColor: _partyColors[0], strokeColor: _partyColors[1] } : {}),
            }
        );

        // Remote heli (Multiplayer)
        if (G.remoteHeli) {
            drawHeli(G.remoteHeli.type, G.remoteHeli.x, G.remoteHeli.y, G.remoteHeli.z,
                G.remoteHeli.angle, G.remoteHeli.tilt, G.remoteHeli.roll, G.remoteHeli.rotationPos,
                camX, camY, { fillColor: '#4488ff', strokeColor: '#2255cc' });
            const rPos = iso(G.remoteHeli.x, G.remoteHeli.y, G.remoteHeli.z, camX, camY, { stepH, tileW, tileH, canvas });
            ctx.font = 'bold 11px monospace';
            ctx.fillStyle = '#7cf';
            ctx.textAlign = 'center';
            ctx.fillText(mpState.peerCallsign || 'P2', rPos.x, rPos.y - 32);
            ctx.textAlign = 'left';
        }

        renderRain();

        // collision box checks + optional debug rendering
        handleCollisionBoxes();
        if (showCollisionBoxes) drawDebugOverlay(camX, camY);

        // hanging payload figures drawn after heli (no rope, that's done above)
        drawPayloadObjects(true, false);
    } // end if (!zstate.crashed)

    // Glider HUD
    if (!zstate.introActive && G.heli.type === 'glider') {
        const agl = Math.max(0, G.heli.z - getGround(G.heli.x, G.heli.y, G.points, null));
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = agl < 3 ? '#f44' : '#8ef';
        ctx.fillText(`ALT  ${Math.round(agl * 10)}m`, 20, canvas.height - 36);
        ctx.fillStyle = '#aaa';
        ctx.fillText('↑↓ PITCH   ←→ BANK', 20, canvas.height - 18);
    }

    // HUD
    if (!zstate.introActive && G.heli.type !== 'glider') {
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = '#5f5';
        let hX = iso(G.heli.x, G.heli.y, G.heli.z, camX, camY, { stepH, tileW, tileH, canvas }).x + 45;
        let hY = iso(G.heli.x, G.heli.y, G.heli.z, camX, camY, { stepH, tileW, tileH, canvas }).y - 35;
        ctx.fillText(`ALT: ${Math.round((G.heli.z - getGround(G.heli.x, G.heli.y)) * 10)}m`, hX, hY);
        ctx.fillText(`SPD: ${Math.round(Math.hypot(G.heli.vx, G.heli.vy) * 1115)}km/h`, hX, hY + 16);
        ctx.fillText(`WINCH: ${Math.round(G.heli.winch * 10)}m`, hX, hY + 32);
        ctx.fillStyle = G.heli.fuel < 20 ? '#f00' : '#5f5';
        ctx.fillText(`FUEL: ${Math.max(0, Math.round(G.heli.fuel))}%`, hX, hY + 48);
        ctx.fillStyle = G.heli.onboard >= G.heli.maxLoad ? '#f90' : '#5f5';
        ctx.fillText(`PAX: ${G.heli.onboard}/${G.heli.maxLoad}`, hX, hY + 64);
        ctx.fillStyle = '#5f5';
        const landObj = G.objectives.find(o => o.type === 'land_at');
        if (landObj) {
            ctx.fillText(`FLY TO: ${landObj.target.toUpperCase()}`, hX, hY + 80);
        } else {
            ctx.fillText(`SAVED: ${G.totalRescued}/${G.goalCount}`, hX, hY + 80);
        }
        if (_session.playerName) {
            ctx.fillStyle = '#888';
            ctx.font = '11px monospace';
            ctx.fillText(_session.playerName, hX, hY + 100);
            ctx.font = 'bold 13px monospace';
        }

        // minimap
        const ms = 140,
            mp = 20;
        const bx = canvas.width - ms - mp,
            by = _isTouchDevice() ? mp : canvas.height - ms - mp;
        const sc = ms / gridSize;

        // Hilfsfunktion: liegt Punkt innerhalb der Minimap?
        const inMM = (wx: number, wy: number) => {
            const px = bx + wx * sc,
                py = by + wy * sc;
            return px >= bx && px <= bx + ms && py >= by && py <= by + ms;
        };

        ctx.fillStyle = 'rgba(0,20,10,0.8)';
        ctx.fillRect(bx, by, ms, ms);
        ctx.strokeStyle = '#5f5';
        ctx.strokeRect(bx, by, ms, ms);

        // Clipping auf Minimap-Bereich
        ctx.save();
        ctx.beginPath();
        ctx.rect(bx, by, ms, ms);
        ctx.clip();

        if (hasPad()) {
            ctx.fillStyle = '#666';
            ctx.fillRect(
                bx + G.PAD.xMin * sc,
                by + G.PAD.yMin * sc,
                (G.PAD.xMax - G.PAD.xMin) * sc,
                (G.PAD.yMax - G.PAD.yMin) * sc
            );
        }
        if (hasCarrier() && inMM(G.CARRIER.x, G.CARRIER.y)) {
            ctx.fillStyle = '#889';
            ctx.beginPath();
            ctx.arc(bx + G.CARRIER.x * sc, by + G.CARRIER.y * sc, 4, 0, 7);
            ctx.fill();
        }
        if (inMM(G.heli.x, G.heli.y)) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(bx + G.heli.x * sc - 1.5, by + G.heli.y * sc - 1.5, 3, 3);
        }
        // payload dots
        G.payloads.forEach(p => {
            if (p.rescued || p.npcTarget || p.hanging) return;
            if (!inMM(p.x, p.y)) return;
            ctx.fillStyle = p.type === 'crate' ? '#d84' : '#f00';
            ctx.beginPath();
            ctx.arc(bx + p.x * sc, by + p.y * sc, 2, 0, 7);
            ctx.fill();
        });

        // Remote heli dot (MP)
        if (mpState.active && G.remoteHeli && inMM(G.remoteHeli.x, G.remoteHeli.y)) {
            ctx.fillStyle = '#7cf';
            ctx.fillRect(bx + G.remoteHeli.x * sc - 1.5, by + G.remoteHeli.y * sc - 1.5, 3, 3);
        }

        ctx.restore();
    }

    // ── MP: countdown HUD ─────────────────────────────────────────────────────
    if (mpState.active && !zstate.introActive) {
        const cd = Math.max(0, Math.ceil(mpState.countdown));
        const mins = Math.floor(cd / 60);
        const secs = cd % 60;
        const cdStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = cd < 60 ? '#f44' : '#ff0';
        ctx.textAlign = 'center';
        ctx.fillText(cdStr, canvas.width / 2, 28);
        ctx.textAlign = 'left';
    }

    // ── MP: state sync ────────────────────────────────────────────────────────
    if (mpState.active) {
        const now = performance.now();
        // Send heli position ~20 Hz
        if (now - mpState.lastPosSent > 50) {
            mpState.channels?.sendPos(packHeli(G.heli));
            mpState.lastPosSent = now;
        }
        if (mpState.isHost) {
            // Tick countdown (only when not respawning)
            if (mpState.respawnTimer === 0) {
                mpState.countdown = Math.max(0, mpState.countdown - dt / 60);
            }
            if (mpState.countdown <= 0 && mpState.respawnTimer === 0) {
                _mpTimeOut();
            }
            // Send world snap ~10 Hz
            if (now - mpState.lastWorldSent > 100) {
                mpState.channels?.sendEvent({
                    t: 'world',
                    s: packWorld(G.seaTime, G.payloads, G.totalRescued, mpState.countdown),
                });
                mpState.lastWorldSent = now;
            }
        }
    }

    if (showCollisionBoxes) {
        const fps = Math.round(_fpsSmooth);
        const fpsColor = fps >= 55 ? '#0f0' : fps >= 30 ? '#ff0' : '#f44';
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = fpsColor;
        ctx.textAlign = 'right';
        ctx.fillText(`${fps} FPS`, canvas.width - 10, canvas.height - 10);
        ctx.textAlign = 'left';
    }

    if (_partyMode) drawDiscoBall();

    _rafId = requestAnimationFrame(drawScene);
}

const _drawDiscoBall = (() => {
    // Pre-bake tile positions so we don't recompute every frame
    type Tile = { row: number; col: number; phi: number; basePhi: number; ringR: number; tileW: number; tileH: number };
    let _tiles: Tile[] = [];
    const ROWS = 9,
        BASE_COLS = 14,
        R = 38;
    for (let row = 0; row < ROWS; row++) {
        const phi = ((row + 0.5) / ROWS) * Math.PI;
        const ringR = Math.sin(phi);
        const cols = Math.max(4, Math.round(BASE_COLS * ringR));
        for (let col = 0; col < cols; col++) {
            _tiles.push({
                row,
                col,
                phi,
                basePhi: (col / cols) * Math.PI * 2,
                ringR,
                tileW: R * 0.22 * ringR,
                tileH: R * 0.16,
            });
        }
    }
    return () => {
        const w = canvas.width,
            h = canvas.height;
        const cx = w / 2,
            cy = R + 12;
        const t = Date.now() / 1000;

        ctx.save();

        // String
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, cy - R);
        ctx.stroke();

        // Reflection spots scattered across the canvas
        for (let i = 0; i < 18; i++) {
            const angle = (i / 18) * Math.PI * 2 + t * 0.6;
            const dist = 80 + i * 28;
            const sx = cx + Math.cos(angle + Math.sin(t * 0.4 + i)) * dist * (w / 800);
            const sy = cy + Math.sin(angle * 1.3 + t * 0.3) * dist * 0.9;
            if (sx < 0 || sx > w || sy < 0 || sy > h) continue;
            const col = _PARTY_PALETTE[(i + Math.floor(t * 3)) % _PARTY_PALETTE.length];
            ctx.globalAlpha = 0.18 + 0.12 * Math.sin(t * 4 + i);
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(sx, sy, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        // Ball body
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();

        // Mirror tiles
        _tiles.forEach(({ row, basePhi, phi, ringR, tileW, tileH }) => {
            const theta = basePhi + t * 1.1;
            const z3d = ringR * Math.sin(theta);
            if (z3d < 0) return; // back face culling
            const x3d = ringR * Math.cos(theta);
            const sx = cx + x3d * R;
            const sy = cy - Math.cos(phi) * R;
            const brightness = 0.3 + z3d * 0.7;
            const colorIdx = Math.abs(row * 5 + Math.floor(basePhi * 3) + Math.floor(t * 5)) % _PARTY_PALETTE.length;
            ctx.globalAlpha = brightness;
            ctx.fillStyle = _PARTY_PALETTE[colorIdx];
            ctx.fillRect(sx - tileW / 2, sy - tileH / 2, tileW, tileH);
        });

        // Highlight gloss
        ctx.globalAlpha = 1;
        const hl = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, 0, cx, cy, R);
        hl.addColorStop(0, 'rgba(255,255,255,0.55)');
        hl.addColorStop(0.4, 'rgba(255,255,255,0.05)');
        hl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hl;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    };
})();
const drawDiscoBall = _drawDiscoBall;

// ─── draw all G.payloads ───────────────────────────────────────────────────────
function drawPayloadObjects(hangingOnly = false, ropeOnly = false) {
    const isNight = _missionNight;
    const { cam } = zstate;

    G.payloads.forEach(payload => {
        if (payload.rescued && !payload.hanging) return;
        if (hangingOnly && !payload.hanging) return;
        if (!hangingOnly && payload.hanging) return;
        if (!payload.hanging && !isVisible(payload.x, payload.y)) return;

        if (isNight && !payload.hanging) {
            const dx = payload.x - G.heli.x,
                dy = payload.y - G.heli.y;
            const alt = G.heli.z - getGround(G.heli.x, G.heli.y, G.points, G.CARRIER);
            if (Math.hypot(dx, dy) > 10 + alt * 2.0) return;
            let diff = Math.atan2(dy, dx) - G.heli.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            if (Math.abs(diff) > 0.3 + alt * 0.05) return;
        }

        // Rope-only pass: draw rope before heli so heli renders over it
        if (ropeOnly) {
            if (!payload.hanging || G.heli.winch < 0.4) return;
            const hPos = iso(G.heli.x, G.heli.y, G.heli.z, cam.x, cam.y, { stepH, tileW, tileH, canvas });
            const pp = iso(payload.x, payload.y, payload.z, cam.x, cam.y, { stepH, tileW, tileH, canvas });
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(hPos.x, hPos.y);
            ctx.lineTo(pp.x, pp.y - (payload.type === 'person' ? 5 : 0));
            ctx.stroke();
            return;
        }

        // Hide hanging payload when nearly winched in (avoids "spawn into heli" look)
        if (payload.hanging && G.heli.winch < 0.4) return;

        let p = iso(payload.x, payload.y, payload.z, cam.x, cam.y, { stepH, tileW, tileH, canvas });
        if (payload.type === 'crate') {
            ctx.fillStyle = '#d84';
            ctx.strokeStyle = '#530';
            ctx.lineWidth = 1;
            let s = 14;
            ctx.fillRect(p.x - s / 2, p.y - s, s, s);
            ctx.strokeRect(p.x - s / 2, p.y - s, s, s);
        } else {
            drawPerson(
                payload.x,
                payload.y,
                payload.z,
                0,
                !payload.hanging,
                cam.x,
                cam.y,
                undefined,
                payload.outfitColors
            );
            if (payload.z < 0) {
                ctx.strokeStyle = '#aaf';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 6, 0, 7);
                ctx.stroke();
            }
        }
    });
}

function drawVectorCarrier(cx: number, cy: number) {
    const objX = G.CARRIER.x,
        objY = G.CARRIER.y;
    const deckZ = G.CARRIER.zDeck;
    const angle = G.CARRIER.angle;
    const cosA = Math.cos(angle),
        sinA = Math.sin(angle);
    function r(rx: number, ry: number) {
        return { x: objX + rx * cosA - ry * sinA, y: objY + rx * sinA + ry * cosA };
    }
    // Pass 1: Hull (flush alone so deck objects always render on top)
    SceneRenderer.add(CARRIER_HULL_DEF, { x: objX, y: objY, z: 0, angle });
    SceneRenderer.flush(cx, cy);

    // Pass 2: Tractors (drawFn) + Tower (depth-sorted together)
    const ix = 2.6,
        iy = 1.0,
        iw = 1.5,
        il = 4.5,
        ih = 2.5;
    const tractorData = [
        {
            tx: ix + 0.1,
            ty: iy - 1.2,
            ta: 0,
            bc: '#9a7a00',
            bs: '#c8a000',
            bd: '#8a6c00',
            cc: '#b09000',
            cs: '#e0b800',
            ct: '#caa800',
        },
        {
            tx: ix + 0.1,
            ty: iy - 2.4,
            ta: 0,
            bc: '#9a7a00',
            bs: '#c8a000',
            bd: '#8a6c00',
            cc: '#b09000',
            cs: '#e0b800',
            ct: '#caa800',
        },
        {
            tx: ix + 0.1,
            ty: iy - 3.8,
            ta: 0.25,
            bc: '#888888',
            bs: '#dddddd',
            bd: '#666666',
            cc: '#aaaaaa',
            cs: '#ffffff',
            ct: '#eeeeee',
        },
    ];
    tractorData.forEach(t => {
        const wx = objX + (t.tx + 0.5) * cosA - (t.ty + 0.35) * sinA;
        const wy = objY + (t.tx + 0.5) * sinA + (t.ty + 0.35) * cosA;
        SceneRenderer.add(null, {
            x: wx,
            y: wy,
            z: deckZ,
            drawFn: (cx, cy) =>
                drawTractor(objX, objY, angle, deckZ, cx, cy, t.tx, t.ty, t.ta, t.bc, t.bs, t.bd, t.cc, t.cs, t.ct),
        });
    });
    const towerWX = objX + (ix + iw / 2) * cosA - (iy + il / 2) * sinA;
    const towerWY = objY + (ix + iw / 2) * sinA + (iy + il / 2) * cosA;
    SceneRenderer.add(CARRIER_TOWER_DEF, { x: objX, y: objY, z: 0, angle, depth: towerWX + towerWY });
    SceneRenderer.flush(cx, cy);

    // Antenna
    const antB = r(ix + iw * 0.5, iy + il * 0.25);
    const a0 = iso(antB.x, antB.y, deckZ + ih, cx, cy, { stepH, tileW, tileH, canvas });
    const a1 = iso(antB.x, antB.y, deckZ + ih + 0.6, cx, cy, { stepH, tileW, tileH, canvas });
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a0.x, a0.y);
    ctx.lineTo(a1.x, a1.y);
    ctx.stroke();

    // Radar
    const rBase = r(ix + iw * 0.5, iy + il * 0.5);
    const rZ = deckZ + ih + 0.18;
    const rHub = iso(rBase.x, rBase.y, rZ, cx, cy, { stepH, tileW, tileH, canvas });
    const rm0 = iso(rBase.x, rBase.y, deckZ + ih, cx, cy, { stepH, tileW, tileH, canvas });
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(rm0.x, rm0.y);
    ctx.lineTo(rHub.x, rHub.y);
    ctx.stroke();
    const rA = Date.now() * 0.002,
        rL = 0.22;
    const rt = iso(rBase.x + Math.cos(rA) * rL, rBase.y + Math.sin(rA) * rL, rZ, cx, cy, {
        stepH,
        tileW,
        tileH,
        canvas,
    });
    const rtl = iso(rBase.x - Math.cos(rA) * rL, rBase.y - Math.sin(rA) * rL, rZ, cx, cy, {
        stepH,
        tileW,
        tileH,
        canvas,
    });
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rtl.x, rtl.y);
    ctx.lineTo(rt.x, rt.y);
    ctx.stroke();
    ctx.fillStyle = '#aaa';
    ctx.beginPath();
    ctx.arc(rHub.x, rHub.y, 2, 0, Math.PI * 2);
    ctx.fill();

    drawPadLights(cx, cy, G.CARRIER.zDeck, true);
}

function drawParkedHelis(cx: number, cy: number) {
    if (!hasCarrier()) return;
    const angle = G.CARRIER.angle;
    const deckZ = G.CARRIER.zDeck;
    parkedHelis.forEach(h => {
        if (!isVisible(G.CARRIER.x, G.CARRIER.y)) return;
        const cosA = Math.cos(angle),
            sinA = Math.sin(angle);
        const wx = G.CARRIER.x + h.xRel * cosA - h.yRel * sinA;
        const wy = G.CARRIER.y + h.xRel * sinA + h.yRel * cosA;
        const totalAng = h.angle + angle;
        const rotorPos = 0;
        drawHeli(h.type, wx, wy, deckZ + 0.1, totalAng, 0, 0, rotorPos, cx, cy, {
            isShadow: true,
            scaleOverride: 1,
            fillColor: '#556b2f',
            strokeColor: '#3a4a1f',
            shadowGetGround: () => deckZ + 0.1,
        });
        drawHeli(h.type, wx, wy, deckZ + 0.1, totalAng, 0, 0, rotorPos, cx, cy, {
            scaleOverride: 1,
            fillColor: '#556b2f',
            strokeColor: '#3a4a1f',
        });
    });
}
// ─── pad / hangar / lights / windsock / lighthouse ───────────────────────────
function drawHangar() {
    SceneRenderer.add(HANGAR_DEF, {
        x: G.PAD.xMax - 2,
        y: G.PAD.yMin + 1,
        z: G.PAD.z,
        angle: Math.PI / 2,
    });
}

function drawPadLights(cx: number, cy: number, z: number, isCarrier = false) {
    let blink = Math.floor(Date.now() / 500) % 2 === 0;
    if (isCarrier) {
        let cw = G.CARRIER.w + 1.2,
            cl = G.CARRIER.l + 1.2,
            ang = G.CARRIER.angle;
        function r(rx: number, ry: number) {
            return {
                x: G.CARRIER.x + rx * Math.cos(ang) - ry * Math.sin(ang),
                y: G.CARRIER.y + rx * Math.sin(ang) + ry * Math.cos(ang),
            };
        }
        setLightsOnDeck([r(-cw, -cl), r(cw, -cl), r(cw, cl), r(-cw, cl)], blink, cx, cy, z);
    } else {
        setLightsOnDeck(
            [
                { x: G.PAD.xMin + 0.5, y: G.PAD.yMin + 0.5 },
                { x: G.PAD.xMax + 0.5, y: G.PAD.yMin + 0.5 },
                { x: G.PAD.xMax + 0.5, y: G.PAD.yMax + 0.5 },
                { x: G.PAD.xMin + 0.5, y: G.PAD.yMax + 0.5 },
            ],
            blink,
            cx,
            cy,
            z
        );
    }
}

function setLightsOnDeck(lights: Array<{ x: number; y: number }>, blink: boolean, cx: number, cy: number, z: number) {
    lights.forEach(l => {
        let p = iso(l.x, l.y, z + 0.05, cx, cy, { stepH, tileW, tileH, canvas });
        ctx.fillStyle = blink ? '#f00' : '#500';
        ctx.beginPath();
        ctx.arc(p.x, p.y, blink ? 3 : 2.5, 0, 7);
        ctx.fill();
    });
}

function drawWindsock(cx: number, cy: number) {
    let wx = G.PAD.xMin,
        wy = G.PAD.yMin + 8.8;
    let base = iso(wx, wy, getGround(wx, wy), cx, cy, { stepH, tileW, tileH, canvas });
    let top = iso(wx, wy, getGround(wx, wy) + 1.2, cx, cy, { stepH, tileW, tileH, canvas });
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(top.x, top.y);
    ctx.stroke();
    let windAngle = G.wind.angle ?? Math.PI * 0.75;
    let wIsoX = (Math.cos(windAngle) - Math.sin(windAngle)) * (tileW / 2);
    let wIsoY = (Math.cos(windAngle) + Math.sin(windAngle)) * (tileH / 2);
    let len = Math.hypot(wIsoX, wIsoY);
    wIsoX = (wIsoX / len) * 5;
    wIsoY = (wIsoY / len) * 5;
    // perpendicular for cone width
    let perpX = -wIsoY,
        perpY = wIsoX;
    let phase = Date.now() * 0.005;
    ctx.fillStyle = 'orange';
    ctx.beginPath();
    ctx.moveTo(top.x - perpX * 0.5, top.y - perpY * 0.5);
    ctx.lineTo(top.x + perpX * 0.5, top.y + perpY * 0.5);
    for (let i = 1; i <= 4; i++) {
        let t = i / 4;
        let bend = Math.sin(phase + i * 0.5) * 1.5 * t;
        let px = top.x + wIsoX * i * 1.5 + perpX * (0.5 - t * 0.5) + bend * perpX * 0.2;
        let py = top.y + wIsoY * i * 1.5 + perpY * (0.5 - t * 0.5) + bend * perpY * 0.2;
        ctx.lineTo(px, py);
    }
    for (let i = 3; i >= 1; i--) {
        let t = i / 4;
        let bend = Math.sin(phase + i * 0.5) * 1.5 * t;
        let px = top.x + wIsoX * i * 1.5 - perpX * (0.5 - t * 0.5) + bend * perpX * 0.2;
        let py = top.y + wIsoY * i * 1.5 - perpY * (0.5 - t * 0.5) + bend * perpY * 0.2;
        ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
}

function drawSailboat(sX: number, sY: number, angle: number, cx: number, cy: number) {
    // SAILBOAT_DEF bow faces +x; game convention is bow at -y (angle=0) → offset by -π/2
    SceneRenderer.add(SAILBOAT_DEF, { x: sX, y: sY, z: 0, angle: angle - Math.PI / 2 });
    SceneRenderer.flush(cx, cy);
}

// Beflockung aus Missionsdaten laden
// G.TREES_MAP initialized in G object
const FOLIAGE_DECODE: Record<string, string> = { p: 'pine', o: 'oak', b: 'bush', d: 'dead' };
function decompressFoliage(str: string | { x: number; y: number; s: number; type: string }[]) {
    if (!str) return [];
    if (typeof str !== 'string') return str; // bereits dekomprimiert (Array)
    return str.split('|').map(token => {
        const type = FOLIAGE_DECODE[token[0]] || 'pine';
        const [x, y, s] = token.slice(1).split(',').map(Number);
        return { type, x: x / 10, y: y / 10, s: s / 10 };
    });
}
function initFoliageFromMission() {
    const md = campaignHandler.getCurrentMissionData();
    const foliage = decompressFoliage(md.foliage || []);
    G.TREES_MAP = foliage.map(f => ({
        x: f.x,
        y: f.y,
        s: f.s || 1.0,
        type: f.type || 'pine',
        gz: null,
    }));
    G.TREES_MAP.forEach((t: any) => {
        t.gz = getGround(t.x, t.y, G.points, G.CARRIER);
    });
}

function drawLighthouse(cx: number, cy: number) {
    const _lhObj = getObjectByType('lighthouse');
    if (!_lhObj) return;
    const lhX = _lhObj.x,
        lhY = _lhObj.y;
    SceneRenderer.add(LIGHTHOUSE_DEF, { x: lhX, y: lhY, z: 0 });
    SceneRenderer.flush(cx, cy);
    // Antenna + blinking light (screen-space, drawn after DEF)
    const p = iso(lhX, lhY, 8.1, cx, cy, { stepH, tileW, tileH, canvas });
    ctx.fillStyle = '#333';
    ctx.fillRect(p.x - 2, p.y - 10, 4, 10);
    if (Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,200,0.8)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 25, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function renderRain() {
    if (!_missionRain) return;
    ctx.strokeStyle = 'rgba(150,200,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    let sx = (G.wind.x / tileW) * 4000,
        sy = (G.wind.y / tileH) * 4000;
    for (let i = 0; i < 100; i++) {
        let rx = Math.random() * canvas.width,
            ry = Math.random() * canvas.height;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + sx, ry + 15 + Math.abs(sy));
    }
    ctx.stroke();
    if (Math.random() < 0.005) {
        const el = document.getElementById('flash-overlay')!;
        el.style.opacity = '0.8';
        setTimeout(() => (el.style.opacity = '0'), 100);
    }
}

// ─── collision boxes ─────────────────────────────────────────────────────────
let showCollisionBoxes = false;
window.addEventListener('keydown', e => {
    if (e.key === 'c' || e.key === 'C') {
        showCollisionBoxes = !showCollisionBoxes;
        SceneRenderer.debugAltitude = showCollisionBoxes;
    }
});

// Draw an oriented bounding box in isometric space (debug visual).
// wX/wY: world center, angle: rotation, ox/oy/oz: local extents min/max
function drawCollisionBox(
    wX: number,
    wY: number,
    angle: number,
    oxMin: number,
    oxMax: number,
    oyMin: number,
    oyMax: number,
    ozMin: number,
    ozMax: number,
    color: string
) {
    const camX = zstate.cam.x,
        camY = zstate.cam.y;
    const cosA = Math.cos(angle),
        sinA = Math.sin(angle);
    function wp(lx: number, ly: number, lz: number) {
        return {
            x: wX + lx * cosA - ly * sinA,
            y: wY + lx * sinA + ly * cosA,
            z: lz,
        };
    }
    const corners = [
        wp(oxMin, oyMin, ozMin),
        wp(oxMax, oyMin, ozMin),
        wp(oxMax, oyMax, ozMin),
        wp(oxMin, oyMax, ozMin),
        wp(oxMin, oyMin, ozMax),
        wp(oxMax, oyMin, ozMax),
        wp(oxMax, oyMax, ozMax),
        wp(oxMin, oyMax, ozMax),
    ];
    const sc = corners.map(p => iso(p.x, p.y, p.z, camX, camY, { stepH, tileW, tileH, canvas }));
    const edges = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
    ];
    ctx.save();
    ctx.strokeStyle = color || 'rgba(0,255,100,0.85)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.shadowColor = color || '#00ff66';
    ctx.shadowBlur = 4;
    edges.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(sc[a].x, sc[a].y);
        ctx.lineTo(sc[b].x, sc[b].y);
        ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();
}

// Check if a world point (px, py, pz) is inside an oriented bounding box.
function checkCollisionBox(
    px: number,
    py: number,
    pz: number,
    wX: number,
    wY: number,
    angle: number,
    oxMin: number,
    oxMax: number,
    oyMin: number,
    oyMax: number,
    ozMin: number,
    ozMax: number
) {
    const dx = px - wX,
        dy = py - wY;
    const cosA = Math.cos(-angle),
        sinA = Math.sin(-angle);
    const lx = dx * cosA - dy * sinA;
    const ly = dx * sinA + dy * cosA;
    return lx >= oxMin && lx <= oxMax && ly >= oyMin && ly <= oyMax && pz >= ozMin && pz <= ozMax;
}

// Draw all collision boxes and check G.heli collisions (called from drawScene).
function drawDebugOverlay(camX: number, camY: number) {
    const OPT = { stepH, tileW, tileH, canvas };

    function isoP(wx: number, wy: number, wz = 0) {
        return iso(wx, wy, wz, camX, camY, OPT);
    }

    // ── World grid (every 5 units, labelled every 10) ─────────────
    const hx = G.heli.x,
        hy = G.heli.y;
    const gMin = -30,
        gMax = 30,
        gStep = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    for (let x = Math.floor((hx + gMin) / gStep) * gStep; x <= hx + gMax; x += gStep) {
        const a = isoP(x, hy + gMin),
            b = isoP(x, hy + gMax);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }
    for (let y = Math.floor((hy + gMin) / gStep) * gStep; y <= hy + gMax; y += gStep) {
        const a = isoP(hx + gMin, y),
            b = isoP(hx + gMax, y);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }
    // Grid labels every 10 units
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let x = Math.floor((hx + gMin) / 10) * 10; x <= hx + gMax; x += 10) {
        for (let y = Math.floor((hy + gMin) / 10) * 10; y <= hy + gMax; y += 10) {
            const p = isoP(x, y);
            ctx.fillText(`${x},${y}`, p.x + 2, p.y - 2);
        }
    }

    // ── World axes at heli position ───────────────────────────────
    function drawArrow(fromP: { x: number; y: number }, toP: { x: number; y: number }, color: string, label: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fromP.x, fromP.y);
        ctx.lineTo(toP.x, toP.y);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.fillText(label, toP.x + 3, toP.y - 3);
    }
    const orig = isoP(hx, hy, G.heli.z);
    drawArrow(orig, isoP(hx + 3, hy, G.heli.z), '#f44', '+X');
    drawArrow(orig, isoP(hx, hy + 3, G.heli.z), '#4f4', '+Y');
    drawArrow(orig, { x: orig.x, y: orig.y - 30 }, '#44f', '+Z');

    // ── PAD bounds ────────────────────────────────────────────────
    if (hasPad()) {
        const p = G.PAD;
        const corners = [
            isoP(p.xMin, p.yMin, p.z),
            isoP(p.xMax, p.yMin, p.z),
            isoP(p.xMax, p.yMax, p.z),
            isoP(p.xMin, p.yMax, p.z),
        ];
        ctx.strokeStyle = 'rgba(0,255,200,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        corners.forEach(c => ctx.lineTo(c.x, c.y));
        ctx.closePath();
        ctx.stroke();
        ctx.font = '10px monospace';
        ctx.fillStyle = '#0fc';
        const lbl = isoP(p.xMin, p.yMin, p.z);
        ctx.fillText(`PAD xMin=${p.xMin} xMax=${p.xMax}`, lbl.x, lbl.y - 6);
        ctx.fillText(`yMin=${p.yMin} yMax=${p.yMax} z=${p.z}`, lbl.x, lbl.y + 6);

        // Hangar outline
        const hX = p.xMax - 4,
            hY = p.yMin;
        const hc = [isoP(hX, hY, p.z), isoP(hX + 4, hY, p.z), isoP(hX + 4, hY + 2, p.z), isoP(hX, hY + 2, p.z)];
        ctx.strokeStyle = 'rgba(255,80,0,0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(hc[0].x, hc[0].y);
        hc.forEach(c => ctx.lineTo(c.x, c.y));
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#f50';
        ctx.font = '10px monospace';
        ctx.fillText('HANGAR', hc[0].x, hc[0].y - 5);

        // Fuel truck: position dot, heading arrow, state label
        const ft = G.fuelTruck;
        const ftP = isoP(ft.x, ft.y, p.z + 0.5);
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(ftP.x, ftP.y, 5, 0, Math.PI * 2);
        ctx.fill();
        // Heading arrow: forward = +X in local = cosA, sinA in world
        const ftFwd = isoP(ft.x + Math.cos(ft.angle) * 2.5, ft.y + Math.sin(ft.angle) * 2.5, p.z + 0.5);
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ftP.x, ftP.y);
        ctx.lineTo(ftFwd.x, ftFwd.y);
        ctx.stroke();
        // Rear marker
        const ftBack = isoP(ft.x - Math.cos(ft.angle) * 1.1, ft.y - Math.sin(ft.angle) * 1.1, p.z + 0.5);
        ctx.fillStyle = 'rgba(255,200,0,0.5)';
        ctx.beginPath();
        ctx.arc(ftBack.x, ftBack.y, 3, 0, Math.PI * 2);
        ctx.fill();
        // Target position
        if (ft.targetX != null && ft.targetY != null) {
            const tgt = isoP(ft.targetX, ft.targetY, p.z);
            ctx.strokeStyle = 'rgba(255,255,0,0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(ftP.x, ftP.y);
            ctx.lineTo(tgt.x, tgt.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#ff0';
            ctx.beginPath();
            ctx.arc(tgt.x, tgt.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        // State + angle label
        ctx.fillStyle = '#ff0';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`TRUCK: ${ft.state}`, ftP.x + 7, ftP.y - 8);
        ctx.fillText(`ang=${((ft.angle * 180) / Math.PI).toFixed(0)}°`, ftP.x + 7, ftP.y + 4);
        ctx.fillText(`x=${ft.x.toFixed(1)} y=${ft.y.toFixed(1)}`, ftP.x + 7, ftP.y + 16);
        // Park position marker
        const parkP = isoP(ft.parkX, ft.parkY, p.z);
        ctx.strokeStyle = 'rgba(255,200,0,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(parkP.x, parkP.y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,200,0,0.6)';
        ctx.font = '9px monospace';
        ctx.fillText('PARK', parkP.x - 12, parkP.y + 14);
    }

    // ── Heli position label ───────────────────────────────────────
    const heliP = isoP(hx, hy, G.heli.z);
    ctx.fillStyle = '#f88';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`HELI x=${hx.toFixed(1)} y=${hy.toFixed(1)} z=${G.heli.z.toFixed(2)}`, heliP.x - 40, heliP.y - 50);
    ctx.fillText(`inAir=${G.heli.inAir} RPM=${G.heli.rotorRPM.toFixed(2)}`, heliP.x - 40, heliP.y - 38);
    ctx.fillText(`ang=${((G.heli.angle * 180) / Math.PI).toFixed(0)}°`, heliP.x - 40, heliP.y - 26);
}

function handleCollisionBoxes() {
    // ── Carrier ────────────────────────────────────────────────────────────────
    if (hasCarrier()) {
        const cx = G.CARRIER.x,
            cy = G.CARRIER.y,
            ca = G.CARRIER.angle;
        const deckZ = G.CARRIER.zDeck; // 4.2

        // Flugdeck: rx=Breite(±4.2), ry=Länge(±8.7)
        if (showCollisionBoxes) drawCollisionBox(cx, cy, ca, -4.2, 4.2, -8.7, 8.7, 0, deckZ, 'rgba(0,200,255,0.8)');

        // Tower: ix=2.6(rx), iy=1.0(ry), iw=1.5, il=4.5, ih=2.5
        if (showCollisionBoxes)
            drawCollisionBox(cx, cy, ca, 2.6, 4.1, 1.0, 5.5, deckZ, deckZ + 2.5, 'rgba(255,80,0,0.9)');

        // Tower-Kollision – nur wenn Heli in der Luft ist
        if (!zstate.introActive && !zstate.crashed && G.heli.inAir) {
            if (checkCollisionBox(G.heli.x, G.heli.y, G.heli.z, cx, cy, ca, 2.6, 4.1, 1.0, 5.5, deckZ, deckZ + 2.5)) {
                _physicsCtx.triggerCrash(I18N.CRASH_CARRIER_TOWER);
            }
        }

        // Parked Helis auf dem Deck
        const cosC = Math.cos(ca),
            sinC = Math.sin(ca);
        parkedHelis.forEach(h => {
            const pos = {
                x: cx + h.xRel * cosC - h.yRel * sinC,
                y: cy + h.xRel * sinC + h.yRel * cosC,
            };
            const totalAng = h.angle + ca;
            const _hcb = getHeliType(h.type).collisionBox;
            const hb = { x1: _hcb.xMin, x2: _hcb.xMax, y1: _hcb.yMin, y2: _hcb.yMax, z2: _hcb.zMax };
            if (showCollisionBoxes)
                drawCollisionBox(
                    pos.x,
                    pos.y,
                    totalAng,
                    hb.x1,
                    hb.x2,
                    hb.y1,
                    hb.y2,
                    deckZ + 0.1,
                    deckZ + 0.1 + hb.z2,
                    'rgba(0,255,100,0.8)'
                );
            if (!zstate.introActive && !zstate.crashed && G.heli.inAir) {
                if (
                    checkCollisionBox(
                        G.heli.x,
                        G.heli.y,
                        G.heli.z,
                        pos.x,
                        pos.y,
                        totalAng,
                        hb.x1,
                        hb.x2,
                        hb.y1,
                        hb.y2,
                        deckZ + 0.1,
                        deckZ + 0.1 + hb.z2
                    )
                ) {
                    _physicsCtx.triggerCrash(I18N.CRASH_PARKED_HELI);
                }
            }
        });
    }

    // ── Hangar ────────────────────────────────────────────────────────────────
    if (hasPad()) {
        // Hangar: hX=G.PAD.xMax-4, hY=G.PAD.yMin, Breite=4, Tiefe=2, Höhe=1.8
        const hX = G.PAD.xMax - 4,
            hY = G.PAD.yMin,
            hZ = G.PAD.z;
        // Mittelpunkt + lokale Extents (keine Rotation)
        const hmx = hX + 2,
            hmy = hY + 1;
        if (showCollisionBoxes) drawCollisionBox(hmx, hmy, 0, -2, 2, -1, 1, hZ, hZ + 1.8, 'rgba(255,80,0,0.9)');
        if (!zstate.introActive && !zstate.crashed && G.heli.inAir) {
            if (checkCollisionBox(G.heli.x, G.heli.y, G.heli.z, hmx, hmy, 0, -2, 2, -1, 1, hZ, hZ + 1.8)) {
                _physicsCtx.triggerCrash(I18N.CRASH_HANGAR);
            }
        }
    }

    // ── Fuel Truck ───────────────────────────────────────────────────────────────
    if (hasPad() && G.fuelTruck.state !== 'PARKED') {
        const ft = G.fuelTruck;
        const fZ = G.PAD.z;
        if (showCollisionBoxes)
            drawCollisionBox(ft.x, ft.y, ft.angle, 0, 2.2, -0.45, 0.45, fZ, fZ + 0.9, 'rgba(255,200,0,0.8)');
        if (!zstate.introActive && !zstate.crashed && G.heli.inAir) {
            if (
                checkCollisionBox(G.heli.x, G.heli.y, G.heli.z, ft.x, ft.y, ft.angle, 0, 2.2, -0.45, 0.45, fZ, fZ + 0.9)
            ) {
                _physicsCtx.triggerCrash(I18N.CRASH_FUEL_TRUCK);
            }
        }
    }

    if (hasLighthouse()) {
        const lh = getObjectByType('lighthouse');
        if (lh) {
            // Sockel (radius 4, aber nur die Platte – kein Flughindernis über 0.4)
            if (showCollisionBoxes)
                drawCollisionBox(lh.x, lh.y, 0, -4.0, 4.0, -4.0, 4.0, 0, 0.4, 'rgba(255,220,0,0.6)');
            // Turm (radius 1.0, Höhe 0.4–8)
            if (showCollisionBoxes)
                drawCollisionBox(lh.x, lh.y, 0, -1.0, 1.0, -1.0, 1.0, 0.4, 8.0, 'rgba(255,80,0,0.9)');

            if (!zstate.introActive && !zstate.crashed) {
                if (checkCollisionBox(G.heli.x, G.heli.y, G.heli.z, lh.x, lh.y, 0, -1.0, 1.0, -1.0, 1.0, 0.4, 8.5)) {
                    _physicsCtx.triggerCrash(I18N.CRASH_LIGHTHOUSE);
                }
            }
        }
    }

    // ── Sailboats ──────────────────────────────────────────────────────────────
    G.BOATS.forEach(b => {
        // Rumpf
        if (showCollisionBoxes)
            drawCollisionBox(b.x, b.y, b.angle, -1.1, 1.3, -0.45, 0.45, 0, 0.35, 'rgba(0,255,100,0.8)');
        // Mast
        if (showCollisionBoxes)
            drawCollisionBox(b.x, b.y, b.angle, -0.4, -0.2, -0.1, 0.1, 0.35, 3.2, 'rgba(255,80,0,0.9)');

        if (!zstate.introActive && !zstate.crashed) {
            if (
                checkCollisionBox(G.heli.x, G.heli.y, G.heli.z, b.x, b.y, b.angle, -1.1, 1.3, -0.45, 0.45, 0, 0.35) ||
                checkCollisionBox(G.heli.x, G.heli.y, G.heli.z, b.x, b.y, b.angle, -0.4, -0.2, -0.1, 0.1, 0.35, 3.2)
            ) {
                _physicsCtx.triggerCrash(I18N.CRASH_BOAT);
            }
        }
    });

    // ── Bäume ─────────────────────────────────────────────────────────────────
    // Kollisions-Check + optionaler Debug-Draw in einem einzigen batched Pass
    if (showCollisionBoxes) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,255,100,0.75)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        const camX2 = zstate.cam.x,
            camY2 = zstate.cam.y;
        G.TREES_MAP.forEach((t: any) => {
            if (!isVisible(t.x, t.y)) return;
            const r = 0.35 * t.s;
            const h = 2.3 * t.s;
            const corners = [
                { x: t.x - r, y: t.y - r, z: t.gz },
                { x: t.x + r, y: t.y - r, z: t.gz },
                { x: t.x + r, y: t.y + r, z: t.gz },
                { x: t.x - r, y: t.y + r, z: t.gz },
                { x: t.x - r, y: t.y - r, z: t.gz + h },
                { x: t.x + r, y: t.y - r, z: t.gz + h },
                { x: t.x + r, y: t.y + r, z: t.gz + h },
                { x: t.x - r, y: t.y + r, z: t.gz + h },
            ].map(p => iso(p.x, p.y, p.z, camX2, camY2, { stepH, tileW, tileH, canvas }));
            [
                [0, 1],
                [1, 2],
                [2, 3],
                [3, 0],
                [4, 5],
                [5, 6],
                [6, 7],
                [7, 4],
                [0, 4],
                [1, 5],
                [2, 6],
                [3, 7],
            ].forEach(([a, b]) => {
                ctx.beginPath();
                ctx.moveTo(corners[a].x, corners[a].y);
                ctx.lineTo(corners[b].x, corners[b].y);
                ctx.stroke();
            });
        });
        ctx.setLineDash([]);
        ctx.restore();
    }
    if (!zstate.introActive && !zstate.crashed) {
        G.TREES_MAP.forEach((t: any) => {
            if (!isVisible(t.x, t.y)) return;
            const r = 0.35 * t.s;
            const h = 2.3 * t.s;
            if (checkCollisionBox(G.heli.x, G.heli.y, G.heli.z, t.x, t.y, 0, -r, r, -r, r, t.gz, t.gz + h)) {
                _physicsCtx.triggerCrash(I18N.CRASH_TREE);
            }
        });
    }

    // ── Player Heli box (nur Debug-Visualisierung) ────────────────────────────
    if (showCollisionBoxes) {
        const _phcb = getHeliType(G.heli.type).collisionBox;
        const hb = { x1: _phcb.xMin, x2: _phcb.xMax, y1: _phcb.yMin, y2: _phcb.yMax, z2: _phcb.zMax };
        drawCollisionBox(
            G.heli.x,
            G.heli.y,
            G.heli.angle,
            hb.x1,
            hb.x2,
            hb.y1,
            hb.y2,
            G.heli.z,
            G.heli.z + hb.z2,
            'rgba(255,255,0,0.9)'
        );
    }
}

// ─── main menu ───────────────────────────────────────────────────────────────
function toMainMenu() {
    cancelAnimationFrame(_rafId);
    _rafId = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    zstate.gameStarted = false;
    _partyMode = false;
    ['splash', 'campaign-select', 'heli-select', 'heli-info', 'credits-screen'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    document.getElementById('main-menu')!.style.display = 'flex';
    soundHandler.play(musicConfig.mainMenu || 'maintheme', true);
    animMainMenuBg();
    startMenuParticles();
}

function backFromHeliSelect() {
    document.getElementById('heli-select')!.style.display = 'none';
    toCampaignSelect();
}

buildHeliSelect('normal'); // initial build for splash screen background

let _rafId = 0;

// ─── mission-local cache (set once per launch, never changes mid-mission) ─────
let _missionHasPad = false;
let _missionHasCarrier = false;
let _missionHasLighthouse = false;
let _missionRain = false;
let _missionNight = false;
let _missionWindStr = 1;
let _missionWindDir = 0;
let _missionWindVar = false;
let _lighthouseX = -1;
let _lighthouseY = -1;
let _missionGridSize = 28;

let _partyMode = false;
let _partySeq = '';
let _partyColors: string[] = [];
const _PARTY_PALETTE = ['#ff0044', '#ff6600', '#ffcc00', '#00ff88', '#00ccff', '#cc44ff', '#ff44cc', '#44ffcc'];
const _randomPartyColor = () => _PARTY_PALETTE[Math.floor(Math.random() * _PARTY_PALETTE.length)];
const _refreshPartyColors = () => {
    _partyColors = Array.from({ length: 8 }, _randomPartyColor);
};

const _physicsCtx = {
    get windStr() {
        return _missionWindStr;
    },
    get windDir() {
        return _missionWindDir;
    },
    get windVar() {
        return _missionWindVar;
    },
    get hasPad() {
        return _missionHasPad;
    },
    get hasCarrier() {
        return _missionHasCarrier;
    },
    get partyMode() {
        return _partyMode;
    },
    partyPalette: _PARTY_PALETTE as readonly string[],
    showMsg,
    get missionComplete() {
        return mpState.active ? _mpMissionComplete : missionComplete;
    },
    get triggerCrash() {
        return mpState.active ? _mpTriggerCrash : triggerCrash;
    },
};

let _tileColors: string[][] = []; // precomputed day/rain colors, indexed [x][y]
// Reusable batch map — cleared each render, no per-frame Map allocation
const _terrainBatch = new Map<string, number[]>();

const _precomputeDayColors = (rain: boolean) => {
    const { gridSize } = campaignHandler.getTerrain();
    _tileColors = [];
    for (let x = 0; x < gridSize; x++) {
        _tileColors[x] = [];
        for (let y = 0; y < gridSize; y++) {
            const h0 = G.points[x]?.[y] ?? 0;
            const isPad = hasPad() && x >= G.PAD.xMin && x <= G.PAD.xMax && y >= G.PAD.yMin && y <= G.PAD.yMax;
            const c = 35 + Math.floor(h0 * 15);
            _tileColors[x][y] = isPad
                ? '#444'
                : h0 > 0
                  ? `rgb(${c - 10},${c + 30},${c - 10})`
                  : rain
                    ? '#002244'
                    : '#003d7a';
        }
    }
};

// Renders terrain via path-batching to any 2D context.
// Uses inline iso math to avoid per-tile object allocations.
const _renderTerrainBatched = (
    tCtx: CanvasRenderingContext2D,
    tW: number,
    tH: number,
    ccX: number,
    ccY: number,
    xFrom: number,
    xTo: number,
    yFrom: number,
    yTo: number,
    getFill: (x: number, y: number, h0: number) => string
) => {
    const { gridSize } = campaignHandler.getTerrain();
    _terrainBatch.clear();
    const hw = tW / 2,
        hh = tH / 2;
    const htW = tileW / 2,
        htH = tileH / 2;

    for (let x = Math.max(0, xFrom); x < Math.min(gridSize - 1, xTo); x++) {
        for (let y = Math.max(0, yFrom); y < Math.min(gridSize - 1, yTo); y++) {
            const h0 = G.points[x][y],
                h1 = G.points[x + 1][y];
            const h2 = G.points[x + 1][y + 1],
                h3 = G.points[x][y + 1];
            const fill = getFill(x, y, h0);
            // Inline iso — no object allocation
            const p0x = hw + (x - y) * htW - ccX;
            const p0y = hh + (x + y) * htH - h0 * stepH - ccY;
            const p1x = hw + (x + 1 - y) * htW - ccX;
            const p1y = hh + (x + 1 + y) * htH - h1 * stepH - ccY;
            const p2x = hw + (x + 1 - (y + 1)) * htW - ccX;
            const p2y = hh + (x + 1 + (y + 1)) * htH - h2 * stepH - ccY;
            const p3x = hw + (x - (y + 1)) * htW - ccX;
            const p3y = hh + (x + (y + 1)) * htH - h3 * stepH - ccY;

            let batch = _terrainBatch.get(fill);
            if (!batch) {
                batch = [];
                _terrainBatch.set(fill, batch);
            }
            batch.push(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y);
        }
    }

    for (const [fill, coords] of _terrainBatch) {
        tCtx.fillStyle = fill;
        tCtx.beginPath();
        for (let i = 0; i < coords.length; i += 8) {
            tCtx.moveTo(coords[i], coords[i + 1]);
            tCtx.lineTo(coords[i + 2], coords[i + 3]);
            tCtx.lineTo(coords[i + 4], coords[i + 5]);
            tCtx.lineTo(coords[i + 6], coords[i + 7]);
            tCtx.closePath();
        }
        tCtx.fill();
    }
};

// Renders terrain with offscreen cache for day/rain mode, or batched for night/party.
const _drawTerrain = (camX: number, camY: number, _rx: number, _ry: number, isNight: boolean, _rain: boolean) => {
    const xFrom = Math.floor(_rx - 14);
    const xTo = Math.ceil(_rx + 14);
    const yFrom = Math.floor(_ry - 14);
    const yTo = Math.ceil(_ry + 14);

    if (isNight) {
        // Night: spotlight cone is dynamic → path-batch on main canvas every frame
        const alt = G.heli.z - getGround(G.heli.x, G.heli.y, G.points, G.CARRIER);
        const coneWidth = 0.3 + alt * 0.05;
        const range = 10 + alt * 2.0;
        const range2 = range * range;
        const intensity = Math.floor(255 * Math.max(0.1, 1.0 - alt / 15));
        const haX = G.heli.x,
            haY = G.heli.y,
            haA = G.heli.angle;
        _renderTerrainBatched(ctx, canvas.width, canvas.height, camX, camY, xFrom, xTo, yFrom, yTo, (x, y, h0) => {
            const isPad = hasPad() && x >= G.PAD.xMin && x <= G.PAD.xMax && y >= G.PAD.yMin && y <= G.PAD.yMax;
            let diff = Math.atan2(y - haY, x - haX) - haA;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            const dx = x - haX,
                dy = y - haY;
            const inLight = Math.abs(diff) < coneWidth && dx * dx + dy * dy < range2;
            if (!inLight) return '#020205';
            if (isPad) return `rgb(${intensity - 30},${intensity - 30},${intensity - 30})`;
            return h0 > 0
                ? `rgb(${intensity - 20},${intensity + 10},${intensity - 20})`
                : `rgb(0,${Math.floor(intensity * 0.3)},${Math.floor(intensity * 0.6)})`;
        });
        return;
    }

    if (_partyMode) {
        // Party: tile colors change ~3.5×/sec → path-batch on main canvas
        _renderTerrainBatched(ctx, canvas.width, canvas.height, camX, camY, xFrom, xTo, yFrom, yTo, (x, y, _h0) => {
            const isPad = hasPad() && x >= G.PAD.xMin && x <= G.PAD.xMax && y >= G.PAD.yMin && y <= G.PAD.yMax;
            if (isPad) return '#444';
            const tileOffset = Math.abs(x * 173 + y * 251) % 800;
            const phase = Math.floor((Date.now() + tileOffset * 320) / 280);
            return _PARTY_PALETTE[phase % _PARTY_PALETTE.length];
        });
        return;
    }

    // Day / rain mode — direct batched render every frame
    _renderTerrainBatched(ctx, canvas.width, canvas.height, camX, camY, xFrom, xTo, yFrom, yTo,
        (x, y, _h0) => _tileColors[x]?.[y] ?? '#003d7a');
};

// ─── session ──────────────────────────────────────────────────────────────────
let _session: PlayerSession = loadSession();
let _selectedCampaignIndex = 0;
let _unlockSeq = '';

const approveCookies = () => {
    _session.cookieConsent = true;
    _session.consentTimestamp = Date.now();
    _session.consentVersion = CONSENT_VERSION;
    saveSession(_session);
    (document.getElementById('cookie-banner') as HTMLElement).style.display = 'none';
    notifyConsent();
};

const declineCookies = () => {
    _session.cookieConsent = false;
    _session.consentTimestamp = Date.now();
    _session.consentVersion = CONSENT_VERSION;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {}
    (document.getElementById('cookie-banner') as HTMLElement).style.display = 'none';
    notifyConsent();
};

const _buildCampaignGrid = (): string[] => {
    const campaigns: string[] = [];
    campaignHandler.getCampaigns().forEach(({ campaignTitle, campaignSublines, levels, type }, index) => {
        if (type === 'glider' || type === 'multiplayer') return;
        const locked = type !== 'tutorial' && !isCampaignUnlocked(_session, index);
        let sublines = '';
        campaignSublines.forEach(s => {
            sublines += `<div class="box-sub">${s}</div>`;
        });
        sublines += `<div class="box-sub">Missionen: ${levels.length}</div>`;
        const isTutorial = type === 'tutorial';
        campaigns.push(
            `<div class="grid-box${locked ? ' locked' : ''}" onclick="${locked ? '' : `selectCampaign('${index}')`}"` +
                `${isTutorial ? ` style="border-color: #ff9900"` : ''}>` +
                `<div class="box-label"${isTutorial ? ` style="color: #ff9900"` : ''}>${campaignTitle}</div>` +
                (locked ? `<div class="box-sub" style="color:#333">${I18N.CAMPAIGN_LOCKED}</div>` : sublines) +
                `</div>`
        );
    });
    return campaigns;
};

window.onkeydown = e => {
    G.keys[e.code] = true;
    if ((document.activeElement as HTMLElement)?.tagName === 'INPUT') return;
    // UNLOCK easter egg — works everywhere
    _unlockSeq = (_unlockSeq + e.key.toUpperCase()).slice(-6);
    if (_unlockSeq === 'UNLOCK') {
        _session.allUnlocked = true;
        saveSession(_session);
        _unlockSeq = '';
        showMsg(I18N.UNLOCK_ALL);
    }
    if (zstate.gameStarted && !zstate.introActive) {
        _partySeq = (_partySeq + e.key.toUpperCase()).slice(-5);
        if (_partySeq === 'PARTY') {
            _partyMode = !_partyMode;
            _partySeq = '';
            if (_partyMode) {
                _refreshPartyColors();
                showMsg(I18N.PARTY_ON);
                soundHandler.play('partytime', true);
            } else {
                soundHandler.play(musicConfig.mainMenu || 'maintheme', true);
            }
        }
    }
};
window.onkeyup = e => (G.keys[e.code] = false);
document.addEventListener('selectstart', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());
// On mobile: render at a larger logical size → canvas is CSS-scaled down → tiles appear smaller → more world visible
const MOBILE_ZOOM_OUT = 0.65;

const _resizeCanvas = () => {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isMobile) {
        canvas.width = Math.round(window.innerWidth / MOBILE_ZOOM_OUT);
        canvas.height = Math.round(window.innerHeight / MOBILE_ZOOM_OUT);
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
    } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.width = '';
        canvas.style.height = '';
    }
};
window.onresize = _resizeCanvas;
_resizeCanvas();

const _isTouchDevice = () =>
    ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
    window.matchMedia('(pointer: coarse)').matches;
const setTouchVisible = (v: boolean) => {
    if (!_isTouchDevice()) return;
    const touchEl = document.getElementById('touch-controls');
    const debugEl = document.getElementById('debug-toggle');
    if (touchEl) touchEl.style.display = v ? 'flex' : 'none';
    if (debugEl) debugEl.style.display = v ? 'block' : 'none';
};

const CTRL_MODE_KEY = 'zeewolf-ctrl-mode';
const getControlMode = (): 'heading' | 'screen' =>
    localStorage.getItem(CTRL_MODE_KEY) === 'screen' ? 'screen' : 'heading';
const setControlMode = (m: 'heading' | 'screen') => localStorage.setItem(CTRL_MODE_KEY, m);

const _setupJoystick = (id: string, up: string, down: string, left: string, right: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const knob = el.querySelector('.joystick-knob') as HTMLElement;
    const keys = [up, down, left, right];
    let active = false,
        cx = 0,
        cy = 0,
        jr = 0;
    const setKeys = (dx: number, dy: number) => {
        const dead = jr * 0.18;
        (G.keys as Record<string, boolean>)[up] = dy < -dead;
        (G.keys as Record<string, boolean>)[down] = dy > dead;
        (G.keys as Record<string, boolean>)[left] = dx < -dead;
        (G.keys as Record<string, boolean>)[right] = dx > dead;
    };
    el.addEventListener('pointerdown', e => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        const r = el.getBoundingClientRect();
        cx = r.left + r.width / 2;
        cy = r.top + r.height / 2;
        jr = r.width / 2;
        active = true;
        knob.style.transition = 'none';
    });
    el.addEventListener('pointermove', e => {
        if (!active) return;
        const dx = e.clientX - cx,
            dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const clamped = Math.min(dist, jr * 0.55) / dist;
        knob.style.transform = `translate(calc(-50% + ${dx * clamped}px), calc(-50% + ${dy * clamped}px))`;
        setKeys(dx, dy);
    });
    const release = () => {
        if (!active) return;
        active = false;
        knob.style.transition = 'transform 0.12s ease-out';
        knob.style.transform = 'translate(-50%, -50%)';
        keys.forEach(k => {
            (G.keys as Record<string, boolean>)[k] = false;
        });
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
};

const _setupHeadingJoystick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const knob = el.querySelector('.joystick-knob') as HTMLElement;
    let active = false,
        cx = 0,
        cy = 0,
        jr = 0;
    let _stickDx = 0,
        _stickDy = 0;

    el.addEventListener('pointerdown', e => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        const r = el.getBoundingClientRect();
        cx = r.left + r.width / 2;
        cy = r.top + r.height / 2;
        jr = r.width / 2;
        active = true;
        knob.style.transition = 'none';
    });
    el.addEventListener('pointermove', e => {
        if (!active) return;
        const dx = e.clientX - cx,
            dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const clamped = Math.min(dist, jr * 0.55) / dist;
        knob.style.transform = `translate(calc(-50% + ${dx * clamped}px), calc(-50% + ${dy * clamped}px))`;
        _stickDx = dx;
        _stickDy = dy;
    });
    const release = () => {
        if (!active) return;
        active = false;
        _stickDx = 0;
        _stickDy = 0;
        knob.style.transition = 'transform 0.12s ease-out';
        knob.style.transform = 'translate(-50%, -50%)';
        (G.keys as Record<string, boolean>)['ArrowUp'] = false;
        (G.keys as Record<string, boolean>)['ArrowDown'] = false;
        (G.keys as Record<string, boolean>)['ArrowLeft'] = false;
        (G.keys as Record<string, boolean>)['ArrowRight'] = false;
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);

    // Run each frame — reads current heli angle and maps stick to heading keys
    const tick = () => {
        if (active && zstate.gameStarted && Math.hypot(_stickDx, _stickDy) > jr * 0.18) {
            const targetAngle = Math.atan2(_stickDy, _stickDx);
            let diff = targetAngle - G.heli.angle;
            // Normalise to [-π, π]
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;

            const turnDead = 0.15;
            (G.keys as Record<string, boolean>)['ArrowLeft'] = diff < -turnDead;
            (G.keys as Record<string, boolean>)['ArrowRight'] = diff > turnDead;

            // Dot product of stick direction vs current heli forward
            const stickLen = Math.hypot(_stickDx, _stickDy);
            const normSx = _stickDx / stickLen,
                normSy = _stickDy / stickLen;
            const fwdX = Math.cos(G.heli.angle),
                fwdY = Math.sin(G.heli.angle);
            const dot = normSx * fwdX + normSy * fwdY;
            const accelDead = 0.3;
            (G.keys as Record<string, boolean>)['ArrowUp'] = dot > accelDead;
            (G.keys as Record<string, boolean>)['ArrowDown'] = dot < -accelDead;
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
};

const setupTouchControls = () => {
    if (!_isTouchDevice()) return;
    document.getElementById('debug-toggle')?.addEventListener('click', () => {
        showCollisionBoxes = !showCollisionBoxes;
        SceneRenderer.debugAltitude = showCollisionBoxes;
    });
    // winch buttons (Q/E)
    document.querySelectorAll<HTMLElement>('.touch-btn').forEach(btn => {
        const key = btn.dataset.key;
        if (!key) return;
        btn.addEventListener('pointerdown', e => {
            e.preventDefault();
            btn.setPointerCapture(e.pointerId);
            (G.keys as Record<string, boolean>)[key] = true;
            btn.classList.add('active');
        });
        const release = () => {
            (G.keys as Record<string, boolean>)[key] = false;
            btn.classList.remove('active');
        };
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointercancel', release);
    });
    // joysticks
    _setupJoystick('joystick-left', 'KeyW', 'KeyS', 'KeyA', 'KeyD');
    if (getControlMode() === 'screen') {
        _setupJoystick('joystick-right', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight');
    } else {
        _setupHeadingJoystick('joystick-right');
    }
};

const mountGameScreens = () => {
    document.getElementById('campaign-select')!.innerHTML = `
        <div class="title">${I18N.CAMPAIGN_SELECT_TITLE}</div>
        <div class="subtitle">${I18N.CAMPAIGN_SELECT_SUB}</div>
        <div class="campaign-grid" id="campaign-grid"></div>
        <div class="back-btn" id="campaign-select-back">${I18N.BACK}</div>`;
    document.getElementById('campaign-select-back')!.addEventListener('click', toMainMenu);

    document.getElementById('heli-select')!.innerHTML = `
        <div class="title">${I18N.HELI_SELECT_TITLE}</div>
        <div class="subtitle">${I18N.HELI_SELECT_SUB}</div>
        <div id="heli-options" class="grid-container" style="grid-template-columns: 1fr 1fr 1fr; width: 900px"></div>
        <div class="back-btn" id="heli-select-back">${I18N.BACK}</div>`;
    document.getElementById('heli-select-back')!.addEventListener('click', backFromHeliSelect);

    document.getElementById('crash-screen')!.innerHTML = `
        <div class="title" style="color: #fff">${I18N.TERMINATED}</div>
        <p id="crash-reason" style="color: #f00; font-size: 24px; font-weight: bold"></p>
        <p class="start-hint">${I18N.RETRY}</p>`;

    document.getElementById('mission-success-screen')!.innerHTML = `
        <div class="title" style="color: #fff">${I18N.MISSION_COMPLETE}</div>
        <p style="color: rgb(50, 74, 50); font-size: 24px">${I18N.OBJECTIVES_CLEARED}</p>
        <p class="start-hint">${I18N.RETURN_TO_BASE}</p>`;

    document.getElementById('win-screen')!.innerHTML = `
        <div class="title" style="color: #fff">${I18N.CAMPAIGN_COMPLETE}</div>
        <p style="color: #5f5; font-size: 24px">${I18N.ALL_MISSIONS_CLEARED}</p>
        <p class="start-hint">${I18N.RETURN_TO_BASE}</p>`;

    document.getElementById('campaign-complete-screen')!.innerHTML = `
        <div class="title" style="color: #ff6600">${I18N.CAMPAIGN_COMPLETE}</div>
        <div id="campaign-complete-name" style="color: #5f5; font-size: 24px; margin: 10px 0"></div>
        <p style="color: #aaa; font-size: 16px; letter-spacing: 2px">${I18N.ALL_MISSIONS_CLEARED}</p>
        <p class="start-hint">${I18N.RETURN_TO_BASE}</p>`;
    document.getElementById('campaign-complete-screen')!.addEventListener('click', returnToBase);

    document.getElementById('campaign-failed-screen')!.innerHTML = `
        <div class="title" style="color: #fff">${I18N.CAMPAIGN_FAILED}</div>
        <p id="campaign-failed-reason" style="color: #f00; font-size: 24px; font-weight: bold"></p>
        <p style="color: #aaa; font-size: 16px; letter-spacing: 2px">${I18N.MISSION_ABORTED}</p>
        <p class="start-hint">${I18N.RETURN_TO_BASE}</p>`;
    document.getElementById('campaign-failed-screen')!.addEventListener('click', returnToBase);
};

declare const __APP_VERSION__: string;

window.onload = () => {
    assertDom();
    mountMainMenu({
        onSplashClick: toMainMenu,
        onStart: toCampaignSelect,
        onMultiplayer: toMpLobby,
        onHeli: toHeliInfo,
        onSettings: toSettings,
        onCredits: toCredits,
    });
    mountMpLobby();
    (document.getElementById('splash-version') as HTMLElement).textContent = `v${__APP_VERSION__}`;
    zinit();
    mountBriefing();
    initBriefing(dismissBriefing);
    mountSettingsRankup();
    initSettings({
        getSession: () => _session,
        saveSession,
        getControlMode,
        setControlMode,
        isTouchDevice: _isTouchDevice,
    });
    mountWhatsNew();
    mountGameScreens();
    setupTouchControls();
    startMenuParticles();

    const _showSplash = () => {
        (document.getElementById('splash') as HTMLElement).style.display = 'flex';
    };

    const _afterConsent = () => {
        const shown = showWhatsNewIfNeeded(_session.lastSeenVersion, () => {
            _session.lastSeenVersion = I18N.WHATS_NEW_VERSION;
            saveSession(_session);
            _showSplash();
        });
        if (!shown) {
            _session.lastSeenVersion = I18N.WHATS_NEW_VERSION;
            saveSession(_session);
            _showSplash();
        }
    };

    // Show cookie banner if consent not yet given, expired, or privacy notice was updated
    if (_session.cookieConsent === null || isConsentExpired(_session) || isConsentOutdated(_session)) {
        _session.cookieConsent = null;
        _session.consentTimestamp = null;
        _session.consentVersion = '';
        mountCookieBanner(_afterConsent);
        (document.getElementById('cookie-banner') as HTMLElement).style.display = 'flex';
    } else {
        _afterConsent();
    }

    document.addEventListener('pointerdown', () => soundHandler.play(musicConfig.mainMenu || 'maintheme', true), {
        once: true,
    });
    drawMenuHeli();
};

window.launchEasterEgg = launchEasterEgg;
window.toCampaignSelect = toCampaignSelect;
window.toMainMenu = toMainMenu;
window.toHeliInfo = toHeliInfo;
window.toCredits = toCredits;
window.backFromHeliSelect = backFromHeliSelect;
window.returnToBase = returnToBase;
window.selectCampaign = selectCampaign;
window.startGame = startGame;
window.setHover = setHover;
window.toSettings = toSettings;
window.approveCookies = approveCookies;
window.declineCookies = declineCookies;

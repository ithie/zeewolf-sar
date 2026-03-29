import { iso } from './render';
import { campaignHandler, soundHandler, zinit, musicConfig } from './main';
import { zstate } from './state';

import HANGAR_DEF from './models/hangar.zdef';
import LIGHTHOUSE_DEF from './models/lighthouse.zdef';
import SAILBOAT_DEF from './models/sailboat.zdef';
import CARRIER_HULL_DEF from './models/carrier_hull.zdef';
import CARRIER_TOWER_DEF from './models/carrier_tower.zdef';
import { createSceneRenderer } from './scene-renderer';
import { HELI_TYPES, getHeliType } from './heli-types';
import { createDrawObjects } from './draw-objects';
import { tileW, tileH, stepH } from './render-config';
import { toCredits } from './ui/credits-screen';
import { startMenuParticles, stopMenuParticles } from './ui/menu-particles';
import { initHeliInfoScreen, toHeliInfo } from './ui/heli-info-screen';
import { initHeliSelect, buildHeliSelect, animateHeliPreviews, drawMenuHeli, animMainMenuBg } from './ui/heli-select';
import { I18N } from './i18n';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
const isoFn = (wx: number, wy: number, wz: number, cx: number, cy: number) => iso(wx, wy, wz, cx, cy, { canvas, tileW, tileH, stepH });
const SceneRenderer = createSceneRenderer(ctx, isoFn);
const { drawTree, drawPerson, drawTractor, drawFuelTruck, drawHeli } =
    createDrawObjects(ctx, isoFn, tileW, tileH, SceneRenderer);

// ─── state ───────────────────────────────────────────────────────────────────
// G = single mutable game state object; all functions receive what they need
// explicitly as parameters — no implicit global access.
const G = {
    goalCount: 0,
    totalRescued: 0,
    objectives: [] as any[],
    menuHover: Object.fromEntries(HELI_TYPES.map(h => [h.id, false])),
    menuAngles: Object.fromEntries(HELI_TYPES.map(h => [h.id, -0.5])),
    points: [] as any[],
    particles: [] as any[],
    debris: [] as any[],
    CARRIER: {} as any,
    BOATS: [] as any[],
    seaTime: 0,
    payloads: [] as any[],
    activePayload: null as any,
    rescuerSwing: { x: 0, y: 0, vx: 0, vy: 0 },
    parkedHelis: [
        { type: 'jayhawk', xRel: -2.5, yRel: -7.0, angle: Math.PI * 0.19 },
        { type: 'jayhawk', xRel: -2.7, yRel: -1.5, angle: Math.PI * 0.15 },
        { type: 'dolphin', xRel: 2.5, yRel: -7.0, angle: Math.PI * 0.55 },
    ],
    heli: {
        type: 'dolphin',
        x: 0,
        y: 0,
        z: 0.5,
        vx: 0,
        vy: 0,
        vz: 0,
        angle: 0,
        tilt: 0,
        roll: 0,
        winch: 0,
        fuel: 100,
        engineOn: false,
        rotorRPM: 0,
        rotationPos: 0,
        onboard: 0,
        maxLoad: 5,
        accel: 0.0025,
        friction: 0.99,
        tiltSpeed: 0.02,
        fuelRate: 0.012,
        liftPower: 0.003,
        inAir: false,
        cargoResist: 1.0,
    },
    wind: { x: 0, y: 0, phase: 0, angle: Math.random() * Math.PI * 2, varOffset: 0 } as any,
    keys: {} as Record<string, boolean>,
    flocks: [] as any[],
    TREES_MAP: null as any,
    PAD: null as any,
    START_POS: null as any,
    fuelTruck: { state: 'PARKED', x: 0, y: 0, angle: 0, arm: 0, parkX: 0, parkY: 0, parkAngle: 0, t: 0, wps: null, wpI: 0 },
};

// parkedHelis is constant shape — destructure once for readability
const { parkedHelis } = G;

initHeliInfoScreen(G, drawHeli);
initHeliSelect(G, drawHeli);

// ─── helper flags ────────────────────────────────────────────────────────────
// ─── object helpers ──────────────────────────────────────────────────────────
function getObjects() {
    return campaignHandler.getCurrentMissionData().objects || [];
}
function getObjectByType(type) {
    return getObjects().find(o => o.type === type) || null;
}
function getObjectsByType(type) {
    return getObjects().filter(o => o.type === type);
}
function hasCarrier() {
    return !!getObjectByType('carrier');
}
function hasLighthouse() {
    return !!getObjectByType('lighthouse');
}
function hasPad() {
    return !!getObjectByType('pad');
}
function isStartsOnCarrier() {
    return campaignHandler.getCurrentMissionData().spawnObject === 'carrier';
}

// ─── grid / terrain ──────────────────────────────────────────────────────────
function initGrid(size, points) {
    for (let x = 0; x <= size; x++) {
        points[x] = [];
        for (let y = 0; y <= size; y++) points[x][y] = 0;
    }
}

function generateTerrain(points, PAD) {
    const { terrain, gridSize } = campaignHandler.getTerrain();
    for (let x = 0; x <= gridSize; x++) {
        for (let y = 0; y <= gridSize; y++) {
            if (PAD && x >= PAD.xMin && x <= PAD.xMax + 1 && y >= PAD.yMin && y <= PAD.yMax + 1)
                points[x][y] = PAD.z;
            else points[x][y] = terrain[x][y];
        }
    }
}

function getGround(fx, fy, points = G.points, CARRIER = G.CARRIER) {
    if (CARRIER && CARRIER.x !== undefined) {
        let local = getCarrierLocal(fx, fy, CARRIER);
        if (
            local.x >= -CARRIER.w &&
            local.x <= CARRIER.w &&
            local.y >= -CARRIER.l &&
            local.y <= CARRIER.l
        ) {
            if (local.x > 1.2 && local.y > 1.5 && local.y < 5.0) return CARRIER.zDeck + 1.2;
            return CARRIER.zDeck;
        }
    }
    const { gridSize } = campaignHandler.getTerrain();
    let x1 = Math.floor(fx),
        y1 = Math.floor(fy);
    if (x1 < 0 || y1 < 0 || x1 >= gridSize - 1 || y1 >= gridSize - 1) return -1.0;
    if (!points[x1] || !points[x1 + 1]) return -1.0;
    let tX = fx - x1,
        tY = fy - y1;
    if (x1 + 1 < gridSize && y1 + 1 < gridSize) {
        return (
            points[x1][y1] * (1 - tX) * (1 - tY) +
            points[x1 + 1][y1] * tX * (1 - tY) +
            points[x1 + 1][y1 + 1] * tX * tY +
            points[x1][y1 + 1] * (1 - tX) * tY
        );
    }
    return 0;
}

// ─── carrier ────────────────────────────────────────────────────────────────
function getCarrierLocal(globX, globY, CARRIER = G.CARRIER) {
    let dx = globX - CARRIER.x,
        dy = globY - CARRIER.y;
    let ang = -CARRIER.angle;
    return {
        x: dx * Math.cos(ang) - dy * Math.sin(ang),
        y: dx * Math.sin(ang) + dy * Math.cos(ang),
    };
}

function updateCarrierPos(CARRIER: any, seaTimeRef: any, forceUpdate = false, dt = 1) {
    if (!CARRIER || CARRIER.x === undefined) return;

    if (CARRIER.path === 'straight') {
        if (!forceUpdate) {
            CARRIER.lineProgress += CARRIER.speed * dt;
            const nx = CARRIER.lineStartX + CARRIER.lineDirX * CARRIER.lineProgress;
            const ny = CARRIER.lineStartY + CARRIER.lineDirY * CARRIER.lineProgress;
            const dx = nx - CARRIER.x,
                dy = ny - CARRIER.y;
            if (Math.abs(dx) > 0.00001 || Math.abs(dy) > 0.00001) CARRIER.angle = Math.atan2(dx, -dy);
            CARRIER.x = nx;
            CARRIER.y = ny;
        }
    } else {
        if (!forceUpdate) seaTimeRef.t += CARRIER.speed * dt;
        const nx = CARRIER.centerX + Math.cos(seaTimeRef.t) * CARRIER.radiusX;
        const ny = CARRIER.centerY + Math.sin(seaTimeRef.t) * CARRIER.radiusY;
        if (forceUpdate) {
            CARRIER.angle = Math.atan2(
                -CARRIER.radiusX * Math.sin(seaTimeRef.t),
                -CARRIER.radiusY * Math.cos(seaTimeRef.t)
            );
        } else {
            const dx = nx - CARRIER.x,
                dy = ny - CARRIER.y;
            if (Math.abs(dx) > 0.00001 || Math.abs(dy) > 0.00001) CARRIER.angle = Math.atan2(dx, -dy);
        }
        CARRIER.x = nx;
        CARRIER.y = ny;
    }
}

function initVessel(obj, vessel, seaTimeRef) {
    const angleRad = (obj.angle ?? 0) * (Math.PI / 180);
    vessel.w = obj.type === 'carrier' ? 3.5 : 1.5;
    vessel.l = obj.type === 'carrier' ? 8.0 : 3.0;
    vessel.zDeck = obj.type === 'carrier' ? 4.2 : 0.35;
    vessel.zHull = obj.type === 'carrier' ? 3.8 : 0.15;
    vessel.path = obj.path ?? 'static';
    // Einheitliche Skalierung: beide ~gleich schnell bei gleichem speed-Wert
    // circle: rad/frame * radius ≈ grid/frame; straight: grid/frame direkt
    // 1 Einheit = 5.16m, 60fps → 1 Knoten = 0.001663 E/frame
    // circle: speed in rad/frame → v = speed * radius → Faktor = 0.001663 / radius
    // Da radius variiert, speichern wir E/frame und teilen später durch radius
    // straight: direkt E/frame
    const knotsToUnits = 0.001663;
    if (obj.path === 'straight') {
        vessel.speed = (obj.speed ?? 0) * knotsToUnits;
    } else {
        // circle: rad/frame = (knots * knotsToUnits) / radius
        const r = obj.radius ?? 45;
        vessel.speed = ((obj.speed ?? 0) * knotsToUnits) / r;
    }
    if (obj.path === 'circle') {
        const r = obj.radius ?? 45;
        vessel.radiusX = r;
        vessel.radiusY = r * 0.8;
        const t0 =
            Math.atan2(-Math.sin(angleRad) / vessel.radiusX, -Math.cos(angleRad) / vessel.radiusY) +
            Math.PI / 2;
        vessel.centerX = obj.x - Math.cos(t0) * vessel.radiusX;
        vessel.centerY = obj.y - Math.sin(t0) * vessel.radiusY;
        seaTimeRef.t = t0;
        vessel.x = vessel.centerX + Math.cos(t0) * vessel.radiusX;
        vessel.y = vessel.centerY + Math.sin(t0) * vessel.radiusY;
        vessel.angle = Math.atan2(-vessel.radiusX * Math.sin(t0), -vessel.radiusY * Math.cos(t0));
    } else if (obj.path === 'straight') {
        vessel.x = obj.x;
        vessel.y = obj.y;
        vessel.angle = Math.atan2(Math.cos(angleRad), -Math.sin(angleRad));
        vessel.lineStartX = obj.x;
        vessel.lineStartY = obj.y;
        vessel.lineDirX = Math.cos(angleRad);
        vessel.lineDirY = Math.sin(angleRad);
        vessel.lineProgress = 0;
        console.log(
            'initVessel straight:',
            obj.type,
            'angle:',
            obj.angle,
            'angleRad:',
            angleRad,
            'lineDirX:',
            vessel.lineDirX,
            'lineDirY:',
            vessel.lineDirY
        );
    } else {
        vessel.x = obj.x;
        vessel.y = obj.y;
        vessel.angle = Math.atan2(Math.cos(angleRad), -Math.sin(angleRad));
    }
}

function initCarrierFromMission(G) {
    const carrierObj = getObjectByType('carrier');
    if (!carrierObj) return;
    const seaTimeRef = {
        get t() {
            return G.seaTime;
        },
        set t(v) {
            G.seaTime = v;
        },
    };
    initVessel(carrierObj, G.CARRIER, seaTimeRef);
    updateCarrierPos(G.CARRIER, seaTimeRef, true);
}

function initBoatsFromMission(G) {
    const allObjects = getObjects();
    G.BOATS = getObjectsByType('boat').map(obj => {
        const objIdx = allObjects.indexOf(obj);
        const b = {
            x: obj.x,
            y: obj.y,
            angle: 0,
            path: 'static',
            speed: 0,
            w: 1.5,
            l: 3.0,
            zDeck: 0.35,
            zHull: 0.15,
            radiusX: 0,
            radiusY: 0,
            centerX: 0,
            centerY: 0,
            lineStartX: 0,
            lineStartY: 0,
            lineDirX: 0,
            lineDirY: 0,
            lineProgress: 0,
            _seaTime: 0,
            _objIdx: objIdx,
        };
        const st = {
            get t() {
                return b._seaTime;
            },
            set t(v) {
                b._seaTime = v;
            },
        };
        initVessel(obj, b, st);
        return b;
    });
}

function updateBoats(BOATS: any[], dt: number) {
    BOATS.forEach(b => {
        if (b.path === 'straight') {
            b.lineProgress += b.speed * dt;
            const nx = b.lineStartX + b.lineDirX * b.lineProgress;
            const ny = b.lineStartY + b.lineDirY * b.lineProgress;
            const dx = nx - b.x,
                dy = ny - b.y;
            if (Math.abs(dx) > 0.00001 || Math.abs(dy) > 0.00001) b.angle = Math.atan2(dx, -dy);
            b.x = nx;
            b.y = ny;
        } else if (b.path === 'circle') {
            b._seaTime += b.speed * dt;
            const nx = b.centerX + Math.cos(b._seaTime) * b.radiusX;
            const ny = b.centerY + Math.sin(b._seaTime) * b.radiusY;
            const dx = nx - b.x,
                dy = ny - b.y;
            if (Math.abs(dx) > 0.00001 || Math.abs(dy) > 0.00001) b.angle = Math.atan2(dx, -dy);
            b.x = nx;
            b.y = ny;
        }
    });
}

// ─── G.payloads ────────────────────────────────────────────────────────────────
function initPayloadsFromMission(G) {
    const missionData = campaignHandler.getCurrentMissionData();
    G.objectives = missionData.objectives || [];
    const { payloads: missionPayloads } = missionData;
    if (!missionPayloads || !missionPayloads.length) {
        G.payloads = [];
        G.goalCount = 0;
        return;
    }
    G.payloads = missionPayloads.map(p => {
        let px = p.x,
            py = p.y;
        if (p.attachTo) {
            if (p.attachTo.objectType === 'carrier' && hasCarrier()) {
                px = G.CARRIER.x;
                py = G.CARRIER.y;
            } else if (p.attachTo.objectType === 'boat') {
                const attachedBoat = G.BOATS.find(b => b._objIdx === p.attachTo.objectIdx);
                if (attachedBoat) {
                    px = attachedBoat.x;
                    py = attachedBoat.y;
                }
            }
        }
        const SURVIVOR_OUTFITS = [
            { shirt: '#e74c3c', pants: '#2c3e50' },
            { shirt: '#3498db', pants: '#1a252f' },
            { shirt: '#2ecc71', pants: '#2c3e50' },
            { shirt: '#f39c12', pants: '#2c3e50' },
            { shirt: '#9b59b6', pants: '#2c3e50' },
            { shirt: '#e8e8e8', pants: '#555555' },
            { shirt: '#e67e22', pants: '#1a5276' },
            { shirt: '#c0392b', pants: '#17202a' },
        ];
        return {
            x: px,
            y: py,
            z: getGround(px, py, G.points, G.CARRIER),
            vx: 0,
            vy: 0,
            type: p.type,
            rescued: false,
            hanging: false,
            attachTo: p.attachTo || null,
            npcTarget: p.npcTarget ?? false,
            outfitColors: p.type === 'person'
                ? SURVIVOR_OUTFITS[Math.floor(Math.random() * SURVIVOR_OUTFITS.length)]
                : null,
        };
    });
    G.goalCount = G.payloads.filter(p => !p.npcTarget).length;
    G.totalRescued = 0;
    G.activePayload = null;
}

// ─── G.wind ───────────────────────────────────────────────────────────────────
function updateWind(wind: any, dt: number) {
    const { windStr, windDir, windVar } = campaignHandler.getCurrentMissionData();
    const baseAngle = (windDir ?? 0) * (Math.PI / 180);
    const baseStrength = ((windStr ?? 1) / 10) * 0.0002;
    wind.phase += 0.01 * dt;
    const gust = 1 + Math.sin(wind.phase) * 0.8;
    let currentAngle = baseAngle;
    if (windVar) {
        wind.varOffset = (wind.varOffset ?? 0) + (Math.random() - 0.5) * 0.008 * dt;
        wind.varOffset = Math.max(-0.5, Math.min(0.5, wind.varOffset));
        currentAngle = baseAngle + wind.varOffset;
    }
    wind.x = Math.cos(currentAngle) * baseStrength * gust;
    wind.y = Math.sin(currentAngle) * baseStrength * gust;
    wind.angle = currentAngle;
}

// ─── G.debris ──────────────────────────────────────────────────────────────────

function spawnExplosion(heli, particles, debris, points, CARRIER) {
    const impactSpeed = Math.hypot(heli.vx, heli.vy, heli.vz || 0);
    const intensity = Math.min(1.0, impactSpeed / 0.25);
    const count = Math.floor(30 + intensity * 80);
    const x = heli.x,
        y = heli.y,
        z = Math.max(heli.z, getGround(heli.x, heli.y, points, CARRIER) + 0.1);
    const fwdX = impactSpeed > 0.01 ? heli.vx / impactSpeed : 0;
    const fwdY = impactSpeed > 0.01 ? heli.vy / impactSpeed : 0;

    // Feuer- und Rauchpartikel
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const el = (Math.random() - 0.3) * Math.PI;
        const spd = (0.04 + Math.random() * 0.12) * (0.5 + intensity * 0.5);
        const isFire = Math.random() < 0.6;
        // Bias in Flugrichtung: 70% Impuls vorwärts
        const biasFwd = 0.5 + Math.random() * 0.5;
        particles.push({
            x,
            y,
            z: z + Math.random() * 0.3,
            vx: Math.cos(a) * Math.cos(el) * spd + fwdX * impactSpeed * biasFwd,
            vy: Math.sin(a) * Math.cos(el) * spd + fwdY * impactSpeed * biasFwd,
            vz: Math.sin(el) * spd * 0.5 + 0.05,
            gravity: -0.004,
            size: isFire ? 4 + Math.random() * 6 : 3 + Math.random() * 8,
            life: 0.6 + Math.random() * 0.8,
            maxLife: 1.0,
            color: isFire
                ? `${220 + Math.floor(Math.random() * 35)}, ${Math.floor(Math.random() * 120)}, 0`
                : `${80 + Math.floor(Math.random() * 60)}, ${70 + Math.floor(Math.random() * 40)}, ${60 + Math.floor(Math.random() * 40)}`,
            isSmoke: !isFire,
        });
    }

    // Metallsplitter — stark in Flugrichtung
    const shrapnel = Math.floor(15 + intensity * 30);
    for (let i = 0; i < shrapnel; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 0.05 + Math.random() * 0.2 * intensity;
        const biasFwd = 0.3 + Math.random() * 0.7;
        particles.push({
            x,
            y,
            z: z + Math.random() * 0.2,
            vx: Math.cos(a) * spd + fwdX * impactSpeed * biasFwd * 1.2,
            vy: Math.sin(a) * spd + fwdY * impactSpeed * biasFwd * 1.2,
            vz: 0.02 + Math.random() * 0.1,
            gravity: -0.008,
            size: 2,
            life: 1.0 + Math.random() * 1.5,
            maxLife: 2.0,
            color: `${180 + Math.floor(Math.random() * 60)}, ${160 + Math.floor(Math.random() * 40)}, ${100 + Math.floor(Math.random() * 50)}`,
            isMetal: true,
        });
    }

    // Heli-Trümmer — fliegen hauptsächlich in Flugrichtung weiter
    const _ht = getHeliType(heli.type);
    const scale = _ht.scale;
    const parts = [
        { name: 'fuselage', color: '#ff6600', stroke: '#dd3300', w: 1.5 * scale, h: 0.4 * scale },
        { name: 'tail', color: '#ff6600', stroke: '#dd3300', w: 1.0 * scale, h: 0.2 * scale },
        { name: 'rotor1', color: '#333', stroke: '#555', w: 1.8 * scale, h: 0.08 * scale },
        { name: 'rotor2', color: '#333', stroke: '#555', w: 1.8 * scale, h: 0.08 * scale },
        { name: 'door', color: '#cc4400', stroke: '#aa2200', w: 0.5 * scale, h: 0.4 * scale },
    ];
    if (_ht.extraRotorDebris)
        parts.push({ name: 'rotor3', color: '#333', stroke: '#555', w: 1.8, h: 0.08 });

    parts.forEach(part => {
        const a = Math.random() * Math.PI * 2;
        const spd = (0.03 + Math.random() * 0.1) * (0.4 + intensity * 0.6);
        const biasFwd = 0.4 + Math.random() * 0.6;
        debris.push({
            x,
            y,
            z: z + 0.1 + Math.random() * 0.4,
            vx: Math.cos(a) * spd * 0.4 + fwdX * impactSpeed * biasFwd,
            vy: Math.sin(a) * spd * 0.4 + fwdY * impactSpeed * biasFwd,
            vz: 0.03 + Math.random() * 0.08 * intensity,
            angle: heli.angle + (Math.random() - 0.5),
            av: (Math.random() - 0.5) * 0.15 * (0.5 + intensity),
            w: part.w,
            h: part.h,
            color: part.color,
            stroke: part.stroke,
            life: 3.0 + Math.random() * 2.0,
            bounced: false,
        });
    });

    // Sekundäre Rauchspur (verzögert)
    for (let i = 0; i < 8; i++) {
        setTimeout(() => {
            for (let j = 0; j < 3; j++) {
                const a = Math.random() * Math.PI * 2;
                particles.push({
                    x: x + Math.cos(a) * 0.3,
                    y: y + Math.sin(a) * 0.3,
                    z: z + Math.random() * 0.5,
                    vx: (Math.random() - 0.5) * 0.01,
                    vy: (Math.random() - 0.5) * 0.01,
                    vz: 0.01 + Math.random() * 0.02,
                    gravity: 0,
                    size: 6 + Math.random() * 10,
                    life: 0.4 + Math.random() * 0.4,
                    maxLife: 0.8,
                    color: `${60 + Math.floor(Math.random() * 40)}, ${55 + Math.floor(Math.random() * 30)}, ${50 + Math.floor(Math.random() * 30)}`,
                    isSmoke: true,
                });
            }
        }, i * 120);
    }
}

function updateDebris(G) {
    G.debris.forEach(d => {
        d.x += d.vx;
        d.y += d.vy;
        d.z += d.vz;
        d.vz += d.gravity !== undefined ? d.gravity : -0.006;
        d.angle += d.av;
        d.av *= 0.98;
        d.life -= 0.016;
        const gz = getGround(d.x, d.y, G.points, G.CARRIER);
        if (d.z <= gz) {
            d.z = gz;
            d.vz = Math.abs(d.vz) * 0.25;
            d.vx *= 0.6;
            d.vy *= 0.6;
            d.av *= 0.4;
            if (!d.bounced) {
                G.particles.push({
                    x: d.x,
                    y: d.y,
                    z: gz + 0.05,
                    vx: (Math.random() - 0.5) * 0.03,
                    vy: (Math.random() - 0.5) * 0.03,
                    vz: 0.015,
                    gravity: 0,
                    size: 4,
                    life: 0.3,
                    maxLife: 0.3,
                    color: '150,130,100',
                    isSmoke: true,
                });
                d.bounced = true;
            }
        }
    });
    G.debris = G.debris.filter(d => d.life > 0);
}

function drawDebris(debris, camX, camY, ctx, canvas) {
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
// ─── NPC helis removed ───────────────────────────────────────────────────────

function getCarrierPadWorld(padIdx, CARRIER) {
    const dw = CARRIER.w + 1.2;
    const px = -dw + 0.5 + 1.4;
    const py = [-4.5, 0.0, 4.5][padIdx] ?? 0;
    const cosA = Math.cos(CARRIER.angle),
        sinA = Math.sin(CARRIER.angle);
    return {
        x: CARRIER.x + px * cosA - py * sinA,
        y: CARRIER.y + px * sinA + py * cosA,
        z: CARRIER.zDeck,
    };
}

function getCarrierSlotWorld(slot, CARRIER) {
    const cosA = Math.cos(CARRIER.angle),
        sinA = Math.sin(CARRIER.angle);
    return {
        x: CARRIER.x + slot.xRel * cosA - slot.yRel * sinA,
        y: CARRIER.y + slot.xRel * sinA + slot.yRel * cosA,
        z: CARRIER.zDeck,
    };
}
// ─── birds ───────────────────────────────────────────────────────────────────
// G.flocks initialized in G object

function initBirds() {
    G.flocks = [];
    const { gridSize } = campaignHandler.getTerrain();
    const numFlocks = 4 + Math.floor(Math.random() * 4);
    // Spawn-Radius um Startposition damit Vögel sofort sichtbar
    const spawnCx = G.START_POS ? G.START_POS.x : gridSize / 2;
    const spawnCy = G.START_POS ? G.START_POS.y : gridSize / 2;
    for (let f = 0; f < numFlocks; f++) {
        let fx, fy;
        // Erst versuchen: Land in der Nähe
        let found = false;
        for (let attempt = 0; attempt < 30; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 5 + Math.random() * 18;
            fx = spawnCx + Math.cos(angle) * dist;
            fy = spawnCy + Math.sin(angle) * dist;
            fx = Math.max(3, Math.min(gridSize - 3, fx));
            fy = Math.max(3, Math.min(gridSize - 3, fy));
            if (getGround(fx, fy, G.points, G.CARRIER) > 0.2) {
                found = true;
                break;
            }
        }
        if (!found) {
            // Fallback: irgendwo auf der Karte
            fx = 5 + Math.random() * (gridSize - 10);
            fy = 5 + Math.random() * (gridSize - 10);
        }
        const fz = 3 + Math.random() * 5;
        const baseAngle = Math.random() * Math.PI * 2;
        const spd = 0.012 + Math.random() * 0.008;
        const count = 4 + Math.floor(Math.random() * 6);
        const birds = [];
        for (let i = 0; i < count; i++) {
            birds.push({
                x: fx + (Math.random() - 0.5) * 3,
                y: fy + (Math.random() - 0.5) * 3,
                z: fz + (Math.random() - 0.5) * 0.8,
                vx: Math.cos(baseAngle) * spd,
                vy: Math.sin(baseAngle) * spd,
                vz: 0,
                wingPhase: Math.random() * Math.PI * 2,
            });
        }
        G.flocks.push({ birds, fleeing: false, fleeTimer: 0 });
    }
}

function updateBirds() {
    const { gridSize } = campaignHandler.getTerrain();
    G.flocks.forEach(flock => {
        // Heli-Nähe prüfen
        const cx = flock.birds.reduce((s, b) => s + b.x, 0) / flock.birds.length;
        const cy = flock.birds.reduce((s, b) => s + b.y, 0) / flock.birds.length;
        const distToHeli = Math.hypot(G.heli.x - cx, G.heli.y - cy);
        const heliLoud = G.heli.rotorRPM > 0.3;
        if (heliLoud && distToHeli < 8) {
            flock.fleeing = true;
            flock.fleeTimer = 180;
        }
        if (flock.fleeTimer > 0) flock.fleeTimer--;
        else flock.fleeing = false;

        // Schwarm-Zielrichtung
        const flockAngle = Math.atan2(
            flock.birds.reduce((s, b) => s + b.vy, 0),
            flock.birds.reduce((s, b) => s + b.vx, 0)
        );
        const baseSpd = flock.fleeing ? 0.035 : 0.014;

        flock.birds.forEach(bird => {
            // Fluchtvector weg vom Heli
            let targetAngle = flockAngle;
            if (flock.fleeing) {
                const awayAngle = Math.atan2(bird.y - G.heli.y, bird.x - G.heli.x);
                targetAngle = awayAngle + (Math.random() - 0.5) * 0.5;
            } else {
                // Leichte Windeinwirkung + sanfte Kurven
                targetAngle += (Math.random() - 0.5) * 0.04 + G.wind.x * 0.08;
            }

            // Boid: Zusammenhalt zum Schwarm-Zentrum
            const toCx = cx - bird.x,
                toCy = cy - bird.y;
            const cohesion = 0.0003;
            bird.vx += toCx * cohesion + Math.cos(targetAngle) * 0.001;
            bird.vy += toCy * cohesion + Math.sin(targetAngle) * 0.001;

            // Geschwindigkeit normieren
            const spd = Math.hypot(bird.vx, bird.vy);
            if (spd > 0.001) {
                bird.vx = (bird.vx / spd) * baseSpd;
                bird.vy = (bird.vy / spd) * baseSpd;
            }

            // Höhe über Terrain halten, leicht wellig
            const gz = getGround(bird.x, bird.y, G.points, G.CARRIER);
            const targetZ = gz + 4 + Math.sin(bird.wingPhase * 0.3) * 0.5;
            bird.vz += (targetZ - bird.z) * 0.05;
            bird.vz *= 0.85;
            bird.x += bird.vx;
            bird.y += bird.vy;
            bird.z += bird.vz;
            bird.wingPhase += flock.fleeing ? 0.4 : 0.2;

            // Kartenrand: umkehren
            if (bird.x < 3) bird.vx += 0.005;
            if (bird.x > gridSize - 3) bird.vx -= 0.005;
            if (bird.y < 3) bird.vy += 0.005;
            if (bird.y > gridSize - 3) bird.vy -= 0.005;
        });
    });
}

function drawBirds(camX, camY) {
    G.flocks.forEach(flock => {
        flock.birds.forEach(bird => {
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

function getRotorPositions() {
    const cosA = Math.cos(G.heli.angle), sinA = Math.sin(G.heli.angle);
    return getHeliType(G.heli.type).rotorOffsets.map(ox => ({
        x: G.heli.x + cosA * ox,
        y: G.heli.y + sinA * ox,
    }));
}

function handleParticles(dt: number) {
    const gH = getGround(G.heli.x, G.heli.y, G.points, G.CARRIER);
    const rotors = getRotorPositions();
    if (G.heli.rotorRPM > 0.8) {
        if (G.heli.z < 2.5 && gH > 0.1) {
            rotors.forEach(rotor => {
                const a = Math.random() * Math.PI * 2;
                G.particles.push({
                    x: rotor.x + Math.cos(a) * 0.6,
                    y: rotor.y + Math.sin(a) * 0.6,
                    z: gH + 0.1,
                    vx: Math.cos(a) * 0.06,
                    vy: Math.sin(a) * 0.06,
                    life: 0.5,
                    color: '150, 140, 120',
                });
            });
        } else if (G.heli.z < 2.0 && gH < 0.1) {
            rotors.forEach(rotor => {
                for (let i = 0; i < 2; i++) {
                    const a = Math.random() * Math.PI * 2;
                    G.particles.push({
                        x: rotor.x + Math.cos(a) * 0.6,
                        y: rotor.y + Math.sin(a) * 0.6,
                        z: 0,
                        vx: Math.cos(a) * 0.08,
                        vy: Math.sin(a) * 0.08,
                        life: 0.4,
                        color: '200, 230, 255',
                    });
                }
            });
        }
    }
    G.particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= 0.02 * dt;
    });
    G.particles = G.particles.filter(p => p.life > 0);
}

// ─── physics ────────────────────────────────────────────────────────────────
function updatePhysics(dt: number) {
    const { crashed } = zstate;
    const { gridSize } = campaignHandler.getTerrain();

    updateWind(G.wind, dt);

    // carrier movement & heli-on-deck drag
    updateBoats(G.BOATS, dt);
    if (hasPad() && G.fuelTruck.state !== 'PARKED') updateFuelTruck(G, dt);
    if (hasCarrier() && !crashed) {
        let oldX = G.CARRIER.x,
            oldY = G.CARRIER.y,
            oldAng = G.CARRIER.angle;
        updateCarrierPos(G.CARRIER, {
            get t() {
                return G.seaTime;
            },
            set t(v) {
                G.seaTime = v;
            },
        }, false, dt);
        let carrierVX = G.CARRIER.x - oldX;
        let carrierVY = G.CARRIER.y - oldY;
        let carrierRot = G.CARRIER.angle - oldAng;

        let local = getCarrierLocal(G.heli.x, G.heli.y, G.CARRIER);
        let onDeck =
            local.x >= -G.CARRIER.w &&
            local.x <= G.CARRIER.w &&
            local.y >= -G.CARRIER.l &&
            local.y <= G.CARRIER.l;

        if (onDeck && !G.heli.inAir) {
            G.heli.x += carrierVX;
            G.heli.y += carrierVY;
            let dx = G.heli.x - G.CARRIER.x,
                dy = G.heli.y - G.CARRIER.y;
            G.heli.x += dx * Math.cos(carrierRot) - dy * Math.sin(carrierRot) - dx;
            G.heli.y += dx * Math.sin(carrierRot) + dy * Math.cos(carrierRot) - dy;
            G.heli.angle += carrierRot;
            G.heli.vx *= Math.pow(0.8, dt);
            G.heli.vy *= Math.pow(0.8, dt);
        }
    }

    let groundH = getGround(G.heli.x, G.heli.y, G.points, G.CARRIER);

    // onPad detection (carrier OR land pad)
    let onCarrierDeck = false, onPadSurface = false;
    if (hasCarrier()) {
        let local = getCarrierLocal(G.heli.x, G.heli.y, G.CARRIER);
        if (
            local.x >= -G.CARRIER.w &&
            local.x <= G.CARRIER.w &&
            local.y >= -G.CARRIER.l &&
            local.y <= G.CARRIER.l
        )
            onCarrierDeck = true;
    }
    if (
        hasPad() &&
        G.heli.x >= G.PAD.xMin &&
        G.heli.x <= G.PAD.xMax &&
        G.heli.y >= G.PAD.yMin &&
        G.heli.y <= G.PAD.yMax
    )
        onPadSurface = true;
    const onPad = onCarrierDeck || onPadSurface;

    // Use PAD surface height when on pad, carrier deck height when on carrier
    const effectiveGroundH =
        onPad && hasPad() && G.PAD ? G.PAD.z : onPad && hasCarrier() ? G.CARRIER.zDeck : groundH;

    // tower collision – handled by handleCollisionBoxes()

    // engine
    if (G.keys['KeyW'] && !G.heli.engineOn && G.heli.fuel > 0 && onPad && !zstate.introActive)
        G.heli.engineOn = true;
    if (G.keys['KeyS'] && !G.heli.inAir && G.heli.engineOn) {
        G.heli.engineOn = false;
        const landObj = G.objectives.find(o => o.type === 'land_at');
        if (landObj) {
            const onTarget =
                (landObj.target === 'carrier' && onCarrierDeck) ||
                (landObj.target === 'pad' && onPadSurface) ||
                (landObj.target === 'boat' && onPadSurface);
            if (onTarget) missionComplete();
        }
    }
    // Trigger fuel truck once rotor has fully spun down after engine off
    if (
        hasPad() &&
        onPad &&
        !G.heli.engineOn &&
        !G.heli.inAir &&
        G.heli.rotorRPM < 0.05 &&
        G.fuelTruck.state === 'PARKED' &&
        G.heli.fuel < 99
    ) {
        G.fuelTruck.state = 'DRIVING';
        G.fuelTruck.t = 0;
    }
    G.heli.rotorRPM =
        G.heli.engineOn && G.heli.fuel > 0
            ? Math.min(1, G.heli.rotorRPM + 0.005 * dt)
            : Math.max(0, G.heli.rotorRPM - 0.004 * dt);
    G.heli.rotationPos += G.heli.rotorRPM * 0.75 * dt;

    handleParticles(dt);

    // payload physics
    if (G.activePayload) {
        let p = G.activePayload;
        let hookZ = G.heli.z - G.heli.winch;
        const damping = p.type === 'person' ? 0.88 : 0.95;
        const tension = p.type === 'person' ? 0.018 : 0.005;
        let ax = (G.heli.x - p.x) * tension + G.wind.x * 2.0;
        let ay = (G.heli.y - p.y) * tension + G.wind.y * 2.0;
        p.vx += ax * dt;
        p.vy += ay * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z = hookZ;
        p.vx *= Math.pow(damping, dt);
        p.vy *= Math.pow(damping, dt);
        let baseMass = p.type === 'crate' ? 0.8 : 0.2;
        G.heli.vx -= ax * baseMass * G.heli.cargoResist * dt;
        G.heli.vy -= ay * baseMass * G.heli.cargoResist * dt;
        // keep rescuerSwing in sync with payload position
        G.rescuerSwing.x = G.activePayload.x;
        G.rescuerSwing.y = G.activePayload.y;
    } else {
        // rescuer pendulum physics when winch extended without payload
        if (G.heli.winch > 0.3 && G.heli.type !== 'glider') {
            const rs = G.rescuerSwing;
            const tension = 0.018, damping = 0.88;
            const ax = (G.heli.x - rs.x) * tension + G.wind.x * 2.0;
            const ay = (G.heli.y - rs.y) * tension + G.wind.y * 2.0;
            rs.vx += ax * dt;
            rs.vy += ay * dt;
            rs.x += rs.vx * dt;
            rs.y += rs.vy * dt;
            rs.vx *= Math.pow(damping, dt);
            rs.vy *= Math.pow(damping, dt);
        } else if (G.heli.winch <= 0.1) {
            G.rescuerSwing.x = G.heli.x;
            G.rescuerSwing.y = G.heli.y;
            G.rescuerSwing.vx = 0;
            G.rescuerSwing.vy = 0;
        }

        // water bob + vessel tracking for unrescued G.payloads
        G.payloads.forEach(p => {
            if (p.rescued || p.hanging) return;
            // Mitbewegen mit Träger/Boot
            if (p.attachTo) {
                if (p.attachTo.objectType === 'carrier' && hasCarrier()) {
                    p.x = G.CARRIER.x;
                    p.y = G.CARRIER.y;
                    p.z = G.CARRIER.zDeck;
                } else if (p.attachTo.objectType === 'boat') {
                    const b = G.BOATS.find(b => b._objIdx === p.attachTo.objectIdx);
                    if (b) {
                        p.x = b.x;
                        p.y = b.y;
                        p.z = b.zDeck;
                    }
                }
            } else if (getGround(p.x, p.y, G.points, G.CARRIER) < 0) {
                p.z = -0.3 + Math.sin(Date.now() * 0.002) * 0.1;
            }
        });
    }

    // flight
    let lift = G.heli.rotorRPM > 0.9 ? 1.0 : 0.0;
    let inAir = G.heli.z > effectiveGroundH + 0.15;
    G.heli.inAir = inAir;

    if (G.heli.type === 'glider') {
        G.heli.inAir = true;
        const dX = Math.cos(G.heli.angle), dY = Math.sin(G.heli.angle);
        const cruiseSpd = 0.10; // constant forward speed

        // --- Pitch: ↑ pulls up, ↓ pushes down ---
        // vz rampt langsam auf (träge), ist aber stark genug zum Steigen
        if (G.keys['ArrowUp']) {
            G.heli.vz = Math.min(G.heli.vz + 0.003 * dt, 0.07);
            G.heli.tilt += (0.25 - G.heli.tilt) * 0.04 * dt;
        } else if (G.keys['ArrowDown']) {
            G.heli.vz = Math.max(G.heli.vz - 0.002 * dt, -0.07);
            G.heli.tilt += (-0.25 - G.heli.tilt) * 0.04 * dt;
        } else {
            G.heli.tilt += (0 - G.heli.tilt) * 0.03 * dt;
        }

        // --- Bank: ←→ coordinated turn (träge) ---
        let turning = false;
        const bankRate = 0.004;
        if (G.keys['ArrowLeft']) {
            G.heli.angle -= bankRate * dt;
            G.heli.roll = Math.min(G.heli.roll + 0.015 * dt, 0.65);
            turning = true;
        }
        if (G.keys['ArrowRight']) {
            G.heli.angle += bankRate * dt;
            G.heli.roll = Math.max(G.heli.roll - 0.015 * dt, -0.65);
            turning = true;
        }
        // --- Rudder: A/D – leichtes Gieren ohne starke Querneigung ---
        if (G.keys['KeyA']) {
            G.heli.angle -= 0.003 * dt;
            G.heli.roll = Math.min(G.heli.roll + 0.008 * dt, 0.20);
            turning = true;
        }
        if (G.keys['KeyD']) {
            G.heli.angle += 0.003 * dt;
            G.heli.roll = Math.max(G.heli.roll - 0.008 * dt, -0.20);
            turning = true;
        }
        if (!turning) G.heli.roll *= Math.pow(0.988, dt);

        // Constant forward speed, always aligned to heading
        G.heli.vx = dX * cruiseSpd;
        G.heli.vy = dY * cruiseSpd;

        // --- Baseline sink rate ---
        G.heli.vz -= 0.0015 * dt;

        // --- Ridge lift (westerly wind: air rises on west face of ridges) ---
        const dhW = getGround(G.heli.x - 0.5, G.heli.y, G.points, null)
                  - getGround(G.heli.x + 0.5, G.heli.y, G.points, null);
        G.heli.vz += Math.max(0, dhW * 0.08) * dt;

        // --- Thermal: above warm elevated ground (within 8 units) ---
        const gBelow = getGround(G.heli.x, G.heli.y, G.points, null);
        if (gBelow > 4.0 && G.heli.z - gBelow < 10) G.heli.vz += 0.002 * dt;

        // Clamp vz
        G.heli.vz = Math.max(G.heli.vz, -0.08);
        G.heli.vz = Math.min(G.heli.vz, 0.10);
    } else if (inAir || (G.heli.engineOn && lift > 0)) {
        let spd = Math.hypot(G.heli.vx, G.heli.vy);
        let aero = Math.max(0.3, 1.0 - spd * 8.0);
        let mod = G.heli.rotorRPM * (1.0 - G.heli.onboard * 0.03);

        if (G.heli.fuel > 0 && lift > 0) {
            let dX = Math.cos(G.heli.angle),
                dY = Math.sin(G.heli.angle);
            let sX = Math.cos(G.heli.angle + Math.PI / 2),
                sY = Math.sin(G.heli.angle + Math.PI / 2);

            if (G.keys['ArrowUp']) {
                G.heli.vx += dX * G.heli.accel * mod * dt;
                G.heli.vy += dY * G.heli.accel * mod * dt;
                G.heli.tilt = Math.max(G.heli.tilt - G.heli.tiltSpeed * dt, -0.4);
            } else if (G.keys['ArrowDown']) {
                G.heli.vx -= dX * G.heli.accel * mod * dt;
                G.heli.vy -= dY * G.heli.accel * mod * dt;
                G.heli.tilt = Math.min(G.heli.tilt + G.heli.tiltSpeed * dt, 0.2);
            } else G.heli.tilt *= Math.pow(0.96, dt);

            let turning = false;
            if (G.keys['KeyA']) {
                G.heli.vx -= sX * 0.001 * mod * dt;
                G.heli.vy -= sY * 0.001 * mod * dt;
                G.heli.roll = Math.min(G.heli.roll + 0.02 * dt, 0.4);
                turning = true;
            } else if (G.keys['KeyD']) {
                G.heli.vx += sX * 0.001 * mod * dt;
                G.heli.vy += sY * 0.001 * mod * dt;
                G.heli.roll = Math.max(G.heli.roll - 0.02 * dt, -0.4);
                turning = true;
            }
            if (G.keys['ArrowLeft']) {
                G.heli.angle -= 0.045 * mod * aero * dt;
                G.heli.roll = Math.min(G.heli.roll + 0.012 * dt, 0.4);
                turning = true;
            }
            if (G.keys['ArrowRight']) {
                G.heli.angle += 0.045 * mod * aero * dt;
                G.heli.roll = Math.max(G.heli.roll - 0.012 * dt, -0.4);
                turning = true;
            }
            if (!turning) G.heli.roll *= Math.pow(0.96, dt);

            if (G.keys['KeyW']) G.heli.vz += G.heli.liftPower * mod * dt;
            else if (G.keys['KeyS']) G.heli.vz -= 0.002 * dt;
            else G.heli.vz *= Math.pow(0.9, dt);

            G.heli.fuel -= G.heli.fuelRate * mod * dt;
        } else {
            G.heli.tilt *= Math.pow(0.98, dt);
            G.heli.roll = Math.sin(Date.now() * 0.01) * 0.1;
        }
    }

    if (G.heli.fuel <= 0 && inAir) {
        if (G.heli.fuel > -1) {
            showMsg('KEIN TREIBSTOFF!');
            G.heli.fuel = -1;
        }
        G.heli.engineOn = false;
        G.heli.vz -= 0.002 * dt;
    }

    G.heli.vx *= Math.pow(G.heli.friction, dt);
    G.heli.vy *= Math.pow(G.heli.friction, dt);
    G.heli.x += G.heli.vx * dt;
    G.heli.y += G.heli.vy * dt;
    G.heli.z += G.heli.vz * dt;
    if (G.heli.type === 'glider' && G.heli.z > 14) {
        G.heli.z = 14;
        G.heli.vz = Math.min(G.heli.vz, 0);
    }

    const margin = 2;
    if (G.heli.x < margin) {
        G.heli.x = margin;
        G.heli.vx = 0;
    }
    if (G.heli.x > gridSize - margin) {
        G.heli.x = gridSize - margin;
        G.heli.vx = 0;
    }
    if (G.heli.y < margin) {
        G.heli.y = margin;
        G.heli.vy = 0;
    }
    if (G.heli.y > gridSize - margin) {
        G.heli.y = gridSize - margin;
        G.heli.vy = 0;
    }
    const zMax = 20.0;
    if (G.heli.z > zMax) {
        G.heli.z = zMax;
        G.heli.vz = 0;
        if (Math.random() < 0.05) showMsg(I18N.MAX_ALTITUDE);
    }
    if (G.heli.z < groundH + 0.1) {
        G.heli.z = groundH + 0.1;
        G.heli.vz = 0;
    }

    // winch
    if (G.heli.type !== 'glider') {
    if (G.keys['KeyQ']) G.heli.winch = Math.max(0, G.heli.winch - 0.02 * dt);
    if (G.keys['KeyE']) G.heli.winch = Math.min(5.0, G.heli.winch + 0.02 * dt);
    } // end !glider winch

    // pickup – find nearest unrescued payload in range
    if (G.heli.type !== 'glider' && !G.activePayload) {
        for (let p of G.payloads) {
            if (p.rescued || p.hanging || p.npcTarget) continue;
            let dist = Math.hypot(G.heli.x - p.x, G.heli.y - p.y);
            let hZ = G.heli.z - G.heli.winch;
            if (dist < 1.8 && Math.abs(hZ - getGround(p.x, p.y)) < 1.0) {
                p.hanging = true;
                G.activePayload = p;
                G.rescuerSwing.x = p.x;
                G.rescuerSwing.y = p.y;
                G.rescuerSwing.vx = 0;
                G.rescuerSwing.vy = 0;
                showMsg(p.type === 'crate' ? I18N.CARGO_SECURED : I18N.PATIENT_SECURED);
                G.heli.winch = Math.max(0, G.heli.winch - 0.5);
                break;
            }
        }
    }

    // crate touchdown delivery: lower winch until crate reaches pad surface
    if (G.heli.type !== 'glider' && G.activePayload?.type === 'crate' && onPad) {
        const padSurfaceZ = onCarrierDeck ? G.CARRIER.zDeck : G.PAD.z;
        const crateZ = G.heli.z - G.heli.winch;
        if (crateZ <= padSurfaceZ + 0.4) {
            const p = G.activePayload;
            p.hanging = false;
            p.rescued = true;
            G.activePayload = null;
            G.totalRescued++;
            showMsg(I18N.DELIVERED);
            if (G.totalRescued >= G.goalCount) missionComplete();
        }
    }

    // deposit / winch-in
    if (G.heli.type !== 'glider' && G.activePayload && G.heli.winch < 0.5) {
        let p = G.activePayload;
        if (p.type === 'person') {
            if (G.heli.onboard < G.heli.maxLoad) {
                p.hanging = false;
                p.rescued = true;
                G.activePayload = null;
                G.heli.onboard++;
                showMsg(I18N.ONBOARD(G.heli.onboard, G.heli.maxLoad));
            } else showMsg(I18N.CABIN_FULL);
        } else {
            if (onPad && G.heli.z < 3.0) {
                p.hanging = false;
                p.rescued = true;
                G.activePayload = null;
                G.totalRescued++;
                showMsg(I18N.DELIVERED);
                if (G.totalRescued >= G.goalCount) missionComplete();
            } else {
                showMsg(I18N.DROP_AT_PAD);
                G.heli.winch = 0.6;
            }
        }
    }

    // landing on pad: carrier refuel/offload instant; land pad via fuel truck
    if (!inAir && onPad) {
        if (hasCarrier()) {
            let local = getCarrierLocal(G.heli.x, G.heli.y, G.CARRIER);
            if (
                local.x >= -G.CARRIER.w &&
                local.x <= G.CARRIER.w &&
                local.y >= -G.CARRIER.l &&
                local.y <= G.CARRIER.l
            ) {
                if (G.heli.fuel < 100) G.heli.fuel = Math.min(100, G.heli.fuel + 0.5);
                if (G.heli.onboard > 0) {
                    G.totalRescued += G.heli.onboard;
                    G.heli.onboard = 0;
                    if (G.totalRescued >= G.goalCount) missionComplete();
                    else showMsg(I18N.SECURED(G.totalRescued, G.goalCount));
                }
            }
        }
    }

    // crash detection
    if (!zstate.introActive) {
        if (!onPad && G.heli.z < 0.1 && getGround(G.heli.x, G.heli.y, G.points, G.CARRIER) < -0.2)
            triggerCrash(I18N.CRASH_WATER);
        if (G.heli.z < groundH + 0.25) {
            if (!onPad && groundH > 0.1) triggerCrash(I18N.CRASH_BAD_ZONE);
            else if (Math.hypot(G.heli.vx, G.heli.vy) > 0.12) triggerCrash(I18N.CRASH_TOO_FAST);
            else if (G.heli.vz < -0.15) triggerCrash(I18N.CRASH_HARD_IMPACT);
        }
        // lighthouse collision – handled by handleCollisionBoxes()
    }
}

// ─── UI helpers ──────────────────────────────────────────────────────────────
function showMsg(txt) {
    let m = document.getElementById('msg');
    m.innerHTML = txt;
    m.style.opacity = 1;
    setTimeout(() => {
        m.style.opacity = 0;
    }, 2000);
}

function isVisible(objX, objY, margin = 16) {
    const rx = zstate.introActive ? G.START_POS.x : G.heli.x;
    const ry = zstate.introActive ? G.START_POS.y : G.heli.y;
    return Math.abs(objX - rx) < margin && Math.abs(objY - ry) < margin;
}

// ─── screens ────────────────────────────────────────────────────────────────
function triggerCrash(reason) {
    if (zstate.crashed) return;
    soundHandler.play(musicConfig.defeat || 'final', false);
    spawnExplosion(G.heli, G.particles, G.debris, G.points, G.CARRIER);
    zstate.crashed = true;
    setTimeout(() => {
        document.getElementById('campaign-failed-reason').innerHTML = reason;
        document.getElementById('campaign-failed-screen').style.display = 'flex';
    }, 1800); // Explosion erst austoben lassen
}

function showBriefing() {
    const { headline, sublines, briefing, previewBase64 } = campaignHandler.getCurrentMissionData();
    const mapEl = document.getElementById('briefing-map');
    if (previewBase64) {
        mapEl.src = previewBase64;
        mapEl.style.display = 'block';
    } else {
        mapEl.style.display = 'none';
    }
    document.getElementById('briefing-headline').textContent = headline || 'MISSION BRIEFING';
    const sublinesEl = document.getElementById('briefing-sublines');
    sublinesEl.innerHTML =
        Array.isArray(sublines) && sublines.length ? sublines.map(s => `▸ ${s}`).join('<br>') : '';
    document.getElementById('briefing-body').textContent = briefing || '';
    const briefingSong = campaignHandler.getActiveCampaignMusic().briefing;
    if (briefingSong) soundHandler.play(briefingSong, true);
    document.getElementById('mission-briefing').style.display = 'flex';
}

function dismissBriefing() {
    document.getElementById('mission-briefing').style.display = 'none';
    launchMission();
}

function missionComplete() {
    const next = campaignHandler.campaign.getNextMission();
    if (next === 'DONE') {
        document.getElementById('campaign-complete-name').textContent = next?.campaignTitle || '';
        document.getElementById('campaign-complete-screen').style.display = 'flex';
        soundHandler.play(musicConfig.success || 'final', false);
        return;
    }
    const { gridSize, objects: nextObjects } = next;
    const nextPad = (nextObjects || []).find(o => o.type === 'pad' || o.type === 'spawn') || { x: 10, y: 10 };
    G.PAD = { xMin: nextPad.x, xMax: nextPad.x + 7, yMin: nextPad.y, yMax: nextPad.y + 7, z: 0.5 };
    G.START_POS = { x: nextPad.x + 4, y: nextPad.y + 4 };
    initGrid(gridSize, G.points);

    const successEl = document.getElementById('mission-success-screen');
    successEl.style.display = 'flex';
    successEl.onclick = () => {
        successEl.style.display = 'none';
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
    };
}

function returnToBase() {
    zstate.gameStarted = false;
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

    document.getElementById('campaign-complete-screen').style.display = 'none';
    document.getElementById('campaign-failed-screen').style.display = 'none';
    document.getElementById('mission-success-screen').style.display = 'none';
    document.getElementById('crash-screen').style.display = 'none';
    document.getElementById('mission-briefing').style.display = 'none';
    document.getElementById('campaign-select').style.display = 'flex';

    const campaigns = [];
    campaignHandler
        .getCampaigns()
        .forEach(({ campaignTitle, campaignSublines, levels, type }, index) => {
            if (type === 'glider') return;
            let sublines = '';
            campaignSublines.forEach(s => {
                sublines += `<div class="box-sub">${s}</div>`;
            });
            sublines += `<div class="box-sub">Missions: ${levels.length}</div>`;
            campaigns.push(
                `<div class="grid-box" onclick="selectCampaign('${index}')"${type === 'tutorial' ? ` style="border-color: #ff9900"` : ''}>
                            <div class="box-label"${type === 'tutorial' ? ` style="color: #ff9900"` : ''}>${campaignTitle}</div>
                            ${sublines}
                        </div>`
            );
        });
    document.getElementById('campaign-grid').innerHTML = campaigns.join('');
    soundHandler.play(musicConfig.mainMenu || 'maintheme', true);
}

// ─── campaign / G.heli select ──────────────────────────────────────────────────
function toCampaignSelect() {
    soundHandler.play(musicConfig.mainMenu || 'maintheme', false);
    document.getElementById('splash').style.display = 'none';
    document.getElementById('main-menu').style.display = 'none';
    const campaigns = [];
    campaignHandler
        .getCampaigns()
        .forEach(({ campaignTitle, campaignSublines, levels, type }, index) => {
            if (type === 'glider') return;
            let sublines = '';
            campaignSublines.forEach(s => {
                sublines += `<div class="box-sub">${s}</div>`;
            });
            sublines += `<div class="box-sub">Missions: ${levels.length}</div>`;
            campaigns.push(
                `<div class="grid-box" onclick="selectCampaign('${index}')"${type === 'tutorial' ? ` style="border-color: #ff9900"` : ''}>
                            <div class="box-label"${type === 'tutorial' ? ` style="color: #ff9900"` : ''}>${campaignTitle}</div>
                            ${sublines}
                        </div>`
            );
        });
    document.getElementById('campaign-select').style.display = 'flex';
    document.getElementById('campaign-grid').innerHTML = campaigns.join('');
}

function launchEasterEgg() {
    const index = campaignHandler.getCampaigns()
        .findIndex(c => c.type === 'glider');
    if (index < 0) return;
    toCampaignSelect();
    selectCampaign(String(index));
}

function setHover(type, state) {
    G.menuHover[type] = state;
}

function selectCampaign(index) {
    campaignHandler.campaign.setActiveCampaign(index);
    const { gridSize, objects: selObjects, campaignType } = campaignHandler.getCurrentMissionData();
    const selPad = (selObjects || []).find(o => o.type === 'pad' || o.type === 'spawn') || { x: 10, y: 10 };
    G.PAD = { xMin: selPad.x, xMax: selPad.x + 7, yMin: selPad.y, yMax: selPad.y + 7, z: 0.5 };
    G.START_POS = { x: selPad.x + 4, y: selPad.y + 4 };
    initGrid(gridSize, G.points);
    document.getElementById('campaign-grid').innerHTML = '';
    document.getElementById('campaign-select').style.display = 'none';
    buildHeliSelect(campaignType);
    document.getElementById('heli-select').style.display = 'flex';
    animateHeliPreviews();
}

function startGame(type) {
    if (zstate.gameStarted) return;
    stopMenuParticles();
    soundHandler.play(campaignHandler.getActiveCampaignMusic().ingame || 'clike', false);
    G.heli.type = type;
    const _heliType = getHeliType(type);
    G.heli.maxLoad    = _heliType.maxLoad;
    G.heli.accel      = _heliType.accel;
    G.heli.friction   = _heliType.friction;
    G.heli.tiltSpeed  = _heliType.tiltSpeed;
    G.heli.fuelRate   = _heliType.fuelRate;
    G.heli.liftPower  = _heliType.liftPower;
    G.heli.cargoResist = _heliType.cargoResist;
    generateTerrain(G.points, G.PAD);
    initCarrierFromMission(G);
    initBoatsFromMission(G);
    document.getElementById('heli-select').style.display = 'none';
    showBriefing();
}

function launchMission() {
    generateTerrain(G.points, G.PAD);
    initCarrierFromMission(G);
    initBoatsFromMission(G);
    initFoliageFromMission();
    initBirds();
    initPayloadsFromMission(G);
    if (hasPad()) initFuelTruck(G);

    G.heli.winch = 0;
    zstate.crashed = false;
    zstate.gameStarted = true;
    setTouchVisible(true);

    if (G.heli.type === 'glider') {
        zstate.introActive = false;
        G.heli.x = G.START_POS.x;
        G.heli.y = G.START_POS.y;
        G.heli.z = getGround(G.START_POS.x, G.START_POS.y, G.points, G.CARRIER) + 5;
        G.heli.vx = Math.cos(G.heli.angle) * 0.10;
        G.heli.vy = Math.sin(G.heli.angle) * 0.10;
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

    drawScene();
}

// ─── Fuel Truck ───────────────────────────────────────────────────────────────
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
function initFuelTruck(G) {
    if (!G.PAD) return;
    const ft = G.fuelTruck;
    ft.parkX = G.PAD.xMax - 5.2;
    ft.parkY = G.PAD.yMin + 0.1; // Heck bündig mit Hangar-Rückwand (yMin)
    ft.parkAngle = Math.PI * 0.5; // nose → +Y (parallel zur Hangar-Öffnung)
    ft.x = ft.parkX;
    ft.y = ft.parkY;
    ft.angle = ft.parkAngle;
    ft.state = 'PARKED';
    ft.arm = 0;
    ft.t = 0;
    ft.wps = null;
    ft.wpI = 0;
}

function updateFuelTruck(G: any, dt: number) {
    if (!G.PAD) return;
    const ft = G.fuelTruck;
    const heli = G.heli;

    const SPEED = 0.045;
    const MAX_STEER = 0.025; // turning radius ≈ 1.8 u
    const STOP_DIST = 3.5;

    // Hangar bounding box derived from PAD geometry
    const HB = {
        x0: G.PAD.xMax - 4.5, x1: G.PAD.xMax + 0.5,
        y0: G.PAD.yMin - 0.5, y1: G.PAD.yMin + 2.5,
    };

    // Repulsion vector from hangar bounding box.
    // Returns a directional force pushing the truck away from the hangar.
    function hangarForce() {
        const cx = Math.max(HB.x0, Math.min(HB.x1, ft.x));
        const cy = Math.max(HB.y0, Math.min(HB.y1, ft.y));
        const dx = ft.x - cx, dy = ft.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.01 || dist > 3.0) return [0, 0];
        const s = Math.min(4.0, 1.5 / dist);
        return [dx / dist * s, dy / dist * s];
    }

    // Steer truck toward (tx,ty) using potential fields (attraction + hangar repulsion).
    function navigate(tx, ty) {
        const dx = tx - ft.x, dy = ty - ft.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.01) return 0;
        const [fx, fy] = hangarForce();
        const ax = dx / dist + fx;
        const ay = dy / dist + fy;
        const desired = Math.atan2(ay, ax);
        const diff = ((desired - ft.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        ft.angle += Math.max(-MAX_STEER * dt, Math.min(MAX_STEER * dt, diff));
        ft.x += Math.cos(ft.angle) * SPEED * dt;
        ft.y += Math.sin(ft.angle) * SPEED * dt;
        return dist;
    }

    if (ft.state === 'DRIVING') {
        if (navigate(heli.x, heli.y) <= STOP_DIST) {
            ft.state = 'ARM_OUT'; ft.t = 0;
        }
    } else if (ft.state === 'ARM_OUT') {
        ft.t = Math.min(1, ft.t + 0.016 * dt);
        ft.arm = ft.t;
        if (ft.t >= 1) { ft.state = 'FUELING'; ft.t = 0; }
    } else if (ft.state === 'FUELING') {
        if (heli.fuel < 100) {
            heli.fuel = Math.min(100, heli.fuel + 0.25 * dt);
        } else {
            ft.state = 'ARM_IN'; ft.t = 0;
        }
        if (heli.onboard > 0) {
            G.totalRescued += heli.onboard;
            heli.onboard = 0;
            if (G.totalRescued >= G.goalCount) missionComplete();
            else showMsg(`SECURED: ${G.totalRescued}/${G.goalCount}`);
        }
    } else if (ft.state === 'ARM_IN') {
        ft.t = Math.min(1, ft.t + 0.016 * dt);
        ft.arm = 1 - ft.t;
        if (ft.t >= 1) { ft.state = 'RETURNING'; ft.t = 0; }
    } else if (ft.state === 'RETURNING') {
        if (navigate(ft.parkX, ft.parkY) < 2.0) {
            ft.state = 'PARKED'; ft.t = 0;
        }
    }
}

let _fpsLastTime = 0, _fpsSmooth = 60;
function drawScene() {
    const _now = performance.now();
    const dt = _fpsLastTime > 0 ? Math.min((_now - _fpsLastTime) / (1000 / 60), 3.0) : 1.0;
    if (_fpsLastTime) _fpsSmooth += (1000 / (_now - _fpsLastTime) - _fpsSmooth) * 0.1;
    _fpsLastTime = _now;

    const { rain, night: isNight } = campaignHandler.getCurrentMissionData();
    const _lhObj = getObjectByType('lighthouse');
    const lighthouseX = _lhObj ? _lhObj.x : -1;
    const lighthouseY = _lhObj ? _lhObj.y : -1;
    const { gridSize } = campaignHandler.getTerrain();

    if (!zstate.gameStarted) return;
    if (!zstate.crashed) updatePhysics(dt);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!zstate.introActive) {
        let tx = (G.heli.x - G.heli.y) * (tileW / 2);
        let ty = (G.heli.x + G.heli.y) * (tileH / 2);
        zstate.cam.x += (tx - zstate.cam.x) * 0.1 * dt;
        zstate.cam.y += (ty - zstate.cam.y) * 0.1 * dt;
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

    let rx = zstate.introActive ? G.START_POS.x : G.heli.x;
    let ry = zstate.introActive ? G.START_POS.y : G.heli.y;
    const camX = zstate.cam.x,
        camY = zstate.cam.y;

    let alt = G.heli.z - getGround(G.heli.x, G.heli.y, G.points, G.CARRIER);
    let coneWidth = 0.3 + alt * 0.05;
    let range = 10 + alt * 2.0;
    let intensity = Math.floor(255 * Math.max(0.1, 1.0 - alt / 15));
    // terrain tiles
    for (let x = Math.floor(rx - 14); x < rx + 14; x++) {
        for (let y = Math.floor(ry - 14); y < ry + 14; y++) {
            if (x < 0 || y < 0 || x >= gridSize - 1 || y >= gridSize - 1) continue;
            let h = [G.points[x][y], G.points[x + 1][y], G.points[x + 1][y + 1], G.points[x][y + 1]];
            let p = [
                iso(x, y, h[0], camX, camY, { stepH, tileW, tileH, canvas }),
                iso(x + 1, y, h[1], camX, camY, { stepH, tileW, tileH, canvas }),
                iso(x + 1, y + 1, h[2], camX, camY, { stepH, tileW, tileH, canvas }),
                iso(x, y + 1, h[3], camX, camY, { stepH, tileW, tileH, canvas }),
            ];
            let ang = Math.atan2(y - G.heli.y, x - G.heli.x);
            let diff = ang - G.heli.angle;
            let isPad =
                hasPad() && x >= G.PAD.xMin && x <= G.PAD.xMax && y >= G.PAD.yMin && y <= G.PAD.yMax;
            let c = 35 + Math.floor(h[0] * 15);
            let fill;
            if (isNight) {
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                const dx = x - G.heli.x,
                    dy = y - G.heli.y;
                let inLight = Math.abs(diff) < coneWidth && dx * dx + dy * dy < range * range;

                if (inLight) {
                    if (isPad)
                        fill = `rgb(${intensity - 30},${intensity - 30},${intensity - 30})`; // Pad bleibt grau
                    else if (h[0] > 0)
                        fill = `rgb(${intensity - 20},${intensity + 10},${intensity - 20})`; // Land grünlich
                    else fill = `rgb(0,${Math.floor(intensity * 0.3)},${Math.floor(intensity * 0.6)})`; // Wasser bleibt blau
                } else {
                    fill = '#020205';
                }
            } else {
                fill = isPad ? '#444' : h[0] > 0 ? `rgb(${c - 10},${c + 30},${c - 10})` : '#003d7a';
                if (rain && h[0] < 0) fill = '#002244';
            }
            ctx.fillStyle = fill;
            ctx.beginPath();
            ctx.moveTo(p[0].x, p[0].y);
            ctx.lineTo(p[1].x, p[1].y);
            ctx.lineTo(p[2].x, p[2].y);
            ctx.lineTo(p[3].x, p[3].y);
            ctx.closePath();
            ctx.fill();
        }
    }

    if (hasLighthouse() && isVisible(lighthouseX, lighthouseY)) drawLighthouse(camX, camY);
    if (hasCarrier() && isVisible(G.CARRIER.x, G.CARRIER.y, 25)) drawVectorCarrier(camX, camY);
    drawParkedHelis(camX, camY);
    G.BOATS.forEach(b => {
        if (isVisible(b.x, b.y, 15)) drawSailboat(b.x, b.y, b.angle, camX, camY);
    });
    if (hasPad() && isVisible(G.PAD.xMin + 3, G.PAD.yMin + 3)) drawHangar();
    if (hasPad() && G.fuelTruck && isVisible(G.fuelTruck.x, G.fuelTruck.y, 20))
        drawFuelTruck(G.fuelTruck.x, G.fuelTruck.y, G.fuelTruck.angle, {
            z: G.PAD ? G.PAD.z : 0,
            armExtend: G.fuelTruck.arm,
            armTarget: { x: G.heli.x, y: G.heli.y },
            getFuelingState: () => G.fuelTruck.state === 'FUELING',
        });
    SceneRenderer.flush(camX, camY);
    if (hasPad()) drawPadLights(camX, camY, G.PAD.z, false);
    if (hasPad() && isVisible(G.PAD.xMin, G.PAD.yMin)) drawWindsock(camX, camY);

    // Test-Bäume
    G.TREES_MAP.forEach(t => {
        if (isVisible(t.x, t.y, 14)) drawTree(t.x, t.y, camX, camY, t.s, t.gz, t.type || 'pine', G.wind);
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
        updateDebris(G);
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
            drawPerson(rs.x, rs.y, winchTipZ, 0, false, camX, camY, 'rescuer');
        }

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
            { shadowGetGround: (x, y) => getGround(x, y) }
        );

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

        // minimap
        const ms = 140,
            mp = 20;
        const bx = canvas.width - ms - mp,
            by = canvas.height - ms - mp;
        const sc = ms / gridSize;

        // Hilfsfunktion: liegt Punkt innerhalb der Minimap?
        const inMM = (wx, wy) => {
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

        ctx.restore();
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

    requestAnimationFrame(drawScene);
}


// ─── draw all G.payloads ───────────────────────────────────────────────────────
function drawPayloadObjects(hangingOnly = false, ropeOnly = false) {
    const { night: isNight } = campaignHandler.getCurrentMissionData();
    const { cam } = zstate;

    G.payloads.forEach(payload => {
        if (payload.rescued && !payload.hanging) return;
        if (hangingOnly && !payload.hanging) return;
        if (!hangingOnly && payload.hanging) return;
        if (!payload.hanging && !isVisible(payload.x, payload.y, 15)) return;

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
            drawPerson(payload.x, payload.y, payload.z, 0, !payload.hanging, cam.x, cam.y, undefined, payload.outfitColors);
            if (payload.z < 0) {
                ctx.strokeStyle = '#aaf';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 6, 0, 7);
                ctx.stroke();
            }
        }
    });
}

function drawVectorCarrier(cx, cy) {
    const objX = G.CARRIER.x, objY = G.CARRIER.y;
    const deckZ = G.CARRIER.zDeck;
    const angle = G.CARRIER.angle;
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    function r(rx, ry) { return { x: objX + rx * cosA - ry * sinA, y: objY + rx * sinA + ry * cosA }; }
    function H(p, z) { return { x: p.x, y: p.y, z }; }
    // Pass 1: Hull (flush alone so deck objects always render on top)
    SceneRenderer.add(CARRIER_HULL_DEF, { x: objX, y: objY, z: 0, angle });
    SceneRenderer.flush(cx, cy);

    // Pass 2: Tractors (drawFn) + Tower (depth-sorted together)
    const ix = 2.6, iy = 1.0, iw = 1.5, il = 4.5, ih = 2.5;
    const tractorData = [
        { tx: ix+0.1, ty: iy-1.2, ta: 0,    bc:'#9a7a00', bs:'#c8a000', bd:'#8a6c00', cc:'#b09000', cs:'#e0b800', ct:'#caa800' },
        { tx: ix+0.1, ty: iy-2.4, ta: 0,    bc:'#9a7a00', bs:'#c8a000', bd:'#8a6c00', cc:'#b09000', cs:'#e0b800', ct:'#caa800' },
        { tx: ix+0.1, ty: iy-3.8, ta: 0.25, bc:'#888888', bs:'#dddddd', bd:'#666666', cc:'#aaaaaa', cs:'#ffffff', ct:'#eeeeee' },
    ];
    tractorData.forEach(t => {
        const wx = objX + (t.tx + 0.5) * cosA - (t.ty + 0.35) * sinA;
        const wy = objY + (t.tx + 0.5) * sinA + (t.ty + 0.35) * cosA;
        SceneRenderer.add(null, {
            x: wx, y: wy, z: deckZ,
            drawFn: (cx, cy) => drawTractor(objX, objY, angle, deckZ, cx, cy,
                t.tx, t.ty, t.ta, t.bc, t.bs, t.bd, t.cc, t.cs, t.ct),
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

function drawParkedHelis(cx, cy) {
    if (!hasCarrier()) return;
    const angle = G.CARRIER.angle;
    const deckZ = G.CARRIER.zDeck;
    parkedHelis.forEach((h) => {
        if (!isVisible(G.CARRIER.x, G.CARRIER.y, 25)) return;
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

function drawPadLights(cx, cy, z, isCarrier = false) {
    let blink = Math.floor(Date.now() / 500) % 2 === 0;
    if (isCarrier) {
        let cw = G.CARRIER.w + 1.2,
            cl = G.CARRIER.l + 1.2,
            ang = G.CARRIER.angle;
        function r(rx, ry) {
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

function setLightsOnDeck(lights, blink, cx, cy, z) {
    lights.forEach(l => {
        let p = iso(l.x, l.y, z + 0.05, cx, cy, { stepH, tileW, tileH, canvas });
        ctx.fillStyle = blink ? '#f00' : '#500';
        ctx.beginPath();
        ctx.arc(p.x, p.y, blink ? 3 : 2.5, 0, 7);
        ctx.fill();
    });
}

function drawWindsock(cx, cy) {
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

function drawSailboat(sX, sY, angle, cx, cy) {
    // SAILBOAT_DEF bow faces +x; game convention is bow at -y (angle=0) → offset by -π/2
    SceneRenderer.add(SAILBOAT_DEF, { x: sX, y: sY, z: 0, angle: angle - Math.PI / 2 });
    SceneRenderer.flush(cx, cy);
}


// Beflockung aus Missionsdaten laden
// G.TREES_MAP initialized in G object
const FOLIAGE_DECODE = { p: 'pine', o: 'oak', b: 'bush', d: 'dead' };
function decompressFoliage(str) {
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
    G.TREES_MAP.forEach(t => {
        t.gz = getGround(t.x, t.y, G.points, G.CARRIER);
    });
}

function drawLighthouse(cx, cy) {
    const _lhObj = getObjectByType('lighthouse');
    if (!_lhObj) return;
    const lhX = _lhObj.x, lhY = _lhObj.y;
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
    const { rain } = campaignHandler.getCurrentMissionData();
    if (!rain) return;
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
        let el = document.getElementById('flash-overlay');
        el.style.opacity = 0.8;
        setTimeout(() => (el.style.opacity = 0), 100);
    }
}

// ─── person ──────────────────────────────────────────────────────────────────
function rotatePoint(x, y, rad) {
    return { x: x * Math.cos(rad) - y * Math.sin(rad), y: x * Math.sin(rad) + y * Math.cos(rad) };
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
function drawCollisionBox(wX, wY, angle, oxMin, oxMax, oyMin, oyMax, ozMin, ozMax, color) {
    const camX = zstate.cam.x,
        camY = zstate.cam.y;
    const cosA = Math.cos(angle),
        sinA = Math.sin(angle);
    function wp(lx, ly, lz) {
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
function checkCollisionBox(px, py, pz, wX, wY, angle, oxMin, oxMax, oyMin, oyMax, ozMin, ozMax) {
    const dx = px - wX,
        dy = py - wY;
    const cosA = Math.cos(-angle),
        sinA = Math.sin(-angle);
    const lx = dx * cosA - dy * sinA;
    const ly = dx * sinA + dy * cosA;
    return lx >= oxMin && lx <= oxMax && ly >= oyMin && ly <= oyMax && pz >= ozMin && pz <= ozMax;
}

// Draw all collision boxes and check G.heli collisions (called from drawScene).
function drawDebugOverlay(camX, camY) {
    const OPT = { stepH, tileW, tileH, canvas };

    function isoP(wx, wy, wz = 0) {
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
    function drawArrow(fromP, toP, color, label) {
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
        const hc = [
            isoP(hX, hY, p.z),
            isoP(hX + 4, hY, p.z),
            isoP(hX + 4, hY + 2, p.z),
            isoP(hX, hY + 2, p.z),
        ];
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
        if (ft.targetX != null) {
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
    ctx.fillText(
        `HELI x=${hx.toFixed(1)} y=${hy.toFixed(1)} z=${G.heli.z.toFixed(2)}`,
        heliP.x - 40,
        heliP.y - 50
    );
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
        if (showCollisionBoxes)
            drawCollisionBox(cx, cy, ca, -4.2, 4.2, -8.7, 8.7, 0, deckZ, 'rgba(0,200,255,0.8)');

        // Tower: ix=2.6(rx), iy=1.0(ry), iw=1.5, il=4.5, ih=2.5
        if (showCollisionBoxes)
            drawCollisionBox(cx, cy, ca, 2.6, 4.1, 1.0, 5.5, deckZ, deckZ + 2.5, 'rgba(255,80,0,0.9)');

        // Tower-Kollision – nur wenn Heli in der Luft ist
        if (!zstate.introActive && !zstate.crashed && G.heli.inAir) {
            if (
                checkCollisionBox(
                    G.heli.x,
                    G.heli.y,
                    G.heli.z,
                    cx,
                    cy,
                    ca,
                    2.6,
                    4.1,
                    1.0,
                    5.5,
                    deckZ,
                    deckZ + 2.5
                )
            ) {
                triggerCrash(I18N.CRASH_CARRIER_TOWER);
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
                    triggerCrash(I18N.CRASH_PARKED_HELI);
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
        if (showCollisionBoxes)
            drawCollisionBox(hmx, hmy, 0, -2, 2, -1, 1, hZ, hZ + 1.8, 'rgba(255,80,0,0.9)');
        if (!zstate.introActive && !zstate.crashed && G.heli.inAir) {
            if (checkCollisionBox(G.heli.x, G.heli.y, G.heli.z, hmx, hmy, 0, -2, 2, -1, 1, hZ, hZ + 1.8)) {
                triggerCrash(I18N.CRASH_HANGAR);
            }
        }
    }

    // ── Fuel Truck ───────────────────────────────────────────────────────────────
    if (hasPad() && G.fuelTruck.state !== 'PARKED') {
        const ft = G.fuelTruck;
        const fZ = G.PAD.z;
        if (showCollisionBoxes)
            drawCollisionBox(
                ft.x,
                ft.y,
                ft.angle,
                0,
                2.2,
                -0.45,
                0.45,
                fZ,
                fZ + 0.9,
                'rgba(255,200,0,0.8)'
            );
        if (!zstate.introActive && !zstate.crashed && G.heli.inAir) {
            if (
                checkCollisionBox(
                    G.heli.x,
                    G.heli.y,
                    G.heli.z,
                    ft.x,
                    ft.y,
                    ft.angle,
                    0,
                    2.2,
                    -0.45,
                    0.45,
                    fZ,
                    fZ + 0.9
                )
            ) {
                triggerCrash(I18N.CRASH_FUEL_TRUCK);
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
                if (
                    checkCollisionBox(
                        G.heli.x,
                        G.heli.y,
                        G.heli.z,
                        lh.x,
                        lh.y,
                        0,
                        -1.0,
                        1.0,
                        -1.0,
                        1.0,
                        0.4,
                        8.5
                    )
                ) {
                    triggerCrash(I18N.CRASH_LIGHTHOUSE);
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
                checkCollisionBox(
                    G.heli.x,
                    G.heli.y,
                    G.heli.z,
                    b.x,
                    b.y,
                    b.angle,
                    -1.1,
                    1.3,
                    -0.45,
                    0.45,
                    0,
                    0.35
                ) ||
                checkCollisionBox(
                    G.heli.x,
                    G.heli.y,
                    G.heli.z,
                    b.x,
                    b.y,
                    b.angle,
                    -0.4,
                    -0.2,
                    -0.1,
                    0.1,
                    0.35,
                    3.2
                )
            ) {
                triggerCrash(I18N.CRASH_BOAT);
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
        G.TREES_MAP.forEach(t => {
            if (!isVisible(t.x, t.y, 16)) return;
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
        G.TREES_MAP.forEach(t => {
            if (!isVisible(t.x, t.y, 16)) return;
            const r = 0.35 * t.s;
            const h = 2.3 * t.s;
            if (
                checkCollisionBox(G.heli.x, G.heli.y, G.heli.z, t.x, t.y, 0, -r, r, -r, r, t.gz, t.gz + h)
            ) {
                triggerCrash(I18N.CRASH_TREE);
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
    ['splash','campaign-select','heli-select','heli-info','credits-screen'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    document.getElementById('main-menu').style.display = 'flex';
    soundHandler.play(musicConfig.mainMenu || 'maintheme', true);
    animMainMenuBg();
    startMenuParticles();
}

function backFromHeliSelect() {
    document.getElementById('heli-select').style.display = 'none';
    toCampaignSelect();
}

buildHeliSelect('normal'); // initial build for splash screen background

window.onkeydown = e => (G.keys[e.code] = true);
window.onkeyup = e => (G.keys[e.code] = false);
document.addEventListener('selectstart', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());
window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};
window.onresize();

const _touchEl = document.getElementById('touch-controls') as HTMLElement | null;
const _isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const setTouchVisible = (v: boolean) => {
    if (!_touchEl) return;
    _touchEl.style.display = (v && _isTouchDevice()) ? 'flex' : 'none';
};

const _setupJoystick = (id: string, up: string, down: string, left: string, right: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const knob = el.querySelector('.joystick-knob') as HTMLElement;
    const keys = [up, down, left, right];
    let active = false, cx = 0, cy = 0, jr = 0;
    const setKeys = (dx: number, dy: number) => {
        const dead = jr * 0.18;
        (G.keys as Record<string, boolean>)[up]    = dy < -dead;
        (G.keys as Record<string, boolean>)[down]  = dy >  dead;
        (G.keys as Record<string, boolean>)[left]  = dx < -dead;
        (G.keys as Record<string, boolean>)[right] = dx >  dead;
    };
    el.addEventListener('pointerdown', e => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        const r = el.getBoundingClientRect();
        cx = r.left + r.width / 2;
        cy = r.top  + r.height / 2;
        jr = r.width / 2;
        active = true;
        knob.style.transition = 'none';
    });
    el.addEventListener('pointermove', e => {
        if (!active) return;
        const dx = e.clientX - cx, dy = e.clientY - cy;
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
        keys.forEach(k => { (G.keys as Record<string, boolean>)[k] = false; });
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
};

const setupTouchControls = () => {
    if (!_isTouchDevice()) return;
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
    _setupJoystick('joystick-left',  'KeyW', 'KeyS', 'KeyA', 'KeyD');
    _setupJoystick('joystick-right', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight');
};

window.onload = () => {
    zinit();
    setupTouchControls();
    startMenuParticles();
    document.addEventListener('pointerdown', () => soundHandler.play(musicConfig.mainMenu || 'maintheme', true), { once: true });
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
window.dismissBriefing = dismissBriefing;
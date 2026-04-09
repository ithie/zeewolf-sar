// ─── Multiplayer demo mission ─────────────────────────────────────────────────
// "Insel-Rettung" – a small island in the center of the map.
// Carrier circles the island (radius 25, center ~40,40).
// PAD on the island for player 2's spawn.
// 3 survivors + 1 crate to rescue before the countdown expires.
//
// Terrain: gridSize=80, island centered at (40,40), radius~9, peak height 3.5
// Generated with compressTerrain using a (1 - d/r)^2 * 35 bump.

import type { CampaignExport } from '@/shared/types';

// Island at (40,40) radius 9 peak 3.5 + corner platform at (8,8) radius 9 peak 0.5.
// PAD (x:5,y:5) sits on the corner platform; carrier can't reach it (radius 25 < dist ~49).
const TERRAIN =
    '0x4,1x9,0x71,1x11,0x69,1x3,2x7,1x3,0x67,1x3,2x3,3x3,2x3,1x3,0x65,1x3,2x2,3x2,4x2,5,4x2,' +
    '3x2,2x2,1x2,0x64,1x2,2x2,3,4,5x5,4,3,2x2,1x2,0x64,1x2,2,3x2,4,5x5,4,3x2,2,1x2,0x64,1x2,' +
    '2,3x2,5x7,3x2,2,1x2,0x64,1x2,2,3x2,4,5x5,4,3x2,2,1x2,0x64,1x2,2x2,3,4,5x5,4,3,2x2,1x2,' +
    '0x64,1x2,2x2,3x2,4x2,5,4x2,3x2,2x2,1x2,0x64,1x3,2x2,3x7,2x2,1x3,0x65,1x3,2x3,3x3,2x3,1x3,' +
    '0x67,1x3,2x7,1x3,0x69,1x11,0x71,1x9,0x1401,1x2,2x3,1x2,0x72,1x2,2,3,4x3,3,2,1x2,0x69,1,2,' +
    '3,4,6,7x3,6,4,3,2,1,0x68,1,3,5,7,9,10,11,10,9,7,5,3,1,0x67,1,2,4,7,10,13,15,16,15,13,10,7,' +
    '4,2,1,0x66,1,3,6,9,13,16,20,21,20,16,13,9,6,3,1,0x66,2,4,7,10,15,20,25,28,25,20,15,10,7,4,' +
    '2,0x66,2,4,7,11,16,21,28,35,28,21,16,11,7,4,2,0x66,2,4,7,10,15,20,25,28,25,20,15,10,7,4,2,' +
    '0x66,1,3,6,9,13,16,20,21,20,16,13,9,6,3,1,0x66,1,2,4,7,10,13,15,16,15,13,10,7,4,2,1,0x67,1,' +
    '3,5,7,9,10,11,10,9,7,5,3,1,0x68,1,2,3,4,6,7x3,6,4,3,2,1,0x69,1x2,2,3,4x3,3,2,1x2,0x72,1x2,' +
    '2x3,1x2,0x2710';

/** Index of the MP campaign in the campaigns array (must match main.ts) */
export const MP_CAMPAIGN_INDEX = 5;

/** Countdown duration in seconds */
export const MP_COUNTDOWN_SEC = 300;

/** PAD position used for guest spawn (corner platform, far from carrier path) */
export const MP_PAD = { x: 5, y: 5 };

export const MP_DEMO_CAMPAIGN: CampaignExport = {
    type: 'multiplayer',
    campaignTitle: 'MULTIPLAYER',
    campaignSublines: ['KOOP-EINSATZ', 'INSEL-RETTUNG'],
    music: { ingame: 'clike' },
    levels: [
        {
            headline: 'INSEL-RETTUNG',
            sublines: ['KOOP-EINSATZ', '5:00 MIN'],
            briefing:
                'Drei Überlebende und eine Frachtkiste auf der Insel in der Kartenmitte. ' +
                'Host startet auf dem Träger, der die Insel umkreist. ' +
                'Der zweite Pilot startet auf dem Landeplatz in der Ecke. ' +
                'Rettet alle vor Ablauf der Zeit.',
            gridSize: 80,
            terrain: TERRAIN,
            // Host spawns on carrier; guest spawn is overridden after launch
            spawnObject: 'carrier',
            objectives: [{ type: 'rescue_all' }],
            objects: [
                {
                    type: 'carrier',
                    x: 65,
                    y: 40,
                    angle: 90,
                    path: 'circle',
                    speed: 4,
                    radius: 25,
                },
                { type: 'pad', x: MP_PAD.x, y: MP_PAD.y },
            ],
            payloads: [
                { type: 'person', x: 34, y: 40 },
                { type: 'person', x: 46, y: 37 },
                { type: 'person', x: 40, y: 47 },
                { type: 'crate',  x: 44, y: 44 },
            ],
            foliage: 'p340,385,9|p415,390,11|p385,425,8|p435,370,10|p370,430,9|p360,405,7',
            rain: false,
            night: false,
            windDir: 45,
            windStr: 2,
            windVar: true,
        },
    ],
};

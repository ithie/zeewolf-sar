import { Mission } from '../shared/types';

// ── Object Types ─────────────────────────────────────────────────────────────
export type PadObject = { type: 'pad'; x: number; y: number };
export type CarrierObject = {
    type: 'carrier';
    x: number;
    y: number;
    angle: number;
    path: 'circle' | 'straight' | 'static';
    speed: number;
    radius: number;
};
export type BoatObject = {
    type: 'boat';
    x: number;
    y: number;
    angle: number;
    path: 'circle' | 'straight' | 'static';
    speed: number;
    radius: number;
};
export type LighthouseObject = { type: 'lighthouse'; x: number; y: number };

export type MissionObject = PadObject | CarrierObject | BoatObject | LighthouseObject;

// ── Mission type with objects array ──────────────────────────────────────────
export interface MissionV2 extends Omit<
    Mission,
    | 'padX'
    | 'padY'
    | 'carrierX'
    | 'carrierY'
    | 'carrierAngle'
    | 'carrierPath'
    | 'carrierSpeed'
    | 'carrierRadius'
    | 'lighthouseX'
    | 'lighthouseY'
    | 'spawnPoint'
> {
    objects: MissionObject[];
    spawnObject: 'pad' | 'carrier'; // which object type is the spawn
}

export const createEmptyMission = (name = 'Mission Alpha'): MissionV2 => {
    const gs = 100;
    const grid: number[][] = [];
    for (let x = 0; x <= gs; x++) {
        grid[x] = [];
        for (let y = 0; y <= gs; y++) grid[x][y] = -1;
    }
    return {
        headline: name,
        briefing: 'Befehle für diese Mission hier eintragen...',
        gridSize: gs,
        terrain: grid,
        objects: [{ type: 'pad', x: 10, y: 10 }],
        spawnObject: 'pad',
        payloads: [],
        rain: false,
        night: false,
        windDir: 45,
        windStr: 1.0,
        windVar: false,
    };
};

// ── Helper accessors (null-safe) ──────────────────────────────────────────────
export const getPad = (m: MissionV2): PadObject | null => (m.objects.find(o => o.type === 'pad') as PadObject) ?? null;

export const getCarrier = (m: MissionV2): CarrierObject | null =>
    (m.objects.find(o => o.type === 'carrier') as CarrierObject) ?? null;

export const getBoats = (m: MissionV2): BoatObject[] => m.objects.filter(o => o.type === 'boat') as BoatObject[];

export const getLighthouse = (m: MissionV2): LighthouseObject | null =>
    (m.objects.find(o => o.type === 'lighthouse') as LighthouseObject) ?? null;

// ── Migration: old flat-field mission → MissionV2 ────────────────────────────
export const migrateMission = (raw: any): MissionV2 => {
    // Already new format
    if (Array.isArray(raw.objects)) return raw as MissionV2;

    const objects: MissionObject[] = [];

    if (raw.padX >= 0 && raw.padY >= 0) objects.push({ type: 'pad', x: raw.padX, y: raw.padY });

    if (raw.carrierX >= 0 && raw.carrierY >= 0)
        objects.push({
            type: 'carrier',
            x: raw.carrierX,
            y: raw.carrierY,
            angle: raw.carrierAngle ?? 0,
            path: raw.carrierPath ?? 'static',
            speed: raw.carrierSpeed ?? 0,
            radius: raw.carrierRadius ?? 40,
        });

    if (raw.lighthouseX >= 0 && raw.lighthouseY >= 0)
        objects.push({ type: 'lighthouse', x: raw.lighthouseX, y: raw.lighthouseY });

    const {
        padX,
        padY,
        carrierX,
        carrierY,
        carrierAngle,
        carrierPath,
        carrierSpeed,
        carrierRadius,
        lighthouseX,
        lighthouseY,
        spawnPoint,
        ...rest
    } = raw;

    return {
        ...rest,
        objects,
        spawnObject: spawnPoint === 'carrier' ? 'carrier' : 'pad',
        payloads: raw.payloads ?? [],
    };
};

// ── Editor state ──────────────────────────────────────────────────────────────
export const state = {
    type: '',
    campaign: [createEmptyMission()] as MissionV2[],
    curIdx: 0,

    zoom: 1.0,
    panX: 0,
    panY: 0,

    prevZoom: 1.0,
    prevPanX: 0,
    prevPanY: 0,

    currentTool: 'terrain',
    brushRadius: 1.5,
    isCustomBrush: false,
    selectedUI: null as string | null,
    selectedObjectIdx: null as number | null, // index in m.objects for focused object
    selectedPayloadIdx: null as number | null, // index in m.payloads for focused payload
    moveMode: false, // M-Taste: nächster Klick verschiebt selektiertes Objekt

    payloadBrushType: null as 'person' | 'crate' | null,

    isDrawing: false,
    isEditorDragging: false,
    isPrevDragging: false,
    lastMX: 0,
    lastMY: 0,
};

export const getCurrentMission = (): MissionV2 | undefined => state.campaign[state.curIdx];

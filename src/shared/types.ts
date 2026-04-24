/** Text field that can be a plain string (legacy) or a { de, en } object. */
export type LocalizedString = string | { de: string; en?: string };

type PadObject = { type: 'pad'; x: number; y: number };
type CarrierObject = {
    type: 'carrier';
    x: number;
    y: number;
    angle: number;
    path: 'circle' | 'straight' | 'static';
    speed: number;
    radius: number;
};
type BoatObject = {
    type: 'boat';
    x: number;
    y: number;
    angle: number;
    path: 'circle' | 'straight' | 'static';
    speed: number;
    radius: number;
};
type SubmarineObject = {
    type: 'submarine';
    x: number;
    y: number;
    angle: number;
    path: 'circle' | 'straight' | 'static';
    speed: number;
    radius: number;
};
type LighthouseObject = { type: 'lighthouse'; x: number; y: number };

type MissionObject = PadObject | CarrierObject | BoatObject | SubmarineObject | LighthouseObject;

export type Objective =
    | { type: 'rescue_all' }
    | { type: 'land_at'; target: 'pad' | 'carrier' | 'boat' };

export type MissionPayload = {
    type: 'person' | 'crate';
    x: number;
    y: number;
    attachTo?: { objectType: 'carrier' | 'boat' | 'submarine'; objectIdx: number; localX?: number; localY?: number };
    npcTarget?: boolean;
};

export interface Mission {
    headline: LocalizedString;
    sublines?: LocalizedString[];
    briefing: LocalizedString;
    previewBase64?: string;
    gridSize: number;
    terrain: number[][];

    spawnObject: 'pad' | 'carrier';
    objectives: Objective[];
    objects: MissionObject[];
    payloads: MissionPayload[];
    foliage: { x: number; y: number; s: number; type: string }[];

    rain: boolean;
    night: boolean;
    windDir: number;
    windStr: number;
    windVar: boolean;
}

export type MissionData = Omit<Mission, 'terrain' | 'foliage'> & {
    terrain: string;
    gridSize: number;
    foliage: string | { x: number; y: number; s: number; type: string }[];
    campaignType: string;
};

export interface CampaignExport {
    type: string;
    campaignTitle: LocalizedString;
    campaignSublines: LocalizedString[];
    music?: { briefing?: string; ingame?: string };
    levels: (Omit<Mission, 'terrain' | 'foliage'> & {
        terrain: string;
        gridSize: number;
        foliage: string | { x: number; y: number; s: number; type: string }[];
    })[];
}

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

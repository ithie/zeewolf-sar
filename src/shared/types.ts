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
type LighthouseObject = { type: 'lighthouse'; x: number; y: number };

type MissionObject = PadObject | CarrierObject | BoatObject | LighthouseObject;

export type Objective =
    | { type: 'rescue_all' }
    | { type: 'land_at'; target: 'pad' | 'carrier' | 'boat' };

export interface Mission {
    headline: string;
    briefing: string;
    gridSize: number;
    terrain: number[][];

    spawnObject: 'pad' | 'carrier';
    objectives: Objective[];
    objects: MissionObject[];
    payloads: { type: 'person' | 'crate'; x: number; y: number }[];
    foliage: { x: number; y: number; s: number; type: string }[];

    rain: boolean;
    night: boolean;
    windDir: number;
    windStr: number;
    windVar: boolean;
}

export interface CampaignExport {
    type: string;
    campaignTitle: string;
    campaignSublines: string[];
    music?: { briefing?: string; ingame?: string };
    levels: Omit<Mission, 'terrain'> & { terrain: string; gridSize: number }[];
}

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface Mission {
    headline: string;
    briefing: string;
    gridSize: number;
    terrain: number[][];

    padX: number;
    padY: number;
    carrierX: number;
    carrierY: number;
    carrierAngle: number;
    lighthouseX: number;
    lighthouseY: number;

    carrierPath: 'static' | 'straight' | 'circle';
    carrierSpeed: number;
    carrierRadius: number;

    spawnPoint: 'pad' | 'carrier';
    goalPersons: number;
    goalCrates: number;

    rain: boolean;
    night: boolean;
    windDir: number;
    windStr: number;
    windVar: boolean;
}

export interface CampaignExport {
    type: 'ZEEWOLF_CAMPAIGN';
    campaignTitle: string;
    campaignSublines: string[];
    levels: Omit<Mission, 'terrain'> & { terrain: string }[];
}

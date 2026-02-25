import { Mission } from '../shared/types';

export const createEmptyMission = (name = 'Mission Alpha'): Mission => {
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
        padX: 10,
        padY: 10,
        carrierX: -1,
        carrierY: -1,
        carrierAngle: 0,
        carrierPath: 'static',
        carrierSpeed: 0,
        carrierRadius: 40,
        lighthouseX: -1,
        lighthouseY: -1,
        spawnPoint: 'pad',
        goalPersons: 5,
        goalCrates: 0,
        rain: false,
        night: false,
        windDir: 45,
        windStr: 1.0,
        windVar: false,
    };
};

export const state = {
    type: '',
    campaign: [createEmptyMission()] as Mission[],
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

    isDrawing: false,
    isEditorDragging: false,
    isPrevDragging: false,
    lastMX: 0,
    lastMY: 0,
};

export const getCurrentMission = (): Mission | undefined => {
    return state.campaign[state.curIdx];
};

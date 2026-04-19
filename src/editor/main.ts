import './style.css';
import { initUI, loadMission, syncToData, renderPayloadList, renderObjectList, renderFoliageList } from './ui';
import { state, getCurrentMission } from './state';
import { compressTerrain, compressFoliage, decompressFoliage } from '../shared/utils';

const initEditor = () => {
    initUI();
    loadMission(0);

    // Expose bridge for the Electron workbench (same-origin iframe access)
    (window as any).__editor = { state, getCurrentMission, loadMission, syncToData, renderPayloadList, renderObjectList, renderFoliageList };
    (window as any).__editorUtils = { compressTerrain, compressFoliage, decompressFoliage };
};

initEditor();

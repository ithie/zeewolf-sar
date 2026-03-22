import './style.css';
import { initUI, loadMission, syncToData, renderPayloadList, renderObjectList, renderFoliageList } from './ui';
import { state, getCurrentMission } from './state';

const initEditor = () => {
    initUI();
    loadMission(0);

    // Expose bridge for the Electron workbench (same-origin iframe access)
    (window as any).__editor = { state, getCurrentMission, loadMission, syncToData, renderPayloadList, renderObjectList, renderFoliageList };
};

initEditor();

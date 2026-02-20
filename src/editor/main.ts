import './style.css';
import { initUI, loadMission } from './ui';

const initEditor = () => {
    initUI();

    loadMission(0);
};

initEditor();

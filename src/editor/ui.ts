import { state, createEmptyMission, getCurrentMission } from './state';
import { drawMap, drawPreview } from './render';
import { compressTerrain, decompressTerrain } from '../shared/utils';

const getEl = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const getInput = (id: string) => getEl<HTMLInputElement>(id);

export const syncToData = () => {
    const m = getCurrentMission();
    if (!m) return;

    m.headline = getInput('m_headline').value;
    m.briefing = getEl<HTMLTextAreaElement>('m_briefing').value;
    m.goalPersons = parseInt(getInput('m_persons').value) || 0;
    m.goalCrates = parseInt(getInput('m_crates').value) || 0;
    m.rain = getInput('m_rain').checked;
    m.night = getInput('m_night').checked;
    m.windDir = parseInt(getInput('m_wind_dir').value) || 0;
    m.windStr = parseFloat(getInput('m_wind_str').value) || 0;
    m.windVar = getInput('m_wind_var').checked;
    m.carrierPath = getEl<HTMLSelectElement>('m_carrier_path').value as any;
    m.carrierSpeed = parseFloat(getInput('m_carrier_speed').value) || 0;
    m.carrierRadius = parseFloat(getInput('m_carrier_radius').value) || 40;
    m.carrierAngle = parseInt(getInput('m_carrier_angle').value) || 0;
    m.gridSize = parseInt(getInput('m_grid_size').value) || 100;

    renderMissionList();
    drawMap();
    drawPreview();
};

export const loadMission = (idx: number) => {
    state.curIdx = idx;
    const m = getCurrentMission();
    if (!m) return;

    getInput('m_headline').value = m.headline;
    getEl<HTMLTextAreaElement>('m_briefing').value = m.briefing || '';
    getInput('m_grid_size').value = m.gridSize.toString();
    getInput('m_persons').value = m.goalPersons.toString();
    getInput('m_crates').value = m.goalCrates.toString();
    getInput('m_rain').checked = m.rain;
    getInput('m_night').checked = m.night;
    getInput('m_wind_dir').value = m.windDir.toString();
    getInput('m_wind_str').value = m.windStr.toString();
    getInput('m_wind_var').checked = m.windVar;
    getEl<HTMLSelectElement>('m_carrier_path').value = m.carrierPath;
    getInput('m_carrier_speed').value = m.carrierSpeed.toString();
    getInput('m_carrier_radius').value = m.carrierRadius.toString();
    getInput('m_carrier_angle').value = m.carrierAngle.toString();

    state.selectedUI = null;
    renderMissionList();
    drawMap();
    drawPreview();
};

const renderMissionList = () => {
    const container = getEl('mission-list');
    container.innerHTML = '';

    state.campaign.forEach((m, i) => {
        const div = document.createElement('div');
        div.className = 'mission-item' + (i === state.curIdx ? ' active' : '');

        const span = document.createElement('span');
        span.innerText = `${i + 1}. ${m.headline.substring(0, 18)}`;

        const controls = document.createElement('div');
        controls.className = 'm-controls';

        const btnUp = document.createElement('button');
        btnUp.innerText = '↑';
        btnUp.onclick = e => {
            e.stopPropagation();
            moveM(i, -1);
        };

        const btnDown = document.createElement('button');
        btnDown.innerText = '↓';
        btnDown.onclick = e => {
            e.stopPropagation();
            moveM(i, 1);
        };

        const btnDel = document.createElement('button');
        btnDel.innerText = 'X';
        btnDel.style.background = '#822';
        btnDel.onclick = e => {
            e.stopPropagation();
            delM(i);
        };

        controls.append(btnUp, btnDown, btnDel);
        div.append(span, controls);
        div.onclick = () => loadMission(i);
        container.appendChild(div);
    });
};

const moveM = (i: number, dir: number) => {
    if (i + dir < 0 || i + dir >= state.campaign.length) return;
    const temp = state.campaign[i];
    state.campaign[i] = state.campaign[i + dir];
    state.campaign[i + dir] = temp;
    loadMission(i + dir);
};

const delM = (i: number) => {
    if (state.campaign.length <= 1) return;
    if (confirm('Mission wirklich löschen?')) {
        state.campaign.splice(i, 1);
        loadMission(Math.max(0, i - 1));
    }
};

const clampCamera = () => {
    const m = getCurrentMission();
    if (!m) return;
    const tSize = (600 / m.gridSize) * state.zoom;
    const viewGridW = 600 / tSize;
    const viewGridH = 600 / tSize;
    state.panX = Math.max(0, Math.min(state.panX, m.gridSize - viewGridW));
    state.panY = Math.max(0, Math.min(state.panY, m.gridSize - viewGridH));
    if (viewGridW >= m.gridSize) state.panX = 0;
    if (viewGridH >= m.gridSize) state.panY = 0;
};

const paint = (e: MouseEvent) => {
    const m = getCurrentMission();
    if (!m) return;
    const canvas = getEl<HTMLCanvasElement>('editorCanvas');
    const rect = canvas.getBoundingClientRect();
    const tSize = (600 / m.gridSize) * state.zoom;
    const gx = Math.floor((e.clientX - rect.left) / tSize + state.panX);
    const gy = Math.floor((e.clientY - rect.top) / tSize + state.panY);

    if (gx < 0 || gx >= m.gridSize || gy < 0 || gy >= m.gridSize) return;

    if (state.currentTool === 'terrain') {
        const rad = Math.ceil(state.brushRadius);

        // Ziel-Höhe festlegen. Beim Linksklick bauen wir einen Berg (z.B. Höhe 15),
        // mit Shift (Senken) graben wir ein Loch (z.B. Höhe -1).
        const targetHeight = e.shiftKey ? -1.0 : 10.0;

        const strength = 0.05;

        for (let dx = -rad; dx <= rad; dx++) {
            for (let dy = -rad; dy <= rad; dy++) {
                const dist = Math.hypot(dx, dy);
                const nx = gx + dx;
                const ny = gy + dy;

                if (dist <= state.brushRadius && m.terrain[nx] && m.terrain[nx][ny] !== undefined) {
                    // Cosinus-Falloff: Innen = 1.0 (volle Kraft), Rand = 0.0 (keine Kraft)
                    const falloff = (Math.cos((dist / state.brushRadius) * Math.PI) + 1) / 2;

                    const currentH = m.terrain[nx][ny];

                    // Lerp-Formel: Aktuelle Höhe + (Zielhöhe - Aktuelle Höhe) * Stärke * Pinsel-Weichheit
                    let newH = currentH + (targetHeight - currentH) * strength * falloff;

                    // Grenzen einhalten (-1 bis 15) und auf 2 Nachkommastellen runden
                    newH = Math.max(-1, Math.min(15, newH));
                    m.terrain[nx][ny] = Math.round(newH * 100) / 100;
                }
            }
        }
    } else if (state.currentTool === 'flatten') {
        const h = e.shiftKey ? -1 : 0.25;
        const rad = Math.ceil(state.brushRadius);
        for (let dx = -rad; dx <= rad; dx++) {
            for (let dy = -rad; dy <= rad; dy++) {
                if (Math.hypot(dx, dy) <= state.brushRadius && m.terrain[gx + dx]) {
                    m.terrain[gx + dx][gy + dy] = h;
                }
            }
        }
    } else if (state.currentTool === 'pad') {
        if (e.shiftKey) {
            m.padX = -1;
            m.padY = -1;
        } else {
            m.padX = gx;
            m.padY = gy;
        }
    } else if (state.currentTool === 'carrier') {
        if (e.shiftKey) {
            m.carrierX = -1;
            m.carrierY = -1;
        } else {
            m.carrierX = gx;
            m.carrierY = gy;
        }
    } else if (state.currentTool === 'lighthouse') {
        if (e.shiftKey) {
            m.lighthouseX = -1;
            m.lighthouseY = -1;
        } else {
            m.lighthouseX = gx;
            m.lighthouseY = gy;
        }
    }
    drawMap();
};

export const initUI = () => {
    getEl('btn-add-mission').onclick = () => {
        state.campaign.push(createEmptyMission());
        loadMission(state.campaign.length - 1);
    };
    getEl('btn-copy-mission').onclick = () => {
        const copy = JSON.parse(JSON.stringify(getCurrentMission()!));
        copy.headline += ' (Kopie)';
        state.campaign.push(copy);
        loadMission(state.campaign.length - 1);
    };

    document.querySelectorAll('input[name="tool"]').forEach(el => {
        (el as HTMLInputElement).onchange = e => {
            state.currentTool = (e.target as HTMLInputElement).value;
            getEl('editorCanvas').style.cursor = state.currentTool === 'move' ? 'grab' : 'crosshair';
        };
    });

    document.querySelectorAll('input[name="brush"]').forEach(el => {
        (el as HTMLInputElement).onchange = e => {
            const val = (e.target as HTMLInputElement).value;
            if (val === 'custom') {
                state.isCustomBrush = true;
                state.brushRadius = parseFloat(getInput('m_custom_brush').value) || 8;
            } else {
                state.isCustomBrush = false;
                state.brushRadius = parseFloat(val);
            }
        };
    });

    getInput('m_custom_brush').oninput = () => {
        if (state.isCustomBrush) state.brushRadius = parseFloat(getInput('m_custom_brush').value) || 8;
    };

    getEl('btn-zoom-in').onclick = () => {
        state.zoom = Math.min(15.0, state.zoom + 0.5);
        clampCamera();
        drawMap();
    };
    getEl('btn-zoom-out').onclick = () => {
        state.zoom = Math.max(1.0, state.zoom - 0.5);
        clampCamera();
        drawMap();
    };

    getEl('btn-resize-map').onclick = () => {
        const m = getCurrentMission();
        if (!m) return;
        const newSize = parseInt(getInput('m_grid_size').value);
        const oldT = m.terrain;
        m.terrain = Array.from({ length: newSize + 1 }, (_, x) =>
            Array.from({ length: newSize + 1 }, (_, y) => (x <= m.gridSize && y <= m.gridSize ? oldT[x][y] : -1))
        );
        m.gridSize = newSize;
        clampCamera();
        drawMap();
        drawPreview();
    };

    getEl('close-wind').onclick = () => {
        state.selectedUI = null;
        drawMap();
    };
    getEl('close-carrier').onclick = () => {
        state.selectedUI = null;
        drawMap();
    };
    getEl('close-pad').onclick = () => {
        state.selectedUI = null;
        drawMap();
    };

    getEl('btn_spawn_pad').onclick = () => {
        getCurrentMission()!.spawnPoint = 'pad';
        drawMap();
    };
    getEl('btn_spawn_carrier').onclick = () => {
        getCurrentMission()!.spawnPoint = 'carrier';
        drawMap();
    };

    const syncIds = [
        'm_headline',
        'm_briefing',
        'm_persons',
        'm_crates',
        'm_rain',
        'm_night',
        'm_wind_dir',
        'm_wind_str',
        'm_wind_var',
        'm_carrier_path',
        'm_carrier_speed',
        'm_carrier_radius',
        'm_carrier_angle',
    ];
    syncIds.forEach(id => getEl(id).addEventListener('input', syncToData));

    const canvas = getEl<HTMLCanvasElement>('editorCanvas');
    canvas.onmousedown = e => {
        const rect = canvas.getBoundingClientRect();
        const m = getCurrentMission()!;
        const tSize = (600 / m.gridSize) * state.zoom;
        const mx = e.clientX - rect.left,
            my = e.clientY - rect.top;
        const gx = mx / tSize + state.panX,
            gy = my / tSize + state.panY;

        if (Math.hypot(mx - 50, my - 50) < 30) {
            state.selectedUI = state.selectedUI === 'wind' ? null : 'wind';
            drawMap();
            return;
        }
        if (m.padX >= 0 && gx >= m.padX && gx <= m.padX + 8 && gy >= m.padY && gy <= m.padY + 8 && !e.shiftKey) {
            state.selectedUI = state.selectedUI === 'pad' ? null : 'pad';
            drawMap();
            return;
        }
        if (m.carrierX >= 0 && Math.hypot(gx - m.carrierX, gy - m.carrierY) < 6 && !e.shiftKey) {
            state.selectedUI = state.selectedUI === 'carrier' ? null : 'carrier';
            drawMap();
            return;
        }

        state.selectedUI = null;
        drawMap();
        if (state.currentTool === 'move') {
            state.isEditorDragging = true;
            state.lastMX = e.clientX;
            state.lastMY = e.clientY;
            canvas.style.cursor = 'grabbing';
        } else {
            state.isDrawing = true;
            paint(e);
        }
    };

    window.addEventListener('mousemove', e => {
        if (state.isEditorDragging) {
            const tSize = (600 / getCurrentMission()!.gridSize) * state.zoom;
            state.panX -= (e.clientX - state.lastMX) / tSize;
            state.panY -= (e.clientY - state.lastMY) / tSize;
            state.lastMX = e.clientX;
            state.lastMY = e.clientY;
            clampCamera();
            drawMap();
        } else if (state.isDrawing) paint(e);
    });

    window.addEventListener('mouseup', () => {
        if (state.isDrawing) {
            state.isDrawing = false;
            drawPreview();
        }
        if (state.isEditorDragging) {
            state.isEditorDragging = false;
            if (state.currentTool === 'move') canvas.style.cursor = 'grab';
        }
    });

    canvas.onwheel = e => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const m = getCurrentMission()!;
        const tSize = (600 / m.gridSize) * state.zoom;
        const mx = e.clientX - rect.left,
            my = e.clientY - rect.top;
        const gx = mx / tSize + state.panX,
            gy = my / tSize + state.panY;

        const oldZoom = state.zoom;
        state.zoom = Math.max(1.0, Math.min(state.zoom + (e.deltaY < 0 ? 0.5 : -0.5), 15.0));
        if (state.zoom !== oldZoom) {
            const nSize = (600 / m.gridSize) * state.zoom;
            state.panX = gx - mx / nSize;
            state.panY = gy - my / nSize;
            clampCamera();
            drawMap();
        }
    };

    const prevCanvas = getEl<HTMLCanvasElement>('previewCanvas');
    prevCanvas.onmousedown = e => {
        state.isPrevDragging = true;
        state.lastMX = e.clientX;
        state.lastMY = e.clientY;
    };
    window.addEventListener('mouseup', () => {
        state.isPrevDragging = false;
    });
    window.addEventListener('mousemove', e => {
        if (state.isPrevDragging) {
            state.prevPanX += e.clientX - state.lastMX;
            state.prevPanY += e.clientY - state.lastMY;
            state.lastMX = e.clientX;
            state.lastMY = e.clientY;
            drawPreview();
        }
    });
    prevCanvas.ondblclick = () => {
        state.prevZoom = 1.0;
        state.prevPanX = 0;
        state.prevPanY = 0;
        drawPreview();
    };
    prevCanvas.onwheel = e => {
        e.preventDefault();
        const rect = prevCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left,
            my = e.clientY - rect.top;
        if (my > 300) return;
        const oldZoom = state.prevZoom;
        state.prevZoom = Math.max(1.0, Math.min(state.prevZoom * (e.deltaY < 0 ? 1.2 : 0.83), 20.0));
        if (state.prevZoom === 1.0) {
            state.prevPanX = 0;
            state.prevPanY = 0;
        } else {
            const scaleRatio = state.prevZoom / oldZoom;
            state.prevPanX = mx - 250 - (mx - (250 + state.prevPanX)) * scaleRatio;
            state.prevPanY = my - 30 - (my - (30 + state.prevPanY)) * scaleRatio;
        }
        drawPreview();
    };

    getEl('btn-export-campaign').onclick = () => {
        const data = state.campaign.map(m => ({ ...m, terrain: compressTerrain(m.terrain) }));
        const exportData = {
            type: state.type || 'ZEEWOLF_CAMPAIGN',
            campaignTitle: getInput('c_title').value,
            campaignSublines: getEl<HTMLTextAreaElement>('c_sublines')
                .value.split('\n')
                .filter(l => l.trim() !== ''),
            levels: data,
        };
        getEl<HTMLTextAreaElement>('output').value = JSON.stringify(exportData);
        alert('Kampagne bereit! (Clean & Lightweight)');
    };

    getEl('btn-import-campaign').onclick = () => {
        const raw = getEl<HTMLTextAreaElement>('output').value;
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw);
            getInput('c_title').value = parsed.campaignTitle || 'Imported Campaign';
            getEl<HTMLTextAreaElement>('c_sublines').value = (parsed.campaignSublines || []).join('\n');
            state.type = parsed.type;
            state.campaign = parsed.levels.map((m: any) => ({
                ...m,
                terrain: decompressTerrain(m.terrain, m.gridSize),
            }));
            loadMission(0);
        } catch (e) {
            alert('Import Fehler!\n\n' + e);
        }
    };
};

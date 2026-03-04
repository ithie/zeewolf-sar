import { state, createEmptyMission, getCurrentMission } from './state';
import { drawMap, drawPreview, generatePreviewBase64 } from './render';
import { compressTerrain, decompressTerrain } from '../shared/utils';

const getEl = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const getInput = (id: string) => getEl<HTMLInputElement>(id);

// ── Payload-Liste im UI neu rendern ──────────────────────────────────────────
export const renderPayloadList = () => {
    const m = getCurrentMission();
    const container = getEl('payload-list');
    if (!container || !m) return;

    container.innerHTML = '';
    const payloads = m.payloads || [];

    if (payloads.length === 0) {
        container.innerHTML = '<span style="color:#555;font-size:11px">Keine Payloads platziert</span>';
        return;
    }

    payloads.forEach((p, i) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0;font-size:11px';

        const icon = p.type === 'person' ? '🟡' : '🟠';
        const label = document.createElement('span');
        label.style.flex = '1';
        label.innerText = `${i + 1}. ${icon} ${p.type === 'person' ? 'Person' : 'Crate'} @ (${p.x}, ${p.y})`;

        const btnDel = document.createElement('button');
        btnDel.innerText = 'X';
        btnDel.style.cssText = 'background:#822;color:#fff;border:none;padding:2px 6px;cursor:pointer;font-size:10px';
        btnDel.onclick = () => {
            m.payloads.splice(i, 1);
            renderPayloadList();
            drawMap();
        };

        row.append(label, btnDel);
        container.appendChild(row);
    });
};

export const syncToData = () => {
    const m = getCurrentMission();
    if (!m) return;

    m.headline = getInput('m_headline').value;
    m.briefing = getEl<HTMLTextAreaElement>('m_briefing').value;
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

    // Migration: alte Missionen ohne payloads bekommen leeres Array
    if (!m.payloads) m.payloads = [];

    getInput('m_headline').value = m.headline;
    getEl<HTMLTextAreaElement>('m_briefing').value = m.briefing || '';
    getInput('m_grid_size').value = m.gridSize.toString();
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
    renderPayloadList();
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
        const targetHeight = e.shiftKey ? -1.0 : 10.0;
        const strength = 0.05;

        for (let dx = -rad; dx <= rad; dx++) {
            for (let dy = -rad; dy <= rad; dy++) {
                const dist = Math.hypot(dx, dy);
                const nx = gx + dx;
                const ny = gy + dy;
                if (dist <= state.brushRadius && m.terrain[nx] && m.terrain[nx][ny] !== undefined) {
                    const falloff = (Math.cos((dist / state.brushRadius) * Math.PI) + 1) / 2;
                    const currentH = m.terrain[nx][ny];
                    let newH = currentH + (targetHeight - currentH) * strength * falloff;
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
    } else if (state.currentTool === 'person') {
        // Shift = nächste Person in der Nähe löschen, sonst hinzufügen
        if (e.shiftKey) {
            removeNearestPayload(m, gx, gy, 'person');
        } else {
            if (!m.payloads) m.payloads = [];
            m.payloads.push({ type: 'person', x: gx, y: gy });
        }
        renderPayloadList();
    } else if (state.currentTool === 'crate') {
        if (e.shiftKey) {
            removeNearestPayload(m, gx, gy, 'crate');
        } else {
            if (!m.payloads) m.payloads = [];
            m.payloads.push({ type: 'crate', x: gx, y: gy });
        }
        renderPayloadList();
    }

    // Nach Terrain-Änderung Küstenübergänge glätten
    if (state.currentTool === 'terrain' || state.currentTool === 'flatten') {
        smoothCoast(m, gx, gy, Math.ceil(state.brushRadius) + 2);
    }

    drawMap();
};

/**
 * Glättet abrupte Höhensprünge im Bereich um (cx, cy).
 * Verhindert Löcher an der Küstenlinie.
 */
const smoothCoast = (m: any, cx: number, cy: number, radius: number) => {
    const passes = 2;
    for (let pass = 0; pass < passes; pass++) {
        for (let x = Math.max(1, cx - radius); x < Math.min(m.gridSize, cx + radius); x++) {
            for (let y = Math.max(1, cy - radius); y < Math.min(m.gridSize, cy + radius); y++) {
                const h = m.terrain[x][y];
                // Nur Tiles nahe der Wasseroberfläche glätten
                const neighbors = [
                    m.terrain[x - 1]?.[y],
                    m.terrain[x + 1]?.[y],
                    m.terrain[x]?.[y - 1],
                    m.terrain[x]?.[y + 1],
                ].filter(v => v !== undefined);

                const maxNeighbor = Math.max(...neighbors);
                const minNeighbor = Math.min(...neighbors);

                // Wenn Sprung zu groß (>4 Einheiten) → sanft angleichen
                if (h > 0 && minNeighbor <= 0 && h > 4) {
                    m.terrain[x][y] = Math.round(((h + minNeighbor) / 2) * 100) / 100;
                } else if (h <= 0 && maxNeighbor > 4) {
                    m.terrain[x][y] = Math.round(((h + maxNeighbor) / 2) * 100) / 100;
                }
            }
        }
    }
};

/** Entfernt den nächsten Payload eines bestimmten Typs innerhalb von 3 Tiles */
const removeNearestPayload = (m: any, gx: number, gy: number, type: 'person' | 'crate') => {
    if (!m.payloads) return;
    let nearestIdx = -1;
    let nearestDist = 3;
    m.payloads.forEach((p: any, i: number) => {
        if (p.type !== type) return;
        const d = Math.hypot(p.x - gx, p.y - gy);
        if (d < nearestDist) {
            nearestDist = d;
            nearestIdx = i;
        }
    });
    if (nearestIdx >= 0) m.payloads.splice(nearestIdx, 1);
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
            updateCursor();
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
            updateCursor();
        };
    });

    getInput('m_custom_brush').oninput = () => {
        if (state.isCustomBrush) {
            state.brushRadius = parseFloat(getInput('m_custom_brush').value) || 8;
            updateCursor();
        }
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

    // ── Custom Brush Cursor ──────────────────────────────────────────────────
    const cursorEl = document.createElement('canvas');
    cursorEl.id = 'brush-cursor';
    cursorEl.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;display:none;';
    document.body.appendChild(cursorEl);
    const cursorCtx = cursorEl.getContext('2d')!;

    const PAINT_TOOLS = new Set(['terrain', 'flatten']);
    const POINT_TOOLS = new Set(['pad', 'carrier', 'lighthouse', 'person', 'crate']);

    const updateCursor = () => {
        const m = getCurrentMission();
        if (!m) return;
        const tool = state.currentTool;
        if (tool === 'move') {
            cursorEl.style.display = 'none';
            canvas.style.cursor = 'grab';
            return;
        }
        canvas.style.cursor = 'none';
        cursorEl.style.display = 'block';
        if (PAINT_TOOLS.has(tool)) {
            const tSize = (600 / m.gridSize) * state.zoom;
            const radiusPx = state.brushRadius * tSize;
            const size = Math.ceil(radiusPx * 2 + 8);
            cursorEl.width = size;
            cursorEl.height = size;
            cursorCtx.clearRect(0, 0, size, size);
            cursorCtx.beginPath();
            cursorCtx.arc(size / 2, size / 2, radiusPx, 0, Math.PI * 2);
            cursorCtx.strokeStyle = 'rgba(255,255,255,0.85)';
            cursorCtx.lineWidth = 1.5;
            cursorCtx.stroke();
            cursorCtx.beginPath();
            cursorCtx.arc(size / 2, size / 2, 2, 0, Math.PI * 2);
            cursorCtx.fillStyle = 'rgba(255,255,255,0.9)';
            cursorCtx.fill();
            const color = tool === 'flatten' ? 'rgba(100,200,255,0.08)' : 'rgba(255,160,0,0.08)';
            cursorCtx.beginPath();
            cursorCtx.arc(size / 2, size / 2, radiusPx, 0, Math.PI * 2);
            cursorCtx.fillStyle = color;
            cursorCtx.fill();
        } else if (POINT_TOOLS.has(tool)) {
            const size = 32;
            cursorEl.width = size;
            cursorEl.height = size;
            cursorCtx.clearRect(0, 0, size, size);
            cursorCtx.strokeStyle = 'rgba(255,255,255,0.9)';
            cursorCtx.lineWidth = 1.5;
            cursorCtx.beginPath();
            cursorCtx.moveTo(size / 2, 0);
            cursorCtx.lineTo(size / 2, size);
            cursorCtx.moveTo(0, size / 2);
            cursorCtx.lineTo(size, size / 2);
            cursorCtx.stroke();
            const dotColors: Record<string, string> = {
                pad: '#5f5',
                carrier: '#88aaff',
                lighthouse: '#ffdd44',
                person: '#ffe033',
                crate: '#ff8800',
            };
            cursorCtx.beginPath();
            cursorCtx.arc(size / 2, size / 2, 4, 0, Math.PI * 2);
            cursorCtx.fillStyle = dotColors[tool] || '#fff';
            cursorCtx.fill();
        }
    };

    canvas.addEventListener('mousemove', e => {
        const size = parseInt(cursorEl.width as any) || 32;
        cursorEl.style.left = e.clientX - size / 2 + 'px';
        cursorEl.style.top = e.clientY - size / 2 + 'px';
        updateCursor();
    });
    canvas.addEventListener('mouseenter', () => {
        if (state.currentTool !== 'move') {
            cursorEl.style.display = 'block';
            updateCursor();
        }
    });
    canvas.addEventListener('mouseleave', () => {
        cursorEl.style.display = 'none';
    });
    // ── END Custom Brush Cursor ──────────────────────────────────────────────

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
            canvas.style.cursor = 'grabbing'; // temporär beim Drag
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
        } else if (state.isDrawing) {
            // Person/Crate nur beim initialen Klick, nicht beim Drag
            if (state.currentTool !== 'person' && state.currentTool !== 'crate') {
                paint(e);
            }
        }
    });

    window.addEventListener('mouseup', () => {
        if (state.isDrawing) {
            state.isDrawing = false;
            drawPreview();
        }
        if (state.isEditorDragging) {
            state.isEditorDragging = false;
            updateCursor(); // zurück zum Tool-Cursor
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

    // ── EXPORT ──────────────────────────────────────────────────────────────
    getEl('btn-export-campaign').onclick = () => {
        const data = state.campaign.map(m => {
            const preview = generatePreviewBase64(); // ← Preview generieren
            return {
                ...m,
                terrain: compressTerrain(m.terrain),
                previewBase64: preview,
                // Rückwärts-Kompatibilität: goalPersons/goalCrates aus payloads ableiten
                goalPersons: (m.payloads || []).filter((p: any) => p.type === 'person').length,
                goalCrates: (m.payloads || []).filter((p: any) => p.type === 'crate').length,
            };
        });
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

    // ── IMPORT ──────────────────────────────────────────────────────────────
    getEl('btn-import-campaign').onclick = () => {
        const raw = getEl<HTMLTextAreaElement>('output').value;
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw);
            getInput('c_title').value = parsed.campaignTitle || 'Imported Campaign';
            getEl<HTMLTextAreaElement>('c_sublines').value = (parsed.campaignSublines || []).join('\n');
            state.type = parsed.type;
            state.campaign = parsed.levels.map((m: any) => {
                const base = {
                    ...m,
                    terrain: decompressTerrain(m.terrain, m.gridSize),
                };
                // Migration: altes Format (goalPersons/goalCrates + keine payloads) umwandeln
                if (!base.payloads) {
                    base.payloads = [];
                    // Wenn alte Daten vorhanden, aber keine Koordinaten → nur Anzahl bekannt,
                    // deshalb keine automatische Platzierung – Benutzer muss selbst platzieren.
                }
                return base;
            });
            loadMission(0);
        } catch (e) {
            alert('Import Fehler!\n\n' + e);
        }
    };
};

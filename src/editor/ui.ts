import {
    state,
    createEmptyMission,
    getCurrentMission,
    MissionV2,
    getPad,
    getCarrier,
    getBoats,
    getLighthouse,
} from './state';
import { drawMap, drawPreview, generatePreviewBase64 } from './render';
import { compressTerrain, decompressTerrain } from '../shared/utils';

const getEl = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const getInput = (id: string) => getEl<HTMLInputElement>(id);

// ── Payload-Liste ─────────────────────────────────────────────────────────────
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
        const attach = (p as any).attachTo
            ? ` → ${(p as any).attachTo.objectType} #${(p as any).attachTo.objectIdx + 1}`
            : '';
        label.innerText = `${i + 1}. ${icon} ${p.type === 'person' ? 'Person' : 'Crate'} @ (${p.x}, ${p.y})${attach}`;
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

// ── Object-Liste (Carrier / Boats / Lighthouse) ───────────────────────────────
export const renderObjectList = () => {
    const m = getCurrentMission();
    const container = getEl('object-list');
    if (!container || !m) return;
    container.innerHTML = '';
    m.objects.forEach((obj, idx) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0;font-size:11px';
        const icons: Record<string, string> = { pad: '🟩', carrier: '🚢', boat: '⛵', lighthouse: '🔦' };
        const label = document.createElement('span');
        label.style.flex = '1';
        label.innerText = `${icons[obj.type] || '?'} ${obj.type} @ (${obj.x}, ${obj.y})`;
        const btnDel = document.createElement('button');
        btnDel.innerText = 'X';
        btnDel.style.cssText = 'background:#822;color:#fff;border:none;padding:2px 6px;cursor:pointer;font-size:10px';
        btnDel.onclick = () => {
            m.objects.splice(idx, 1);
            if (state.selectedObjectIdx === idx) state.selectedObjectIdx = null;
            renderObjectList();
            drawMap();
        };
        row.append(label, btnDel);
        container.appendChild(row);
    });
};

// ── Sync form → mission data ──────────────────────────────────────────────────
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
    m.gridSize = parseInt(getInput('m_grid_size').value) || 100;
    renderMissionList();
    drawMap();
    drawPreview();
};

// Sync vessel form fields back into the currently-selected object
const syncVesselFromUI = (kind: 'carrier' | 'boat') => {
    const m = getCurrentMission();
    if (!m || state.selectedObjectIdx === null) return;
    const obj = m.objects[state.selectedObjectIdx] as any;
    if (!obj || obj.type !== kind) return;
    const prefix = kind === 'carrier' ? 'carrier' : 'boat';
    obj.path = (document.getElementById(`m_${prefix}_path`) as HTMLSelectElement)?.value ?? obj.path;
    obj.speed = parseFloat((document.getElementById(`m_${prefix}_speed`) as HTMLInputElement)?.value) || 0;
    obj.radius = parseFloat((document.getElementById(`m_${prefix}_radius`) as HTMLInputElement)?.value) || 40;
    obj.angle = parseInt((document.getElementById(`m_${prefix}_angle`) as HTMLInputElement)?.value) || 0;
    drawMap();
    drawPreview();
};

// ── Load mission into UI ───────────────────────────────────────────────────────
export const loadMission = (idx: number) => {
    state.curIdx = idx;
    const m = getCurrentMission();
    if (!m) return;
    if (!m.payloads) m.payloads = [];
    if (!m.objects) m.objects = [];

    getInput('m_headline').value = m.headline;
    getEl<HTMLTextAreaElement>('m_briefing').value = m.briefing || '';
    getInput('m_grid_size').value = m.gridSize.toString();
    getInput('m_rain').checked = m.rain;
    getInput('m_night').checked = m.night;
    getInput('m_wind_dir').value = m.windDir.toString();
    getInput('m_wind_str').value = m.windStr.toString();
    getInput('m_wind_var').checked = m.windVar;

    state.selectedUI = null;
    state.selectedObjectIdx = null;
    renderMissionList();
    renderPayloadList();
    renderObjectList();
    drawMap();
    drawPreview();
};

// ── Mission list UI ───────────────────────────────────────────────────────────
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
    [state.campaign[i], state.campaign[i + dir]] = [state.campaign[i + dir], state.campaign[i]];
    loadMission(i + dir);
};

const delM = (i: number) => {
    if (state.campaign.length <= 1) return;
    if (confirm('Mission wirklich löschen?')) {
        state.campaign.splice(i, 1);
        loadMission(Math.max(0, i - 1));
    }
};

// ── Camera ────────────────────────────────────────────────────────────────────
const clampCamera = () => {
    const m = getCurrentMission();
    if (!m) return;
    const tSize = (600 / m.gridSize) * state.zoom;
    const viewGridW = 600 / tSize,
        viewGridH = 600 / tSize;
    state.panX = Math.max(0, Math.min(state.panX, m.gridSize - viewGridW));
    state.panY = Math.max(0, Math.min(state.panY, m.gridSize - viewGridH));
    if (viewGridW >= m.gridSize) state.panX = 0;
    if (viewGridH >= m.gridSize) state.panY = 0;
};

// ── Coastal smoothing ─────────────────────────────────────────────────────────
const smoothCoast = (m: MissionV2, cx: number, cy: number, radius: number) => {
    for (let pass = 0; pass < 2; pass++) {
        for (let x = Math.max(1, cx - radius); x < Math.min(m.gridSize, cx + radius); x++) {
            for (let y = Math.max(1, cy - radius); y < Math.min(m.gridSize, cy + radius); y++) {
                const h = m.terrain[x][y];
                const neighbors = [
                    m.terrain[x - 1]?.[y],
                    m.terrain[x + 1]?.[y],
                    m.terrain[x]?.[y - 1],
                    m.terrain[x]?.[y + 1],
                ].filter(v => v !== undefined);
                const maxN = Math.max(...neighbors),
                    minN = Math.min(...neighbors);
                if (h > 0 && minN <= 0 && h > 4) m.terrain[x][y] = Math.round(((h + minN) / 2) * 100) / 100;
                else if (h <= 0 && maxN > 4) m.terrain[x][y] = Math.round(((h + maxN) / 2) * 100) / 100;
            }
        }
    }
};

// ── Remove nearest payload ────────────────────────────────────────────────────
const SNAP_RADIUS = 8;
const makePayload = (type: 'person' | 'crate', gx: number, gy: number, m: MissionV2) => {
    let nearestIdx = -1,
        nearestDist = SNAP_RADIUS;
    for (let i = 0; i < m.objects.length; i++) {
        const obj = m.objects[i];
        if (obj.type !== 'carrier' && obj.type !== 'boat') continue;
        const d = Math.hypot(gx - obj.x, gy - obj.y);
        if (d <= nearestDist) {
            nearestDist = d;
            nearestIdx = i;
        }
    }
    if (nearestIdx >= 0) {
        const obj = m.objects[nearestIdx] as any;
        return { type, x: gx, y: gy, attachTo: { objectType: obj.type as 'carrier' | 'boat', objectIdx: nearestIdx } };
    }
    return { type, x: gx, y: gy };
};

const removeNearestPayload = (m: MissionV2, gx: number, gy: number, type: 'person' | 'crate') => {
    if (!m.payloads) return;
    let nearestIdx = -1,
        nearestDist = 3;
    m.payloads.forEach((p, i) => {
        if (p.type !== type) return;
        const d = Math.hypot(p.x - gx, p.y - gy);
        if (d < nearestDist) {
            nearestDist = d;
            nearestIdx = i;
        }
    });
    if (nearestIdx >= 0) m.payloads.splice(nearestIdx, 1);
};

// ── Paint / place ─────────────────────────────────────────────────────────────
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
        for (let dx = -rad; dx <= rad; dx++) {
            for (let dy = -rad; dy <= rad; dy++) {
                const dist = Math.hypot(dx, dy);
                const nx = gx + dx,
                    ny = gy + dy;
                if (dist <= state.brushRadius && m.terrain[nx] && m.terrain[nx][ny] !== undefined) {
                    const falloff = (Math.cos((dist / state.brushRadius) * Math.PI) + 1) / 2;
                    let newH = m.terrain[nx][ny] + (targetHeight - m.terrain[nx][ny]) * 0.05 * falloff;
                    m.terrain[nx][ny] = Math.round(Math.max(-1, Math.min(15, newH)) * 100) / 100;
                }
            }
        }
    } else if (state.currentTool === 'flatten') {
        const h = e.shiftKey ? -1 : 0.25;
        const rad = Math.ceil(state.brushRadius);
        for (let dx = -rad; dx <= rad; dx++) {
            for (let dy = -rad; dy <= rad; dy++) {
                if (Math.hypot(dx, dy) <= state.brushRadius && m.terrain[gx + dx]) m.terrain[gx + dx][gy + dy] = h;
            }
        }
    } else if (state.currentTool === 'pad') {
        const existing = m.objects.findIndex(o => o.type === 'pad');
        if (e.shiftKey) {
            if (existing >= 0) m.objects.splice(existing, 1);
        } else {
            const newPad = { type: 'pad' as const, x: gx, y: gy };
            if (existing >= 0) m.objects[existing] = newPad;
            else m.objects.push(newPad);
        }
    } else if (state.currentTool === 'carrier') {
        const existing = m.objects.findIndex(o => o.type === 'carrier');
        if (e.shiftKey) {
            if (existing >= 0) m.objects.splice(existing, 1);
        } else {
            const newCarrier =
                existing >= 0
                    ? { ...m.objects[existing], x: gx, y: gy }
                    : {
                          type: 'carrier' as const,
                          x: gx,
                          y: gy,
                          angle: 0,
                          path: 'circle' as const,
                          speed: 5,
                          radius: 40,
                      };
            if (existing >= 0) m.objects[existing] = newCarrier;
            else m.objects.push(newCarrier);
        }
    } else if (state.currentTool === 'boat') {
        if (e.shiftKey) {
            // Remove nearest boat
            let nearestIdx = -1,
                nearestDist = 8;
            m.objects.forEach((o, i) => {
                if (o.type !== 'boat') return;
                const d = Math.hypot(o.x - gx, o.y - gy);
                if (d < nearestDist) {
                    nearestDist = d;
                    nearestIdx = i;
                }
            });
            if (nearestIdx >= 0) m.objects.splice(nearestIdx, 1);
        } else {
            // Move nearest boat if close enough, otherwise add new
            let nearestIdx = -1,
                nearestDist = 8;
            m.objects.forEach((o, i) => {
                if (o.type !== 'boat') return;
                const d = Math.hypot(o.x - gx, o.y - gy);
                if (d < nearestDist) {
                    nearestDist = d;
                    nearestIdx = i;
                }
            });
            if (nearestIdx >= 0) {
                m.objects[nearestIdx] = { ...m.objects[nearestIdx], x: gx, y: gy };
            } else {
                m.objects.push({ type: 'boat', x: gx, y: gy, angle: 0, path: 'circle', speed: 3, radius: 20 });
            }
        }
    } else if (state.currentTool === 'lighthouse') {
        const existing = m.objects.findIndex(o => o.type === 'lighthouse');
        if (e.shiftKey) {
            if (existing >= 0) m.objects.splice(existing, 1);
        } else {
            const newLH = { type: 'lighthouse' as const, x: gx, y: gy };
            if (existing >= 0) m.objects[existing] = newLH;
            else m.objects.push(newLH);
        }
    } else if (state.currentTool === 'person') {
        if (e.shiftKey) removeNearestPayload(m, gx, gy, 'person');
        else {
            if (!m.payloads) m.payloads = [];
            m.payloads.push(makePayload('person', gx, gy, m));
        }
        renderPayloadList();
    } else if (state.currentTool === 'crate') {
        if (e.shiftKey) removeNearestPayload(m, gx, gy, 'crate');
        else {
            if (!m.payloads) m.payloads = [];
            m.payloads.push(makePayload('crate', gx, gy, m));
        }
        renderPayloadList();
    }

    if (state.currentTool === 'terrain' || state.currentTool === 'flatten')
        smoothCoast(m, gx, gy, Math.ceil(state.brushRadius) + 2);

    renderObjectList();
    drawMap();
};

// ── Init ───────────────────────────────────────────────────────────────────────
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

    const safeClick = (id: string, fn: () => void) => {
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
    };
    safeClick('close-wind', () => {
        state.selectedUI = null;
        drawMap();
    });
    safeClick('close-carrier', () => {
        state.selectedObjectIdx = null;
        drawMap();
    });
    safeClick('close-pad', () => {
        state.selectedObjectIdx = null;
        drawMap();
    });
    safeClick('close-boat', () => {
        state.selectedObjectIdx = null;
        drawMap();
    });

    // Spawn buttons
    safeClick('btn_spawn_pad', () => {
        getCurrentMission()!.spawnObject = 'pad';
        drawMap();
    });
    safeClick('btn_spawn_carrier', () => {
        getCurrentMission()!.spawnObject = 'carrier';
        drawMap();
    });

    // Vessel sync
    ['carrier_path', 'carrier_speed', 'carrier_radius', 'carrier_angle'].forEach(id =>
        document.getElementById(`m_${id}`)?.addEventListener('input', () => syncVesselFromUI('carrier'))
    );
    ['boat_path', 'boat_speed', 'boat_radius', 'boat_angle'].forEach(id =>
        document.getElementById(`m_${id}`)?.addEventListener('input', () => syncVesselFromUI('boat'))
    );

    // General sync
    ['m_headline', 'm_briefing', 'm_rain', 'm_night', 'm_wind_dir', 'm_wind_str', 'm_wind_var'].forEach(id =>
        getEl(id).addEventListener('input', syncToData)
    );

    const canvas = getEl<HTMLCanvasElement>('editorCanvas');

    // ── Custom Cursor ──────────────────────────────────────────────────────────
    const cursorEl = document.createElement('canvas');
    cursorEl.id = 'brush-cursor';
    cursorEl.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;display:none;';
    document.body.appendChild(cursorEl);
    const cursorCtx = cursorEl.getContext('2d')!;
    const PAINT_TOOLS = new Set(['terrain', 'flatten']);
    const POINT_TOOLS = new Set(['pad', 'carrier', 'boat', 'lighthouse', 'person', 'crate']);
    const dotColors: Record<string, string> = {
        pad: '#5f5',
        carrier: '#88aaff',
        boat: '#4af',
        lighthouse: '#ffdd44',
        person: '#ffe033',
        crate: '#ff8800',
    };

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
            cursorCtx.beginPath();
            cursorCtx.arc(size / 2, size / 2, radiusPx, 0, Math.PI * 2);
            cursorCtx.fillStyle = tool === 'flatten' ? 'rgba(100,200,255,0.08)' : 'rgba(255,160,0,0.08)';
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

    // ── M-Taste: Move-Modus ───────────────────────────────────────────────────
    const updateMoveCursor = () => {
        if (state.moveMode) {
            canvas.style.cursor = 'crosshair';
            cursorEl.style.display = 'none';
        } else {
            updateCursor();
        }
    };

    window.addEventListener('keydown', e => {
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
        if (e.key === 'm' || e.key === 'M') {
            if (state.selectedObjectIdx !== null || state.selectedPayloadIdx !== null) {
                state.moveMode = !state.moveMode;
                updateMoveCursor();
                drawMap();
            }
        }
        if (e.key === 'Escape') {
            state.moveMode = false;
            state.selectedObjectIdx = null;
            state.selectedPayloadIdx = null;
            updateMoveCursor();
            drawMap();
        }
    });

    // ── Mouse down: object selection or paint ──────────────────────────────────
    canvas.onmousedown = e => {
        const rect = canvas.getBoundingClientRect();
        const m = getCurrentMission()!;
        const tSize = (600 / m.gridSize) * state.zoom;
        const mx = e.clientX - rect.left,
            my = e.clientY - rect.top;
        const gx = mx / tSize + state.panX,
            gy = my / tSize + state.panY;

        // Wind compass
        if (Math.hypot(mx - 50, my - 50) < 30) {
            state.selectedUI = state.selectedUI === 'wind' ? null : 'wind';
            state.selectedObjectIdx = null;
            drawMap();
            return;
        }

        // Move-Modus: M wurde gedrückt, Klick verschiebt selektiertes Objekt/Payload
        if (state.moveMode) {
            if (state.selectedObjectIdx !== null) {
                const obj = m.objects[state.selectedObjectIdx] as any;
                obj.x = Math.floor(gx);
                obj.y = Math.floor(gy);
                renderObjectList();
            } else if (state.selectedPayloadIdx !== null) {
                const p = m.payloads[state.selectedPayloadIdx] as any;
                p.x = Math.floor(gx);
                p.y = Math.floor(gy);
                // Snap prüfen nach Verschiebung
                const snapped = makePayload(p.type, p.x, p.y, m);
                m.payloads[state.selectedPayloadIdx] = { ...snapped };
                renderPayloadList();
            }
            state.moveMode = false;
            updateMoveCursor();
            drawMap();
            return;
        }

        // Click on existing object?
        if (!e.shiftKey) {
            // Erst Payloads prüfen (kleiner, leichter zu verfehlen)
            if (state.currentTool === 'person' || state.currentTool === 'crate' || state.currentTool === 'move') {
                const payloads = m.payloads || [];
                for (let i = 0; i < payloads.length; i++) {
                    if (Math.hypot(gx - payloads[i].x, gy - payloads[i].y) < 2) {
                        state.selectedPayloadIdx = state.selectedPayloadIdx === i ? null : i;
                        state.selectedObjectIdx = null;
                        state.selectedUI = null;
                        drawMap();
                        return;
                    }
                }
            }
            for (let i = 0; i < m.objects.length; i++) {
                const obj = m.objects[i];
                let hit = false;
                if (obj.type === 'pad') hit = gx >= obj.x && gx <= obj.x + 8 && gy >= obj.y && gy <= obj.y + 8;
                else if (obj.type === 'carrier' || obj.type === 'boat') hit = Math.hypot(gx - obj.x, gy - obj.y) < 6;
                else if (obj.type === 'lighthouse') hit = Math.hypot(gx - obj.x, gy - obj.y) < 2;
                if (hit) {
                    state.selectedObjectIdx = state.selectedObjectIdx === i ? null : i;
                    state.selectedPayloadIdx = null;
                    state.selectedUI = null;
                    drawMap();
                    return;
                }
            }
        }

        state.selectedObjectIdx = null;
        state.selectedPayloadIdx = null;
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
        } else if (state.isDrawing) {
            if (
                state.currentTool !== 'person' &&
                state.currentTool !== 'crate' &&
                state.currentTool !== 'boat' &&
                state.currentTool !== 'carrier' &&
                state.currentTool !== 'pad' &&
                state.currentTool !== 'lighthouse'
            ) {
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
            updateCursor();
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

    // Preview canvas interactions
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
            const r = state.prevZoom / oldZoom;
            state.prevPanX = mx - 250 - (mx - (250 + state.prevPanX)) * r;
            state.prevPanY = my - 30 - (my - (30 + state.prevPanY)) * r;
        }
        drawPreview();
    };

    // ── Export ─────────────────────────────────────────────────────────────────
    getEl('btn-export-campaign').onclick = () => {
        const data = state.campaign.map(m => ({
            ...m,
            terrain: compressTerrain(m.terrain),
            previewBase64: generatePreviewBase64(),
        }));
        const exportData = {
            type: state.type || 'ZEEWOLF_CAMPAIGN',
            campaignTitle: getInput('c_title').value,
            campaignSublines: getEl<HTMLTextAreaElement>('c_sublines')
                .value.split('\n')
                .filter(l => l.trim()),
            levels: data,
        };
        getEl<HTMLTextAreaElement>('output').value = JSON.stringify(exportData);
        alert('Kampagne exportiert!');
    };

    // ── Import ─────────────────────────────────────────────────────────────────
    getEl('btn-import-campaign').onclick = () => {
        const raw = getEl<HTMLTextAreaElement>('output').value;
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw);
            getInput('c_title').value = parsed.campaignTitle || 'Imported Campaign';
            getEl<HTMLTextAreaElement>('c_sublines').value = (parsed.campaignSublines || []).join('\n');
            state.type = parsed.type;
            state.campaign = parsed.levels.map((m: any) => {
                const base = { ...m, terrain: decompressTerrain(m.terrain, m.gridSize) } as MissionV2;
                delete (base as any).previewBase64;
                return base;
            });
            loadMission(0);
        } catch (e) {
            alert('Import Fehler!\n\n' + e);
        }
    };
};

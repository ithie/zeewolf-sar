import { state, getCurrentMission } from './state';
import { COLORS, getLandColor } from '../shared/constants';

const canvas = document.getElementById('editorCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const prevCanvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
const prevCtx = prevCanvas.getContext('2d')!;

export const drawMap = () => {
    const m = getCurrentMission();
    if (!m) return;

    ctx.clearRect(0, 0, 600, 600);
    const tSize = (600 / m.gridSize) * state.zoom;

    const pUI = document.getElementById('ui_pad') as HTMLElement;
    const cUI = document.getElementById('ui_carrier') as HTMLElement;
    const wUI = document.getElementById('ui_wind') as HTMLElement;

    if (pUI) pUI.style.display = 'none';
    if (cUI) cUI.style.display = 'none';
    if (wUI) wUI.style.display = 'none';

    for (let x = Math.floor(state.panX); x < Math.min(m.gridSize, state.panX + 600 / tSize + 1); x++) {
        for (let y = Math.floor(state.panY); y < Math.min(m.gridSize, state.panY + 600 / tSize + 1); y++) {
            const h = m.terrain[x][y];
            ctx.fillStyle = h <= 0 ? COLORS.water : getLandColor(h, false);
            ctx.fillRect((x - state.panX) * tSize, (y - state.panY) * tSize, tSize + 1.5, tSize + 1.5);
        }
    }

    if (m.padX >= 0) {
        const px = (m.padX - state.panX) * tSize;
        const py = (m.padY - state.panY) * tSize;

        if (state.selectedUI === 'pad') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = COLORS.padStroke;
        }
        ctx.fillStyle = COLORS.padFill;
        ctx.fillRect(px, py, 8 * tSize, 8 * tSize);
        ctx.strokeStyle = COLORS.padStroke;
        ctx.strokeRect(px, py, 8 * tSize, 8 * tSize);
        ctx.fillStyle = COLORS.textLight;
        ctx.beginPath();
        ctx.arc(px + 4 * tSize, py + 4 * tSize, Math.max(4, tSize / 2), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (m.spawnPoint === 'pad') {
            ctx.fillStyle = COLORS.uiHighlight;
            ctx.font = 'bold 12px monospace';
            ctx.fillText('START', px, py - 5);
        }

        if (state.selectedUI === 'pad' && pUI) {
            pUI.style.display = 'block';
            pUI.style.left = Math.min(600 - 150, Math.max(0, px + 8 * tSize + 10)) + 'px';
            pUI.style.top = Math.min(600 - 100, Math.max(0, py)) + 'px';
            const btn = document.getElementById('btn_spawn_pad');
            if (btn) btn.style.background = m.spawnPoint === 'pad' ? COLORS.uiHighlight : 'var(--accent)';
        }
    }

    if (m.carrierX >= 0) {
        const cx = (m.carrierX - state.panX) * tSize;
        const cy = (m.carrierY - state.panY) * tSize;
        const rad = (m.carrierAngle * Math.PI) / 180;

        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = COLORS.carrierPath;
        if (m.carrierPath === 'straight') {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(rad) * 1000, cy + Math.sin(rad) * 1000);
            ctx.stroke();
        } else if (m.carrierPath === 'circle') {
            const pathRad = m.carrierRadius * tSize;
            const cRad = rad + Math.PI / 2;
            const c_px = cx + Math.cos(cRad) * pathRad,
                c_py = cy + Math.sin(cRad) * pathRad;
            ctx.beginPath();
            ctx.arc(c_px, c_py, pathRad, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = COLORS.carrierPath;
            ctx.fillRect(c_px - 3, c_py - 3, 6, 6);
        }
        ctx.restore();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rad);
        if (state.selectedUI === 'carrier') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = COLORS.textLight;
        }
        ctx.fillStyle = COLORS.carrierBase;
        ctx.fillRect(-6 * tSize, -1.5 * tSize, 12 * tSize, 3 * tSize);
        ctx.fillStyle = COLORS.carrierAccent;
        ctx.beginPath();
        ctx.moveTo(6 * tSize, 0);
        ctx.lineTo(3 * tSize, -1.5 * tSize);
        ctx.lineTo(3 * tSize, 1.5 * tSize);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.translate(0, 0);
        ctx.rotate(-rad);
        ctx.fillStyle = COLORS.textDark;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(m.carrierSpeed + 'kn', -15, 4);
        if (m.spawnPoint === 'carrier') {
            ctx.fillStyle = COLORS.uiHighlight;
            ctx.fillText('START', -15, -15);
        }
        ctx.restore();

        if (state.selectedUI === 'carrier' && cUI) {
            cUI.style.display = 'block';
            cUI.style.left = Math.min(600 - 180, Math.max(0, cx + 20)) + 'px';
            cUI.style.top = Math.min(600 - 180, Math.max(0, cy + 20)) + 'px';
            const btn = document.getElementById('btn_spawn_carrier');
            if (btn) btn.style.background = m.spawnPoint === 'carrier' ? COLORS.uiHighlight : 'var(--accent)';
        }
    }

    if (m.lighthouseX >= 0) {
        const lx = (m.lighthouseX + 0.5 - state.panX) * tSize;
        const ly = (m.lighthouseY + 0.5 - state.panY) * tSize;
        ctx.fillStyle = COLORS.lighthouseBase;
        ctx.beginPath();
        ctx.arc(lx, ly, tSize * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.lighthouseLight;
        ctx.beginPath();
        ctx.arc(lx, ly, tSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    const dirRad = (m.windDir * Math.PI) / 180;
    if (state.selectedUI === 'wind') {
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.windActive;
    }
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.arc(50, 50, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = state.selectedUI === 'wind' ? COLORS.windActive : COLORS.padStroke;
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (m.windStr > 0) {
        ctx.beginPath();
        ctx.moveTo(50, 50);
        ctx.lineTo(50 + Math.cos(dirRad) * 25, 50 + Math.sin(dirRad) * 25);
        ctx.stroke();
    }
    if (state.selectedUI === 'wind' && wUI) wUI.style.display = 'block';
};

const renderIso = (
    tCtx: CanvasRenderingContext2D,
    tW: number,
    tH: number,
    mode: 'filled' | 'wireframe',
    offsetY: number,
    zScale: number,
    pX: number,
    pY: number,
    isFull = false
) => {
    const m = getCurrentMission();
    if (!m) return;

    const isoW = m.gridSize;
    const isoH = m.gridSize / 2 + 5;
    const fitW = (tW * 0.9) / isoW;
    const fitH = (tH * 0.9) / isoH;
    const sTW = Math.min(fitW, fitH) * (isFull ? 1 : zScale);
    const sTH = sTW / 2;
    const sH = sTW * 0.3;
    const cX = tW / 2 + (isFull ? 0 : pX);
    const cY = tH * 0.1 + offsetY + (isFull ? 0 : pY);
    const step = mode === 'wireframe' ? Math.max(1, Math.round(m.gridSize / 25)) : 1;

    const getIso = (vx: number, vy: number, vz: number) => ({
        x: cX + (vx - vy) * (sTW / 2),
        y: cY + (vx + vy) * (sTH / 2) - vz * sH,
    });

    for (let x = 0; x < m.gridSize; x += step) {
        for (let y = 0; y < m.gridSize; y += step) {
            const nx = Math.min(x + step, m.gridSize);
            const ny = Math.min(y + step, m.gridSize);
            const h0 = m.terrain[x][y];
            const h1 = m.terrain[nx] ? m.terrain[nx][y] : h0;
            const h2 = m.terrain[nx] && m.terrain[nx][ny] ? m.terrain[nx][ny] : h0;
            const h3 = m.terrain[x] && m.terrain[x][ny] ? m.terrain[x][ny] : h0;

            const p0 = getIso(x, y, h0);
            const p1 = getIso(nx, y, h1);
            const p2 = getIso(nx, ny, h2);
            const p3 = getIso(x, ny, h3);

            tCtx.beginPath();
            tCtx.moveTo(p0.x, p0.y);
            tCtx.lineTo(p1.x, p1.y);
            tCtx.lineTo(p2.x, p2.y);
            tCtx.lineTo(p3.x, p3.y);
            tCtx.closePath();

            if (mode === 'filled') {
                if (h0 <= 0) {
                    tCtx.fillStyle = m.night ? COLORS.waterNight : COLORS.water;
                } else {
                    tCtx.fillStyle = getLandColor(h0, m.night);
                }
                tCtx.fill();
                if (h0 > 0) {
                    tCtx.strokeStyle = m.night ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)';
                    tCtx.stroke();
                }
            } else {
                tCtx.strokeStyle = 'rgba(255,100,0,0.4)';
                tCtx.stroke();
            }
        }
    }

    if (m.padX >= 0) {
        const pp = getIso(m.padX + 4, m.padY + 4, m.terrain[m.padX + 4] ? m.terrain[m.padX + 4][m.padY + 4] : 0);
        if (mode === 'filled') {
            tCtx.fillStyle = m.night ? COLORS.padNight : COLORS.padStroke;
            tCtx.fillRect(pp.x - 10, pp.y - 5, 20, 10);
        } else {
            tCtx.strokeStyle = COLORS.uiHighlight;
            tCtx.strokeRect(pp.x - 10, pp.y - 5, 20, 10);
        }
    }

    if (m.carrierX >= 0) {
        const rad = (m.carrierAngle * Math.PI) / 180;
        const cCos = Math.cos(rad);
        const cSin = Math.sin(rad);
        const p0 = getIso(m.carrierX + 6 * cCos - 1.5 * cSin, m.carrierY + 6 * cSin + 1.5 * cCos, 0.5);
        const p1 = getIso(m.carrierX - 6 * cCos - 1.5 * cSin, m.carrierY - 6 * cSin + 1.5 * cCos, 0.5);
        const p2 = getIso(m.carrierX - 6 * cCos + 1.5 * cSin, m.carrierY - 6 * cSin - 1.5 * cCos, 0.5);
        const p3 = getIso(m.carrierX + 6 * cCos + 1.5 * cSin, m.carrierY + 6 * cSin - 1.5 * cCos, 0.5);
        tCtx.beginPath();
        tCtx.moveTo(p0.x, p0.y);
        tCtx.lineTo(p1.x, p1.y);
        tCtx.lineTo(p2.x, p2.y);
        tCtx.lineTo(p3.x, p3.y);
        tCtx.closePath();
        if (mode === 'filled') {
            tCtx.fillStyle = m.night ? COLORS.carrierNight : COLORS.carrierBase;
            tCtx.fill();
        } else {
            tCtx.strokeStyle = COLORS.uiHighlight;
            tCtx.stroke();
        }
    }
};

export const drawPreview = () => {
    const m = getCurrentMission();
    prevCtx.clearRect(0, 0, 500, 600);

    if (m && (m.night || m.rain)) {
        prevCtx.fillStyle = m.night ? COLORS.bgNight : COLORS.bgRain;
        prevCtx.fillRect(0, 0, 500, 600);
    }

    prevCtx.save();
    prevCtx.beginPath();
    prevCtx.rect(0, 0, 500, 300);
    prevCtx.clip();
    renderIso(prevCtx, 500, 300, 'filled', 0, state.prevZoom, state.prevPanX, state.prevPanY);
    prevCtx.restore();

    prevCtx.strokeStyle = '#444';
    prevCtx.beginPath();
    prevCtx.moveTo(0, 300);
    prevCtx.lineTo(500, 300);
    prevCtx.stroke();

    prevCtx.save();
    prevCtx.beginPath();
    prevCtx.rect(0, 300, 500, 300);
    prevCtx.clip();
    renderIso(prevCtx, 500, 300, 'wireframe', 300, 1, 0, 0, true);
    prevCtx.restore();
};

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

    // Terrain
    for (let x = Math.floor(state.panX); x < Math.min(m.gridSize, state.panX + 600 / tSize + 1); x++) {
        for (let y = Math.floor(state.panY); y < Math.min(m.gridSize, state.panY + 600 / tSize + 1); y++) {
            const h = m.terrain[x][y];
            ctx.fillStyle = h <= 0 ? COLORS.water : getLandColor(h, false);
            ctx.fillRect((x - state.panX) * tSize, (y - state.panY) * tSize, tSize + 1.5, tSize + 1.5);
        }
    }

    // Pad
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

    // Carrier
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
            ctx.lineTo(cx + Math.cos(rad - Math.PI / 2) * 1000, cy + Math.sin(rad - Math.PI / 2) * 1000);
            ctx.stroke();
        } else if (m.carrierPath === 'circle') {
            const rX = m.carrierRadius * tSize;
            const rY = rX * 0.8;
            const t0 = Math.atan2(-Math.sin(rad) / rX, -Math.cos(rad) / rY);
            // Mittelpunkt in Grid-Koordinaten berechnen, dann in Pixel
            const centerGridX = m.carrierX - Math.cos(t0) * m.carrierRadius;
            const centerGridY = m.carrierY - Math.sin(t0) * m.carrierRadius * 0.8;
            const c_px = (centerGridX - state.panX) * tSize;
            const c_py = (centerGridY - state.panY) * tSize;
            ctx.beginPath();
            ctx.ellipse(c_px, c_py, rX, rY, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = COLORS.carrierPath;
            ctx.fillRect(c_px - 3, c_py - 3, 6, 6);
        }
        ctx.restore();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rad - Math.PI / 2);
        if (state.selectedUI === 'carrier') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = COLORS.textLight;
        }
        ctx.fillStyle = COLORS.carrierBase;
        ctx.fillRect(-8 * tSize, -3.5 * tSize, 16 * tSize, 7 * tSize);
        ctx.fillStyle = COLORS.carrierAccent;
        ctx.beginPath();
        ctx.moveTo(8 * tSize, 0);
        ctx.lineTo(5 * tSize, -3.5 * tSize);
        ctx.lineTo(5 * tSize, 3.5 * tSize);
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

    // Lighthouse
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

    // ── PAYLOADS ──────────────────────────────────────────────────────────────
    // Personen = gelbes Männchen-Symbol, Crates = orangene Kiste
    const payloads = m.payloads || [];
    payloads.forEach((p, idx) => {
        const px = (p.x + 0.5 - state.panX) * tSize;
        const py = (p.y + 0.5 - state.panY) * tSize;
        const r = Math.max(5, tSize * 0.7);

        if (p.type === 'person') {
            // Körper
            ctx.fillStyle = '#ffe033';
            ctx.beginPath();
            ctx.arc(px, py, r * 0.45, 0, Math.PI * 2);
            ctx.fill();
            // Kopf (kleiner Kreis oben)
            ctx.fillStyle = '#ffe033';
            ctx.beginPath();
            ctx.arc(px, py - r * 0.65, r * 0.28, 0, Math.PI * 2);
            ctx.fill();
            // Kontur
            ctx.strokeStyle = '#cc9900';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px, py, r * 0.45, 0, Math.PI * 2);
            ctx.stroke();
        } else if (p.type === 'crate') {
            // Kiste
            const s = r * 0.85;
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(px - s / 2, py - s / 2, s, s);
            ctx.strokeStyle = '#cc5500';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px - s / 2, py - s / 2, s, s);
            // Kreuz
            ctx.beginPath();
            ctx.moveTo(px - s / 2, py - s / 2);
            ctx.lineTo(px + s / 2, py + s / 2);
            ctx.moveTo(px + s / 2, py - s / 2);
            ctx.lineTo(px - s / 2, py + s / 2);
            ctx.strokeStyle = '#cc5500';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Index-Label (zum Identifizieren)
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(8, tSize * 0.55)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(String(idx + 1), px, py + r * 1.5);
        ctx.textAlign = 'left';
    });
    // ── END PAYLOADS ──────────────────────────────────────────────────────────

    // Wind-Kompass
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

    // Painter's Algorithm: von hinten nach vorne (x+y aufsteigend)
    for (let d = 0; d < m.gridSize * 2; d += step) {
        for (let x = 0; x <= d; x += step) {
            const y = d - x;
            if (x >= m.gridSize || y >= m.gridSize) continue;

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
        const rad = (m.carrierAngle * Math.PI) / 180 - Math.PI / 2;
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

    // ── PAYLOADS im ISO-Preview ───────────────────────────────────────────────
    if (mode === 'filled') {
        const payloads = m.payloads || [];
        payloads.forEach(p => {
            const h = m.terrain[p.x] ? (m.terrain[p.x][p.y] ?? 0) : 0;
            const iso = getIso(p.x + 0.5, p.y + 0.5, Math.max(h, 0) + 0.5);
            if (p.type === 'person') {
                tCtx.fillStyle = '#ffe033';
                tCtx.beginPath();
                tCtx.arc(iso.x, iso.y, 4, 0, Math.PI * 2);
                tCtx.fill();
                tCtx.strokeStyle = '#cc9900';
                tCtx.lineWidth = 1;
                tCtx.stroke();
            } else if (p.type === 'crate') {
                tCtx.fillStyle = '#ff8800';
                tCtx.fillRect(iso.x - 4, iso.y - 3, 8, 6);
                tCtx.strokeStyle = '#cc5500';
                tCtx.lineWidth = 1;
                tCtx.strokeRect(iso.x - 4, iso.y - 3, 8, 6);
            }
        });
    }
    // ── END PAYLOADS ──────────────────────────────────────────────────────────
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

/**
 * Rendert die Mission im Tron-Wireframe-Stil in einen Offscreen-Canvas
 * und gibt das Ergebnis als data:image/jpeg;base64 zurück.
 */
export const generatePreviewBase64 = (): string => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 400;
    offscreen.height = 300;
    const offCtx = offscreen.getContext('2d')!;

    // Schwarzer Hintergrund – Tron-Look
    offCtx.fillStyle = '#001122';
    offCtx.fillRect(0, 0, 400, 300);

    const m = getCurrentMission();
    if (!m) return offscreen.toDataURL('image/jpeg', 0.8);

    // renderIso im wireframe-Modus, isFull=true (kein Pan/Zoom-Offset)
    renderIso(offCtx, 400, 300, 'wireframe', 0, 1, 0, 0, true);

    return offscreen.toDataURL('image/jpeg', 0.8);
};

// Pure isometric mission map renderer.
// Shared between the game (briefing preview) and the workbench (editor preview).
// Accepts a plain mission-like object — no DOM refs, no global state.
import { COLORS, getLandColor } from './constants';

export interface MissionMapData {
    terrain: number[][];
    gridSize: number;
    objects: { type: string; x: number; y: number; angle?: number; [k: string]: any }[];
    night: boolean;
    foliage?: { x: number; y: number; s: number; type: string }[];
    payloads?: { type: 'person' | 'crate'; x: number; y: number; [k: string]: any }[];
}

export const renderIso = (
    tCtx: CanvasRenderingContext2D,
    tW: number,
    tH: number,
    mode: 'filled' | 'wireframe',
    zScale: number,
    pX: number,
    pY: number,
    m: MissionMapData,
    isFull = false,
    forcedStep?: number,
) => {
    if (!m) return;

    const isoW = m.gridSize;
    const isoH = m.gridSize / 2 + 5;
    const fitW = (tW * 0.9) / isoW;
    const fitH = (tH * 0.9) / isoH;
    const sTW = Math.min(fitW, fitH) * (isFull ? 1 : zScale);
    const sTH = sTW / 2;
    const sH = sTW * (25 / 64); // matches game: tileW=64, stepH=25
    const cX = tW / 2 + (isFull ? 0 : pX);
    const cY = tH * 0.1 + (isFull ? 0 : pY);
    const step = forcedStep ?? (mode === 'wireframe' ? 4 : 1);

    const getIso = (vx: number, vy: number, vz: number) => ({
        x: cX + (vx - vy) * (sTW / 2),
        y: cY + (vx + vy) * (sTH / 2) - vz * sH,
    });

    for (let d = 0; d < m.gridSize * 2; d += step) {
        for (let x = 0; x <= d; x += step) {
            const y = d - x;
            if (x >= m.gridSize || y >= m.gridSize) continue;
            const nx = Math.min(x + step, m.gridSize);
            const ny = Math.min(y + step, m.gridSize);
            const h0 = m.terrain[x][y];
            const h1 = m.terrain[nx]?.[y] ?? h0;
            const h2 = m.terrain[nx]?.[ny] ?? h0;
            const h3 = m.terrain[x]?.[ny] ?? h0;
            const p0 = getIso(x, y, h0), p1 = getIso(nx, y, h1);
            const p2 = getIso(nx, ny, h2), p3 = getIso(x, ny, h3);

            tCtx.beginPath();
            tCtx.moveTo(p0.x, p0.y);
            tCtx.lineTo(p1.x, p1.y);
            tCtx.lineTo(p2.x, p2.y);
            tCtx.lineTo(p3.x, p3.y);
            tCtx.closePath();

            if (mode === 'filled') {
                tCtx.fillStyle = h0 <= 0 ? (m.night ? COLORS.waterNight : COLORS.water) : getLandColor(h0, m.night);
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

    m.objects.forEach((obj) => {
        if (obj.type === 'pad') {
            const pp = getIso(obj.x + 4, obj.y + 4, m.terrain[obj.x + 4]?.[obj.y + 4] ?? 0);
            if (mode === 'filled') {
                tCtx.fillStyle = m.night ? COLORS.padNight : COLORS.padStroke;
                tCtx.fillRect(pp.x - 10, pp.y - 5, 20, 10);
            } else {
                tCtx.strokeStyle = COLORS.uiHighlight;
                tCtx.strokeRect(pp.x - 10, pp.y - 5, 20, 10);
            }
        } else if (obj.type === 'carrier') {
            const rad = (obj.angle ?? 0) * (Math.PI / 180);
            const cCos = Math.cos(rad), cSin = Math.sin(rad);
            const p0 = getIso(obj.x + 6 * cCos - 1.5 * cSin, obj.y + 6 * cSin + 1.5 * cCos, 0.5);
            const p1 = getIso(obj.x - 6 * cCos - 1.5 * cSin, obj.y - 6 * cSin + 1.5 * cCos, 0.5);
            const p2 = getIso(obj.x - 6 * cCos + 1.5 * cSin, obj.y - 6 * cSin - 1.5 * cCos, 0.5);
            const p3 = getIso(obj.x + 6 * cCos + 1.5 * cSin, obj.y + 6 * cSin - 1.5 * cCos, 0.5);
            tCtx.beginPath();
            tCtx.moveTo(p0.x, p0.y); tCtx.lineTo(p1.x, p1.y);
            tCtx.lineTo(p2.x, p2.y); tCtx.lineTo(p3.x, p3.y);
            tCtx.closePath();
            if (mode === 'filled') {
                tCtx.fillStyle = m.night ? COLORS.carrierNight : COLORS.carrierBase;
                tCtx.fill();
            } else {
                tCtx.strokeStyle = COLORS.uiHighlight;
                tCtx.stroke();
            }
        }
    });

    if (mode === 'filled') {
        (m.foliage ?? []).forEach((f) => {
            const gz = Math.max(0, m.terrain[Math.round(f.x)]?.[Math.round(f.y)] ?? 0);
            if (gz <= 0) return;
            const s = f.s || 1.0;
            const trunkH = 0.5 * s;
            const p0 = getIso(f.x, f.y, gz);
            const p1 = getIso(f.x, f.y, gz + trunkH);
            tCtx.strokeStyle = '#5a3a1a';
            tCtx.lineWidth = Math.max(1, sTW * 0.04 * s);
            tCtx.beginPath(); tCtx.moveTo(p0.x, p0.y); tCtx.lineTo(p1.x, p1.y); tCtx.stroke();

            if (f.type === 'pine') {
                ([
                    { z: gz + trunkH * 0.3, r: 0.75 * s, col: '#1a4a1a' },
                    { z: gz + trunkH * 0.3 + 0.6 * s, r: 0.5 * s, col: '#1e5a1e' },
                    { z: gz + trunkH * 0.3 + 1.1 * s, r: 0.28 * s, col: '#246024' },
                ] as { z: number; r: number; col: string }[]).forEach(layer => {
                    const lp = getIso(f.x, f.y, layer.z);
                    tCtx.fillStyle = layer.col;
                    tCtx.beginPath();
                    tCtx.ellipse(lp.x, lp.y, layer.r * sTW, layer.r * sTH, 0, 0, Math.PI * 2);
                    tCtx.fill();
                });
            } else if (f.type === 'oak') {
                const cp = getIso(f.x, f.y, gz + trunkH + 0.6 * s);
                const cr = 0.65 * s;
                tCtx.fillStyle = '#1a3a0a';
                tCtx.beginPath(); tCtx.ellipse(cp.x + 2, cp.y + 1, cr * sTW * 1.1, cr * sTH * 1.1, 0, 0, Math.PI * 2); tCtx.fill();
                tCtx.fillStyle = '#2a6a1a';
                tCtx.beginPath(); tCtx.ellipse(cp.x, cp.y, cr * sTW, cr * sTH, 0, 0, Math.PI * 2); tCtx.fill();
                tCtx.fillStyle = '#3a8a2a';
                tCtx.beginPath(); tCtx.ellipse(cp.x - sTW * 0.2 * s, cp.y - sTH * 0.3 * s, cr * sTW * 0.7, cr * sTH * 0.7, 0, 0, Math.PI * 2); tCtx.fill();
            } else if (f.type === 'bush') {
                const bp = getIso(f.x, f.y, gz + 0.15 * s);
                tCtx.fillStyle = '#1a4a0a';
                tCtx.beginPath(); tCtx.ellipse(bp.x, bp.y, 0.7 * s * sTW, 0.4 * s * sTH, 0, 0, Math.PI * 2); tCtx.fill();
                tCtx.fillStyle = '#3a7a2a';
                tCtx.beginPath(); tCtx.ellipse(bp.x, bp.y - sTH * 0.2 * s, 0.55 * s * sTW, 0.32 * s * sTH, 0, 0, Math.PI * 2); tCtx.fill();
            } else if (f.type === 'dead') {
                const th = gz + trunkH + 0.8 * s;
                const ptop = getIso(f.x, f.y, th);
                tCtx.strokeStyle = '#7a5a3a';
                tCtx.lineWidth = Math.max(1, sTW * 0.05 * s);
                tCtx.beginPath(); tCtx.moveTo(p1.x, p1.y); tCtx.lineTo(ptop.x, ptop.y); tCtx.stroke();
                tCtx.lineWidth = Math.max(0.5, sTW * 0.025 * s);
                (([[-0.3, 0.5, 0.4], [0.3, 0.5, 0.4], [-0.2, 0.8, 0.3], [0.2, 0.8, 0.3]] as number[][])).forEach(([dx, tz, len]) => {
                    const ab = getIso(f.x, f.y, gz + trunkH + tz * s);
                    const ae = getIso(f.x + dx * len * s, f.y, gz + trunkH + (tz + 0.25) * s);
                    tCtx.beginPath(); tCtx.moveTo(ab.x, ab.y); tCtx.lineTo(ae.x, ae.y); tCtx.stroke();
                });
            }
        });

        (m.payloads ?? []).forEach((p) => {
            const h = m.terrain[p.x]?.[p.y] ?? 0;
            const iso = getIso(p.x + 0.5, p.y + 0.5, Math.max(h, 0) + 0.5);
            if (p.type === 'person') {
                tCtx.fillStyle = '#ffe033';
                tCtx.beginPath(); tCtx.arc(iso.x, iso.y, 4, 0, Math.PI * 2); tCtx.fill();
                tCtx.strokeStyle = '#cc9900'; tCtx.lineWidth = 1; tCtx.stroke();
            } else if (p.type === 'crate') {
                tCtx.fillStyle = '#ff8800';
                tCtx.fillRect(iso.x - 4, iso.y - 3, 8, 6);
                tCtx.strokeStyle = '#cc5500'; tCtx.lineWidth = 1;
                tCtx.strokeRect(iso.x - 4, iso.y - 3, 8, 6);
            }
        });
    }
};

/** Renders a mission map preview onto a canvas. Background is cleared first. */
export const renderMissionPreview = (
    canvas: HTMLCanvasElement,
    data: MissionMapData,
) => {
    canvas.width = 340;
    canvas.height = 340;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = data.night ? COLORS.bgNight : COLORS.bgRain;
    ctx.fillRect(0, 0, 340, 340);
    renderIso(ctx, 340, 340, 'filled', 1, 0, 0, data, true);
};

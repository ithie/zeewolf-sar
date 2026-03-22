import { renderIso } from './render-utils';
import { COLORS } from '../shared/constants';

const canvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let zoom = 1.0;
let panX = 0;
let panY = 0;
let lastMX = 0;
let lastMY = 0;
let isDragging = false;
let currentMission: any = null;

const draw = () => {
    const m = currentMission;
    const W = canvas.width;
    const H = canvas.height;
    const half = Math.floor(W / 2);

    ctx.clearRect(0, 0, W, H);
    if (m && (m.night || m.rain)) {
        ctx.fillStyle = m.night ? COLORS.bgNight : COLORS.bgRain;
        ctx.fillRect(0, 0, W, H);
    }

    // Left: filled (abstrakt)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, half, H);
    ctx.clip();
    renderIso(ctx, half, H, 'filled', zoom, panX, panY, m);
    ctx.restore();

    // Divider
    ctx.strokeStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(half, 0);
    ctx.lineTo(half, H);
    ctx.stroke();

    // Right: wireframe (Gittermodell)
    ctx.save();
    ctx.translate(half, 0);
    ctx.beginPath();
    ctx.rect(0, 0, half, H);
    ctx.clip();
    renderIso(ctx, half, H, 'wireframe', 1, 0, 0, m, true);
    ctx.restore();
};

// ── Pan & Zoom ────────────────────────────────────────────────────────────────
canvas.onmousedown = e => {
    isDragging = true;
    lastMX = e.clientX;
    lastMY = e.clientY;
};
window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    panX += e.clientX - lastMX;
    panY += e.clientY - lastMY;
    lastMX = e.clientX;
    lastMY = e.clientY;
    draw();
});
window.addEventListener('mouseup', () => { isDragging = false; });

canvas.ondblclick = () => {
    zoom = 1.0; panX = 0; panY = 0;
    draw();
};

canvas.onwheel = e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (mx > canvas.width / 2) return; // wheel only on filled side
    const oldZoom = zoom;
    zoom = Math.max(1.0, Math.min(zoom * (e.deltaY < 0 ? 1.2 : 0.83), 20.0));
    if (zoom === 1.0) {
        panX = 0; panY = 0;
    } else {
        const r = zoom / oldZoom;
        panX = mx - canvas.width / 4 - (mx - (canvas.width / 4 + panX)) * r;
        panY = my - 30 - (my - (30 + panY)) * r;
    }
    draw();
};

// ── BroadcastChannel ──────────────────────────────────────────────────────────
const channel = new BroadcastChannel('zeewolf-editor');

channel.onmessage = e => {
    if (e.data.type === 'mission-update') {
        currentMission = e.data.mission;
        draw();
    }
};

// Request current state from the map editor
channel.postMessage({ type: 'preview-ready' });

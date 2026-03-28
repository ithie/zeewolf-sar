import { iso } from '../render';
import { HELI_TYPES } from '../heli-types';
import { tileW, tileH, stepH } from '../render-config';
import { zstate } from '../state';

let _G: any;
let _drawHeli: (...args: any[]) => void;

export const initHeliSelect = (G: any, drawHeli: (...args: any[]) => void) => {
    _G = G;
    _drawHeli = drawHeli;
};

export const animMainMenuBg = () => {
    if (document.getElementById('main-menu')!.style.display === 'none') return;
    const c = document.getElementById('main-menu-bg-canvas') as HTMLCanvasElement | null;
    if (!c) return;
    const cx = c.getContext('2d')!;
    c.width = 900; c.height = 500;
    cx.clearRect(0, 0, c.width, c.height);
    const t = Date.now() * 0.001;
    const offIso = (wx: number, wy: number, wz: number, camX: number, camY: number) =>
        iso(wx, wy, wz, camX, camY, { canvas: c, tileW, tileH, stepH });
    _drawHeli('dolphin', 0, 0, 0, t * 0.25, Math.sin(t * 0.4) * 0.07, Math.cos(t * 0.35) * 0.07, t * 8, 0, 0, {
        targetCtx: cx, targetIso: offIso, scaleOverride: 5,
    });
    requestAnimationFrame(animMainMenuBg);
};

export const drawMenuHeli = () => {
    if (zstate.gameStarted) return;
    const c = document.getElementById('menu-heli-big') as HTMLCanvasElement | null;
    if (!c) return;
    const cx = c.getContext('2d')!;
    c.width = 800;
    c.height = 300;
    cx.clearRect(0, 0, 800, 300);
    const t = Date.now() * 0.001;
    const offIso = (wx: number, wy: number, wz: number, camX: number, camY: number) =>
        iso(wx, wy, wz, camX, camY, { canvas: c, tileW, tileH, stepH });
    _drawHeli('dolphin', 1.5, 1.5, 0.8, t * 0.5, Math.sin(t) * 0.1, Math.cos(t) * 0.1, t * 12, 0, 0, {
        targetCtx: cx, targetIso: offIso, scaleOverride: 3,
    });
    const splashVisible = document.getElementById('splash')!.style.display !== 'none';
    if (splashVisible) requestAnimationFrame(drawMenuHeli);
};

export const animateHeliPreviews = () => {
    if (document.getElementById('heli-select')!.style.display === 'none') return;
    HELI_TYPES.forEach(ht => {
        if (_G.menuHover[ht.id]) {
            _G.menuAngles[ht.id] += 0.012;
        } else {
            const diff = -0.075 - _G.menuAngles[ht.id];
            _G.menuAngles[ht.id] += Math.abs(diff) > 0.01 ? diff * 0.1 : 0;
        }
        const c = document.getElementById('icon-' + ht.id) as HTMLCanvasElement | null;
        if (c) {
            const cx = c.getContext('2d')!;
            c.width = 300;
            c.height = 200;
            cx.clearRect(0, 0, 300, 200);
            const offIso = (wx: number, wy: number, wz: number, camX: number, camY: number) =>
                iso(wx, wy, wz, camX, camY, { canvas: c, tileW, tileH, stepH });
            _drawHeli(ht.id, 0, 0, 0, _G.menuAngles[ht.id], 0, 0, 0, 0, 0, {
                targetCtx: cx, targetIso: offIso, scaleOverride: ht.previewScale,
            });
        }
    });
    requestAnimationFrame(animateHeliPreviews);
};

export const buildHeliSelect = (campaignType: string) => {
    const container = document.getElementById('heli-options');
    if (!container) return;
    container.innerHTML = '';
    const isGlider = campaignType === 'glider';
    const types = isGlider
        ? HELI_TYPES.filter(ht => ht.id === 'glider')
        : HELI_TYPES.filter(ht => ht.id !== 'glider');
    container.style.gridTemplateColumns = types.length === 1 ? '1fr' : '1fr 1fr 1fr';
    container.style.width = types.length === 1 ? '350px' : '900px';
    (document.querySelector('#heli-select .subtitle') as HTMLElement)!.textContent =
        isGlider ? 'FLUGZEUG WÄHLEN' : 'HUBSCHRAUBER WÄHLEN';
    types.forEach(ht => {
        const div = document.createElement('div');
        div.className = 'grid-box';
        div.setAttribute('onclick', `startGame('${ht.id}')`);
        div.setAttribute('onmouseenter', `setHover('${ht.id}', true)`);
        div.setAttribute('onmouseleave', `setHover('${ht.id}', false)`);
        div.innerHTML = `<canvas id="icon-${ht.id}" class="mini-canvas" width="300" height="200"></canvas>
            <div class="box-label">${ht.selectLabel}</div>
            <div class="box-sub">${ht.selectSub}</div>
            <div class="box-sub" style="color: #aaa">${ht.selectCap}</div>`;
        container.appendChild(div);
    });
};

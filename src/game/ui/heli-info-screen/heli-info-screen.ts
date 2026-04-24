import './heli-info-screen.css';
import { iso } from '../../render';
import { HELI_TYPES } from '../../heli-types';
import { RANKS } from '../../session';
import { tileW, tileH, stepH } from '../../render-config';
import { ensureEl as _ensureEl } from '../dom-helpers';
import { showScreen } from '../nav';
import { I18N } from '../../i18n';

let _G: any;
let _drawHeli: (...args: any[]) => void;
let _getRankIndex: () => number = () => 0;
let _onBack: (() => void) | null = null;

let _selectedHeliInfoId: string | null = null;
let _rotorPos = 0;

export const mountHeliInfoScreen = (onBack: () => void): void => {
    _onBack = onBack;
    const root = _ensureEl('heli-info');
    root.classList.add('ui-screen');
    root.innerHTML = `
        <div class="title">HANGAR</div>
        <div class="subtitle">TYPENÜBERSICHT</div>
        <div id="heli-info-stage">
            <div id="heli-cards-area"></div>
            <div id="heli-detail-panel"></div>
        </div>
        <div class="back-btn" id="heli-info-back">&#9664; ZURÜCK</div>`;
    document.getElementById('heli-info-back')!.addEventListener('click', _handleBack);
};

const _handleBack = () => {
    if (_selectedHeliInfoId) {
        // deselect → back to overview
        _selectHeliInfo(_selectedHeliInfoId);
    } else {
        _onBack?.();
    }
};

export const initHeliInfoScreen = (
    G: any,
    drawHeli: (...args: any[]) => void,
    getRankIndex: () => number,
) => {
    _G = G;
    _drawHeli = drawHeli;
    _getRankIndex = getRankIndex;
};

export const toHeliInfo = () => {
    _selectedHeliInfoId = null;
    _buildHeliInfoCards();
    showScreen('heli-info');
    _animHeliInfo();
};

const _buildHeliInfoCards = () => {
    const rankIndex = _getRankIndex();
    const area = document.getElementById('heli-cards-area')!;
    area.innerHTML = '';
    const panel = document.getElementById('heli-detail-panel')!;
    panel.classList.remove('visible');
    panel.innerHTML = '';

    HELI_TYPES.filter(ht => ht.id !== 'glider').forEach(ht => {
        const locked = ht.minRankIndex > rankIndex;
        const card = document.createElement('div');
        card.className = 'heli-card' + (locked ? ' rank-locked' : '');
        card.id = 'heli-card-' + ht.id;

        if (locked) {
            const reqRank = RANKS[ht.minRankIndex];
            card.innerHTML = `<canvas id="heli-info-cv-${ht.id}" width="254" height="180"></canvas>
                <div class="heli-card-label">${ht.selectLabel}</div>
                <div class="heli-lock-badge">${I18N.HELI_LOCKED_FROM(reqRank.name.toUpperCase())}</div>`;
        } else {
            card.innerHTML = `<canvas id="heli-info-cv-${ht.id}" width="254" height="180"></canvas>
                <div class="heli-card-label">${ht.selectLabel}</div>`;
            card.addEventListener('click', () => _selectHeliInfo(ht.id));
        }

        area.appendChild(card);
    });
};

const _selectHeliInfo = (id: string) => {
    const types = HELI_TYPES.filter(ht => ht.id !== 'glider');
    const panel = document.getElementById('heli-detail-panel')!;

    if (_selectedHeliInfoId === id) {
        _selectedHeliInfoId = null;
        types.forEach(ht => {
            document.getElementById('heli-card-' + ht.id)!.classList.remove('collapsed');
        });
        panel.classList.remove('visible');
        return;
    }

    _selectedHeliInfoId = id;
    _rotorPos = 0;
    types.forEach(ht => {
        const card = document.getElementById('heli-card-' + ht.id)!;
        if (ht.id === id) card.classList.remove('collapsed');
        else card.classList.add('collapsed');
    });

    const ht = HELI_TYPES.find(h => h.id === id)!;
    const spd = Math.min(100, Math.round(ht.accel / 0.00117 * 100));
    const agi = Math.min(100, Math.round(ht.tiltSpeed / 0.05 * 100));
    const cap = Math.min(100, Math.round(ht.maxLoad / 20 * 100));
    const end = Math.min(100, Math.max(0, Math.round((0.012 - ht.fuelRate) / 0.012 * 90 + 10)));
    const bar = (lbl: string, pct: number) => `<div class="heli-stat-row">
        <span class="heli-stat-label">${lbl}</span>
        <div class="heli-stat-bar"><div class="heli-stat-fill" data-pct="${pct}"></div></div>
    </div>`;
    panel.innerHTML = `
        <div class="heli-detail-name">${ht.selectLabel}</div>
        <div class="heli-detail-sub">${ht.selectSub}</div>
        <div class="heli-detail-fluff">${ht.description || ''}</div>
        ${bar('GESCHW.', spd)}${bar('AGILITÄT', agi)}${bar('KAPAZITÄT', cap)}${bar('AUSDAUER', end)}
        <div style="font-size:12px;color:#333;letter-spacing:2px;margin-top:16px">${ht.canCarryCargo ? '✦ CARGOFÄHIG' : ''}</div>`;
    panel.classList.add('visible');
    setTimeout(() => {
        panel.querySelectorAll('.heli-stat-fill').forEach((el: Element) => {
            (el as HTMLElement).style.width = (el as HTMLElement).dataset.pct + '%';
        });
    }, 60);
};

const _animHeliInfo = () => {
    if (document.getElementById('heli-info')!.style.display === 'none') return;

    if (_selectedHeliInfoId) _rotorPos += 0.22;

    HELI_TYPES.filter(ht => ht.id !== 'glider').forEach(ht => {
        const c = document.getElementById('heli-info-cv-' + ht.id) as HTMLCanvasElement | null;
        if (!c) return;

        const isSelected = ht.id === _selectedHeliInfoId;
        if (isSelected) {
            _G.menuAngles[ht.id] += 0.009;
        } else {
            // snap back to rest angle when not selected
            const diff = -0.075 - _G.menuAngles[ht.id];
            if (Math.abs(diff) > 0.001) _G.menuAngles[ht.id] += diff * 0.1;
        }

        const cx = c.getContext('2d')!;
        c.width = 254; c.height = 180;
        cx.clearRect(0, 0, 254, 180);
        const offIso = (wx: number, wy: number, wz: number, camX: number, camY: number) =>
            iso(wx, wy, wz, camX, camY, { canvas: c, tileW, tileH, stepH });
        _drawHeli(ht.id, 0, 0, 0, _G.menuAngles[ht.id], 0, 0,
            isSelected ? _rotorPos : 0,
            0, 0,
            { targetCtx: cx, targetIso: offIso, scaleOverride: ht.previewScale * 0.6 });
    });
    requestAnimationFrame(_animHeliInfo);
};

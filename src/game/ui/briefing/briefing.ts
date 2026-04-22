import './briefing.css';
import { I18N } from '../../i18n';
import { COMMANDER_SVG } from '../../main';
import { ensureEl as _ensureEl } from '../dom-helpers';

export const mountBriefing = () => {
    const el = _ensureEl('mission-briefing');
    el.classList.add('ui-screen');
    el.innerHTML = `
        <div id="briefing-content">
            <img id="briefing-map" src="" alt="Mission Map" />
            <div id="briefing-text">
                <div id="briefing-address"></div>
                <div id="briefing-headline"></div>
                <div id="briefing-sublines"></div>
                <div id="briefing-body"></div>
                <div id="briefing-hint">${I18N.CLICK_TO_DEPLOY}</div>
            </div>
        </div>
        <div id="briefing-commander-wrap">
            <div id="briefing-commander-img">${COMMANDER_SVG}</div>
        </div>`;
    el.addEventListener('click', () => _onDismiss?.());
};

let _onDismiss: (() => void) | null = null;

export const initBriefing = (onDismiss: () => void) => {
    _onDismiss = onDismiss;
};

export const showBriefing = (
    headline: string | undefined,
    sublines: string[] | undefined,
    briefing: string | undefined,
    previewBase64: string | undefined,
    address: string,
) => {
    const mapEl = document.getElementById('briefing-map') as HTMLImageElement;
    if (previewBase64) {
        mapEl.src = previewBase64;
        mapEl.style.display = 'block';
    } else {
        mapEl.style.display = 'none';
    }
    document.getElementById('briefing-address')!.textContent = address;
    document.getElementById('briefing-headline')!.textContent = headline || 'MISSION BRIEFING';
    const sublinesEl = document.getElementById('briefing-sublines')!;
    sublinesEl.innerHTML =
        Array.isArray(sublines) && sublines.length ? sublines.map(s => `▸ ${s}`).join('<br>') : '';
    document.getElementById('briefing-body')!.textContent = briefing || '';
    document.getElementById('mission-briefing')!.style.display = 'flex';
};

export const hideBriefing = () => {
    document.getElementById('mission-briefing')!.style.display = 'none';
};

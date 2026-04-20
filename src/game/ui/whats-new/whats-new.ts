import './whats-new.css';
import { I18N } from '../../i18n';

const _ensureEl = (id: string): HTMLElement => {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el); }
    return el;
};

export const mountWhatsNew = () => {
    const el = _ensureEl('whats-new-overlay');
    el.classList.add('ui-screen');
    el.innerHTML = `
        <div id="whats-new-version">NEUIGKEITEN · ${I18N.WHATS_NEW_VERSION}</div>
        <div id="whats-new-title">${I18N.WHATS_NEW_TITLE.toUpperCase()}</div>
        <ul id="whats-new-items">
            ${[...I18N.WHATS_NEW_ITEMS].map(item => `<li>${item}</li>`).join('')}
        </ul>
        <div id="whats-new-hint">${I18N.WHATS_NEW_HINT}</div>`;
    el.addEventListener('click', hideWhatsNew);
};

export const showWhatsNewIfNeeded = (
    lastSeenVersion: string,
    onDismiss: () => void,
): boolean => {
    if (lastSeenVersion === I18N.WHATS_NEW_VERSION || !I18N.WHATS_NEW_VERSION) return false;
    _onDismiss = onDismiss;
    document.getElementById('whats-new-overlay')!.style.display = 'flex';
    return true;
};

let _onDismiss: (() => void) | null = null;

const hideWhatsNew = () => {
    document.getElementById('whats-new-overlay')!.style.display = 'none';
    _onDismiss?.();
};

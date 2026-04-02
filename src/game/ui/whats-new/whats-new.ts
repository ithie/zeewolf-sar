import './whats-new.css';
import type { ChangelogEntry } from '../../../../plugins/changelog-latest';

declare const __WHATS_NEW__: ChangelogEntry;

export const mountWhatsNew = () => {
    const el = document.getElementById('whats-new-overlay')!;
    el.innerHTML = `
        <div id="whats-new-version">NEUIGKEITEN · ${__WHATS_NEW__.version}</div>
        <div id="whats-new-title">${__WHATS_NEW__.title.toUpperCase()}</div>
        <ul id="whats-new-items">
            ${__WHATS_NEW__.items.map(item => `<li>${item}</li>`).join('')}
        </ul>
        <div id="whats-new-hint">KLICKEN ZUM FORTFAHREN</div>`;
    el.addEventListener('click', hideWhatsNew);
};

export const showWhatsNewIfNeeded = (
    lastSeenVersion: string,
    onDismiss: () => void,
): boolean => {
    if (lastSeenVersion === __WHATS_NEW__.version || !__WHATS_NEW__.version) return false;
    _onDismiss = onDismiss;
    document.getElementById('whats-new-overlay')!.style.display = 'flex';
    return true;
};

let _onDismiss: (() => void) | null = null;

const hideWhatsNew = () => {
    document.getElementById('whats-new-overlay')!.style.display = 'none';
    _onDismiss?.();
};

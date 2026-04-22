import './credits-screen.css';
import { soundHandler, musicConfig } from '../../main';
import { I18N } from '../../i18n';

import { ensureEl as _ensureEl } from '../dom-helpers';

export const mountCreditsScreen = (onBack: () => void): void => {
    const root = _ensureEl('credits-screen');
    root.classList.add('ui-screen');
    const canvas = document.createElement('canvas');
    canvas.id = 'credits-canvas';
    const inner = document.createElement('div');
    inner.id = 'credits-inner';
    const back = document.createElement('div');
    back.className = 'back-btn';
    back.innerHTML = '&#9664; ZURÜCK';
    back.addEventListener('click', onBack);
    root.appendChild(canvas);
    root.appendChild(inner);
    root.appendChild(back);
};

export const toCredits = () => {
    document.getElementById('main-menu')!.style.display = 'none';
    _buildCredits();
    document.getElementById('credits-screen')!.style.display = 'flex';
    if (musicConfig.credits) soundHandler.play(musicConfig.credits, true);
};

const _buildCredits = () => {
    const inner = document.getElementById('credits-inner')!;
    inner.innerHTML = '';
    const sections = [
        { role: I18N.CREDITS_ROLE_DEVELOPMENT, names: ['Yarrick'] },
        { role: I18N.CREDITS_ROLE_CAMPAIGN, names: ['Yarrick', 'Jay "G" Man'] },
        { role: I18N.CREDITS_ROLE_SOUND, names: ['Gaunt'] },
        { role: I18N.CREDITS_ROLE_TEST, names: ['Da Harp', 'Jay "G" Man', 'DBuhn', 'Bri B.'] },
        { role: I18N.CREDITS_ROLE_INSPIREDBY, names: ['Zeewolf (Binary Asylum, 1994)'] },
    ];
    const title = document.createElement('div');
    title.className = 'credits-title';
    title.textContent = I18N.MENU_CREDITS;
    inner.appendChild(title);
    let delay = 0.15;
    sections.forEach(s => {
        const sec = document.createElement('div');
        sec.className = 'credits-section';
        const role = document.createElement('div');
        role.className = 'credits-role';
        role.textContent = s.role;
        sec.appendChild(role);
        s.names.forEach(nm => {
            const el = document.createElement('div');
            el.className = 'credits-name';
            el.textContent = nm;
            el.style.animationDelay = delay + 's';
            delay += 0.18;
            sec.appendChild(el);
        });
        inner.appendChild(sec);
        const div = document.createElement('div');
        div.className = 'credits-divider';
        inner.appendChild(div);
    });
    const made = document.createElement('div');
    made.className = 'credits-made-with';
    made.textContent = I18N.MADE_WITH;
    inner.appendChild(made);
    const copy = document.createElement('div');
    copy.className = 'credits-copyright';
    copy.textContent = I18N.COPYRIGHT;
    inner.appendChild(copy);
};

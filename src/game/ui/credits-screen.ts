import { soundHandler, musicConfig } from '../main';

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
        { role: 'SPIELDESIGN & ENTWICKLUNG', names: ['Yarrick'] },
        { role: 'KAMPAGNEN-DESIGN', names: ['Yarrick', 'Jay "G" Man'] },
        { role: 'SOUND & MUSIK', names: ['Gaunt'] },
        { role: 'BETA-TEST', names: ['Da Harp', 'Jay "G" Man', 'DBuhn'] },
        { role: 'INSPIRIERT VON', names: ['Zeewolf (Binary Asylum, 1994)'] },
    ];
    const title = document.createElement('div');
    title.className = 'credits-title';
    title.textContent = 'CREDITS';
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
    made.textContent = 'MADE WITH \u2665 IN JAVASCRIPT';
    inner.appendChild(made);
    const copy = document.createElement('div');
    copy.className = 'credits-copyright';
    copy.textContent = '\u00a9 2026 i.thie softworks \u2014 Alle Rechte vorbehalten.';
    inner.appendChild(copy);
};


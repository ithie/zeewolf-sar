import './settings-rankup.css';
import { I18N } from '../../i18n';
import { getRank, encodeSession, decodeSession, STORAGE_KEY, type PlayerSession, type Rank } from '../../session';

type Deps = {
    getSession: () => PlayerSession;
    saveSession: (s: PlayerSession) => void;
};

let _deps: Deps;

export const initSettings = (deps: Deps) => {
    _deps = deps;
};

export const mountSettingsRankup = () => {
    document.getElementById('settings-screen')!.innerHTML = `
        <div class="title" style="font-size: 48px">EINSTELLUNGEN</div>
        <div class="subtitle">PILOT PROFIL</div>
        <div id="settings-badge"></div>
        <div class="settings-field">
            <label>RUFZEICHEN (MAX. 8 ZEICHEN, A–Z)</label>
            <input id="player-name-input" type="text" maxlength="8" placeholder="—" />
        </div>
        <div id="settings-stats"></div>
        <div class="settings-field" style="margin-top: 8px">
            <label>SAVE CODE</label>
            <div id="settings-code-display">—</div>
        </div>
        <div class="settings-field">
            <label>CODE IMPORTIEREN (ÜBERSCHREIBT SPIELSTAND)</label>
            <div style="display:flex; gap: 10px; align-items: center">
                <input id="import-code-input" class="settings-field input" type="text" maxlength="10" placeholder="XXXXX-XXXX" />
                <button class="settings-btn" id="apply-save-code-btn">LADEN</button>
            </div>
            <div id="import-code-msg" style="font-size: 12px; letter-spacing: 2px; min-height: 18px; margin-top: 4px"></div>
        </div>
        <div style="margin-top: 20px; border-top: 1px solid #1a1a2e; padding-top: 16px; width: 100%; display: flex; flex-direction: column; align-items: center">
            <button id="delete-session-btn" class="settings-btn" style="background: #1a0000; border-color: #500; color: #c44">${I18N.DELETE_SESSION}</button>
            <div id="delete-session-msg" style="font-size: 12px; letter-spacing: 2px; color: #c44; min-height: 18px; margin-top: 6px"></div>
        </div>
        <div class="back-btn" id="from-settings-btn">&#9664; ZURÜCK</div>`;

    document.getElementById('apply-save-code-btn')!.addEventListener('click', applySaveCode);
    document.getElementById('delete-session-btn')!.addEventListener('click', deleteSessionData);
    document.getElementById('from-settings-btn')!.addEventListener('click', fromSettings);

    document.getElementById('rankup-overlay')!.innerHTML = `
        <div id="rankup-label">BEFÖRDERUNG</div>
        <div id="rankup-badge"></div>
        <div id="rankup-title"></div>
        <div id="rankup-address"></div>
        <p class="start-hint" style="color: #cc9900; margin-top: 10px">WEITER</p>`;

    document.getElementById('rankup-overlay')!.addEventListener('click', dismissRankUp);
};

export const rankBadgeHtml = (rank: Rank) =>
    `<div class="rank-board${rank.name === 'Major' ? ' major' : ''}">` +
    `<span class="rank-pips">${rank.pips}</span>` +
    `<span class="rank-label">${rank.name.toUpperCase()}</span>` +
    `</div>`;

const _refreshSettingsScreen = () => {
    const session = _deps.getSession();
    const rank = getRank(session);
    (document.getElementById('settings-badge') as HTMLElement).innerHTML = rankBadgeHtml(rank);
    (document.getElementById('settings-code-display') as HTMLElement).textContent = encodeSession(session);
    const statsEl = document.getElementById('settings-stats') as HTMLElement;
    const noSave = !session.cookieConsent ? I18N.NO_SAVE_STATE : '';
    statsEl.textContent = I18N.STATS(session.campaignsDone, session.missionsDone) + noSave;
};

export const toSettings = () => {
    _refreshSettingsScreen();
    const session = _deps.getSession();
    const input = document.getElementById('player-name-input') as HTMLInputElement;
    input.value = session.playerName || '';
    input.oninput = () => {
        session.playerName = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8);
        input.value = session.playerName;
        _deps.saveSession(session);
        _refreshSettingsScreen();
    };
    (document.getElementById('import-code-input') as HTMLInputElement).value = '';
    (document.getElementById('import-code-msg') as HTMLElement).textContent = '';
    (document.getElementById('main-menu') as HTMLElement).style.display = 'none';
    (document.getElementById('settings-screen') as HTMLElement).style.display = 'flex';
};

export const fromSettings = () => {
    (document.getElementById('settings-screen') as HTMLElement).style.display = 'none';
    (document.getElementById('main-menu') as HTMLElement).style.display = 'flex';
};

const applySaveCode = () => {
    const input = document.getElementById('import-code-input') as HTMLInputElement;
    const msg = document.getElementById('import-code-msg') as HTMLElement;
    const decoded = decodeSession(input.value.trim());
    if (!decoded) {
        msg.style.color = '#f44';
        msg.textContent = I18N.SAVE_CODE_INVALID;
        return;
    }
    const session = _deps.getSession();
    Object.assign(session, decoded);
    _deps.saveSession(session);
    input.value = '';
    msg.style.color = '#5f5';
    msg.textContent = I18N.SAVE_CODE_LOADED;
    _refreshSettingsScreen();
    (document.getElementById('player-name-input') as HTMLInputElement).value = session.playerName || '';
};

const deleteSessionData = () => {
    const btn = document.getElementById('delete-session-btn') as HTMLElement;
    btn.textContent = I18N.DELETE_CONFIRM;
    btn.onclick = _confirmDeleteSession;
};

const _confirmDeleteSession = () => {
    const msg = document.getElementById('delete-session-msg') as HTMLElement;
    msg.textContent = I18N.SESSION_DELETED;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setTimeout(() => window.location.reload(), 1200);
};

export const showRankUp = (rank: Rank, playerName: string) => {
    (document.getElementById('rankup-badge') as HTMLElement).innerHTML = rankBadgeHtml(rank);
    (document.getElementById('rankup-title') as HTMLElement).textContent = rank.name.toUpperCase();
    (document.getElementById('rankup-address') as HTMLElement).textContent =
        I18N.PILOT_ADDRESS(rank.name, playerName).toUpperCase();
    (document.getElementById('rankup-overlay') as HTMLElement).style.display = 'flex';
};

export const dismissRankUp = () => {
    (document.getElementById('rankup-overlay') as HTMLElement).style.display = 'none';
};

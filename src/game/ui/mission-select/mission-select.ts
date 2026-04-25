import './mission-select.css';
import { I18N, localize } from '../../i18n';
import { createBackButton } from '../back-button/back-button';
import { ensureEl } from '../dom-helpers';
import { isMissionUnlocked, type PlayerSession } from '../../session';
import type { CampaignExport } from '../../../shared/types';
import { showScreen } from '../nav';

type MissionSelectDeps = {
    campaign: CampaignExport;
    campaignIndex: number;
    session: PlayerSession;
    onSelect: (missionIndex: number) => void;
    onBack: () => void;
};

export const mountMissionSelect = () => {
    ensureEl('mission-select').classList.add('ui-screen');
};

export const showMissionSelect = (deps: MissionSelectDeps) => {
    const { campaign, campaignIndex, session, onSelect, onBack } = deps;
    const key = String(campaignIndex);
    const cp = session.campaignProgress[key];

    const el = document.getElementById('mission-select')!;
    el.innerHTML = `
        <div class="title">${localize(campaign.campaignTitle)}</div>
        <div class="subtitle">${I18N.MISSION_SELECT_SUB}</div>
        <div id="mission-grid"></div>
        `;
    el.appendChild(createBackButton(onBack));

    const grid = document.getElementById('mission-grid')!;
    campaign.levels.forEach((level, i) => {
        const unlocked = isMissionUnlocked(session, key, i, campaign.type);
        const mp = cp?.missions[i];
        const done = mp?.completed ?? false;
        const bestTime = mp?.bestTimeMs ?? null;

        const tile = document.createElement('div');
        tile.className = `grid-box${unlocked ? '' : ' locked'}`;

        if (unlocked) {
            const subs = [
                ...(level.sublines ?? []).map(s => `<div class="box-sub">${localize(s)}</div>`),
                done && bestTime !== null
                    ? `<div class="box-sub mission-time">${I18N.BEST_TIME(bestTime)}</div>`
                    : done
                    ? `<div class="box-sub mission-done">✓ ABGESCHLOSSEN</div>`
                    : '',
            ].join('');
            tile.innerHTML = `
                <div class="box-label${done ? ' mission-done' : ''}">${localize(level.headline)}</div>
                ${subs}`;
            tile.addEventListener('click', () => onSelect(i));
        } else {
            tile.innerHTML = `
                <div class="box-label">${localize(level.headline)}</div>
                <div class="box-sub" style="color:#333">${I18N.MISSION_LOCKED}</div>`;
        }

        grid.appendChild(tile);
    });

    showScreen('mission-select');
};

// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mock heavy / side-effectful dependencies ─────────────────────────────────

vi.mock('../../game/main', () => ({
    soundHandler: { play: vi.fn(), stop: vi.fn(), setVolume: vi.fn(), toggle: vi.fn() },
    musicConfig: { mainMenu: 'main', credits: 'credits', success: 'success', defeat: 'defeat' },
    COMMANDER_SVG: '<svg id="commander-mock"></svg>',
    campaignHandler: {},
    zinit: vi.fn(),
}));

vi.mock('../../game/multiplayer/rtc', () => ({
    createRTCPeer: vi.fn(() => ({ destroy: vi.fn() })),
}));

vi.mock('../../game/render', () => ({
    iso: vi.fn(() => ({ x: 0, y: 0 })),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { mountWhatsNew } from '../../game/ui/whats-new/whats-new';
import { mountMainMenu } from '../../game/ui/main-menu/main-menu';
import { mountBriefing } from '../../game/ui/briefing/briefing';
import { mountCookieBanner } from '../../game/ui/cookie-banner/cookie-banner';
import { mountMuteButton } from '../../game/ui/mute-button/mute-button';
import { initSettings, mountSettingsRankup } from '../../game/ui/settings/settings';
import { mountCreditsScreen } from '../../game/ui/credits-screen/credits-screen';
import { mountHeliInfoScreen } from '../../game/ui/heli-info-screen/heli-info-screen';
import { mountMpLobby } from '../../game/ui/mp-lobby/mp-lobby';
import type { PlayerSession } from '../../game/session';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const snap = (id: string) => expect(document.getElementById(id)!.innerHTML).toMatchSnapshot();

const mockSession = (): PlayerSession => ({
    cookieConsent: true,
    consentTimestamp: Date.now(),
    consentVersion: 'v25.0',
    playerName: 'TESTPILOT',
    campaignsDone: 0,
    missionsDone: 0,
    unlockedCampaignIndices: [],
    allUnlocked: false,
    lastSeenVersion: '25.0',
});

const mockSettingsDeps = () => ({
    getSession: mockSession,
    saveSession: vi.fn(),
    getControlMode: () => 'heading' as const,
    setControlMode: vi.fn(),
    isTouchDevice: () => false,
    isMusicEnabled: () => true,
    setMusicEnabled: vi.fn(),
    isSfxEnabled: () => true,
    setSfxEnabled: vi.fn(),
});

const noopCallbacks = {
    onStart: vi.fn(),
    onMultiplayer: vi.fn(),
    onHeli: vi.fn(),
    onSettings: vi.fn(),
    onCredits: vi.fn(),
    onSplashClick: vi.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => { document.body.innerHTML = ''; });

describe('UI screen snapshots', () => {
    it('whats-new', () => {
        mountWhatsNew();
        snap('whats-new-overlay');
    });

    it('splash (main-menu)', () => {
        mountMainMenu(noopCallbacks);
        snap('splash');
    });

    it('main-menu', () => {
        mountMainMenu(noopCallbacks);
        snap('main-menu');
    });

    it('briefing', () => {
        mountBriefing();
        snap('mission-briefing');
    });

    it('cookie-banner', () => {
        mountCookieBanner();
        snap('cookie-banner');
    });

    it('mute-button', () => {
        mountMuteButton({ isMuted: () => false, onToggle: vi.fn() });
        snap('audio-mute');
    });

    it('settings-screen', () => {
        initSettings(mockSettingsDeps());
        mountSettingsRankup();
        snap('settings-screen');
    });

    it('rankup-overlay', () => {
        initSettings(mockSettingsDeps());
        mountSettingsRankup();
        snap('rankup-overlay');
    });

    it('credits-screen', () => {
        mountCreditsScreen(vi.fn());
        snap('credits-screen');
    });

    it('heli-info-screen', () => {
        mountHeliInfoScreen(vi.fn());
        snap('heli-info');
    });

    it('mp-lobby-screen', () => {
        mountMpLobby();
        snap('mp-lobby-screen');
    });
});

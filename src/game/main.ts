import { CampaignExport } from '@/shared/types';
import Campaign from './campaigns/campaign.json';
import Tutorial from './campaigns/tutorial.json';
import LevelTest from './campaigns/leveltest.json';
import { decompressTerrain } from '../shared/utils';
import ZsynthPlayer from '../tracker/ZsynthPlayer';
import SoundTutorial from './music/clike.json';
import SoundMainTheme from './music/maintheme.json';
import SoundFinal from './music/final.json';
import { SongData } from '@/tracker/types';

const soundHandler = (() => {
    const songList: Record<string, SongData> = { final: SoundFinal, main: SoundMainTheme, tutorial: SoundTutorial };

    const state: { activeTheme: string; isMuted: boolean } = {
        activeTheme: '',
        isMuted: false,
    };

    ZsynthPlayer.init(songList);
    return {
        state,
        mute: () => {
            state.isMuted = true;
            ZsynthPlayer.stop();
        },
        unmute: () => {
            state.isMuted = false;
            ZsynthPlayer.play(state.activeTheme);
        },
        play: (theme: string, fade: boolean) => {
            if (!songList[theme]) {
                return;
            }
            state.activeTheme = theme;
            if (state.isMuted) {
                return;
            }
            ZsynthPlayer.play(theme, fade ? 0.25 : 0);
        },
        stop: () => {
            ZsynthPlayer.stop();
        },
    };
})();

const campaignHandler = () => {
    const campaigns: CampaignExport[] = [
        Tutorial as unknown as CampaignExport,
        LevelTest as unknown as CampaignExport,
        Campaign as unknown as CampaignExport,
    ];

    const campaignState = {
        activeCampaign: 0,
        activeMission: 0,
        maximumMissions: 0,
    };

    const getCampaigns = () => {
        return campaigns;
    };

    const getNextMission = () => {
        if (campaignState.activeMission + 1 >= campaignState.maximumMissions) {
            return 'DONE';
        }

        campaignState.activeMission = campaignState.activeMission + 1;

        return campaigns[campaignState.activeCampaign].levels[campaignState.activeMission];
    };

    const setActiveCampaign = (index: number) => {
        campaignState.activeCampaign = index;
        campaignState.activeMission = 0;
    };

    const setActiveMission = (index: number) => {
        campaignState.activeMission = index;
    };

    const getCurrentMissionData = () => {
        return campaigns[campaignState.activeCampaign].levels[campaignState.activeMission];
    };

    const getTerrain = () => {
        const { terrain, gridSize } = campaigns[campaignState.activeCampaign].levels[campaignState.activeMission];

        return {
            terrain: decompressTerrain(terrain, gridSize),
            gridSize,
        };
    };

    return {
        getCampaigns,
        campaign: {
            getNextMission,
            setActiveCampaign,
            setActiveMission,
        },
        getCurrentMissionData,
        getTerrain,
    };
};

window.campaignHandler = campaignHandler;
window.soundHandler = soundHandler;
window.zinit = () => {
    const muteUnmute = document.getElementById('audio-mute');
    if (!muteUnmute) {
        return;
    }
    const onClick = (evt: Event) => {
        evt.preventDefault();
        if (!soundHandler.state.isMuted) {
            soundHandler.mute();
        } else {
            soundHandler.unmute();
        }

        muteUnmute.innerHTML = `<span>${!soundHandler.state.isMuted ? 'MUTE' : 'UNMUTE'}</span>`;
    };

    muteUnmute.innerHTML = `<span>${!soundHandler.state.isMuted ? 'MUTE' : 'UNMUTE'}</span>`;
    muteUnmute.onclick = onClick;
};

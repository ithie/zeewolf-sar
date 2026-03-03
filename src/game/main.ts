import { CampaignExport } from '@/shared/types';
import Campaign from './campaigns/campaign.json';
import Tutorial from './campaigns/tutorial.json';
import LevelTest from './campaigns/leveltest.json';
import AddCamp from './campaigns/addCamp.json';
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
    let cachedTerrain: { terrain: number[][]; gridSize: number } | null = null;

    const campaigns: CampaignExport[] = [
        Tutorial as unknown as CampaignExport,
        AddCamp as unknown as CampaignExport,
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
        cachedTerrain = null;
        if (campaignState.activeMission + 1 >= campaignState.maximumMissions) {
            return 'DONE';
        }

        campaignState.activeMission = campaignState.activeMission + 1;

        const missionData = campaigns[campaignState.activeCampaign].levels[campaignState.activeMission];
        console.log('FULL MISSION DATA gnM:', missionData);
        return {
            ...missionData,
            carrierX: Number(missionData.carrierX),
            carrierY: Number(missionData.carrierY),
        };
    };

    const setActiveCampaign = (index: number) => {
        campaignState.activeCampaign = index;
        campaignState.activeMission = 0;
        campaignState.maximumMissions = campaigns[index].levels.length;
        cachedTerrain = null;
    };

    const setActiveMission = (index: number) => {
        campaignState.activeMission = index;
    };

    const getCurrentMissionData = () => {
        const missionData = campaigns[campaignState.activeCampaign].levels[campaignState.activeMission];
        return {
            ...missionData,
            carrierX: Number(missionData.carrierX),
            carrierY: Number(missionData.carrierY),
        };
    };

    const getTerrain = () => {
        if (!cachedTerrain) {
            const { terrain, gridSize } = campaigns[campaignState.activeCampaign].levels[campaignState.activeMission];
            cachedTerrain = {
                terrain: decompressTerrain(terrain, gridSize),
                gridSize,
            };
        }

        return cachedTerrain;
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

window.campaignHandler = campaignHandler();
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

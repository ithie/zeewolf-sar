import { CampaignExport } from '@/shared/types';
import Tutorial from './campaigns/tutorial.json';
import AddCamp from './campaigns/addCamp.json';
import ArchipelDemo from './campaigns/archipeldemo.json';
import Glider from './campaigns/glider.json';
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
        isMuted: true,
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
        ArchipelDemo as unknown as CampaignExport,
        AddCamp as unknown as CampaignExport,
        Glider as unknown as CampaignExport,
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
        return { ...missionData };
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
        return { ...missionData, campaignType: campaigns[campaignState.activeCampaign].type };
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
    const handle = (key: string, visibility: 'flex' | 'none') => {
        document.getElementById(key).style.display = visibility;
    };
    const muteUnmute = document.getElementById('audio-mute');
    if (!muteUnmute) {
        return;
    }
    const onClick = (evt: Event) => {
        evt.preventDefault();
        if (!soundHandler.state.isMuted) {
            soundHandler.mute();
            handle('audio-mute-active', 'flex');
            handle('audio-mute-inactive', 'none');
        } else {
            soundHandler.unmute();
            handle('audio-mute-active', 'none');
            handle('audio-mute-inactive', 'flex');
        }
    };

    if (soundHandler.state.isMuted) {
        handle('audio-mute-active', 'flex');
        handle('audio-mute-inactive', 'none');
    } else {
        handle('audio-mute-active', 'none');
        handle('audio-mute-inactive', 'flex');
    }

    muteUnmute.onclick = onClick;
};

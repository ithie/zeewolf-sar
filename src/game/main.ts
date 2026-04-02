import { CampaignExport, MissionData } from '@/shared/types';
export { COMMANDER_SVG } from './commander-svg';
import Tutorial from './campaigns/tutorial.json';
import AddCamp from './campaigns/addCamp.json';
import ArchipelDemo from './campaigns/archipeldemo.json';
import Glider from './campaigns/glider.json';
import Julian from './campaigns/julian.json';
import { decompressTerrain } from '../shared/utils';
import ZsynthPlayer from '../tracker/ZsynthPlayer';
import SoundAnothermenu from './music/anothermenu.zsong';
import SoundAnothersound from './music/anothersound.zsong';
import SoundBriefing from './music/briefing.zsong';
import SoundClike from './music/clike.zsong';
import SoundDestroid from './music/destroid.zsong';
import SoundFinal from './music/final.zsong';
import SoundMaintheme from './music/maintheme.zsong';
import SoundMenusound from './music/menusound.zsong';
import SoundSpocktribute from './music/spocktribute.zsong';
import SoundPartytime from './music/partytime.zsong';
import { SongData } from '@/tracker/types';
import MusicConfigJson from './music-config.json';

export const musicConfig: { mainMenu: string; credits: string; success: string; defeat: string } = MusicConfigJson;

const soundHandler = (() => {
    const songList: Record<string, SongData> = {
        anothermenu:  SoundAnothermenu,
        anothersound: SoundAnothersound,
        briefing:     SoundBriefing,
        clike:        SoundClike,
        destroid:     SoundDestroid,
        final:        SoundFinal,
        maintheme:    SoundMaintheme,
        menusound:    SoundMenusound,
        spocktribute: SoundSpocktribute,
        partytime:    SoundPartytime,
    };

    const state: { activeTheme: string; isMuted: boolean } = {
        activeTheme: '',
        isMuted: true, // WORKBENCH_MUTE — replaced with false at build time
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

const createCampaignHandler = () => {
    let cachedTerrain: { terrain: number[][]; gridSize: number } | null = null;

    const campaigns: CampaignExport[] = [
        Tutorial as unknown as CampaignExport,
        ArchipelDemo as unknown as CampaignExport,
        AddCamp as unknown as CampaignExport,
        Glider as unknown as CampaignExport,
        Julian as unknown as CampaignExport,
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

    const getCurrentMissionData = (): MissionData => {
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

    const getActiveCampaignMusic = (): { briefing?: string; ingame?: string } =>
        campaigns[campaignState.activeCampaign]?.music ?? {};

    return {
        getCampaigns,
        campaign: {
            getNextMission,
            setActiveCampaign,
            setActiveMission,
        },
        getCurrentMissionData,
        getActiveCampaignMusic,
        getTerrain,
    };
};

export const campaignHandler = createCampaignHandler();
export { soundHandler };
export const zinit = () => {
    const handle = (key: string, visibility: 'flex' | 'none') => {
        document.getElementById(key)!.style.display = visibility;
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

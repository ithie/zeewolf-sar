const zstate = () => {
    const state = {
        gameStarted: false,
        crashed: false,
        introActive: false,
        introProgress: 0,
        missionType: '',
        goalCount: 0,
        totalRescued: 0,
        totalSpawned: 0,
        cam: { x: 0, y: 0 },
    };

    return state;
};

window.zstate = zstate();

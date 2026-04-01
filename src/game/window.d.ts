declare global {
    interface Window {
        launchEasterEgg:    () => void;
        toCampaignSelect:   () => void;
        toMainMenu:         () => void;
        toHeliInfo:         () => void;
        toCredits:          () => void;
        backFromHeliSelect: () => void;
        returnToBase:       () => void;
        selectCampaign:     (index: string) => void;
        startGame:          (type: string) => void;
        setHover:           (type: string, state: boolean) => void;
        dismissBriefing:    () => void;
        toSettings:         () => void;
        fromSettings:       () => void;
        approveCookies:     () => void;
        declineCookies:     () => void;
        dismissRankUp:      () => void;
        applySaveCode:      () => void;
    }
}

export {};

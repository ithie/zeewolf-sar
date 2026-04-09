import './main-menu.css';
import { I18N } from '../../i18n';

type MainMenuCallbacks = {
    onStart: () => void;
    onMultiplayer: () => void;
    onHeli: () => void;
    onSettings: () => void;
    onCredits: () => void;
    onSplashClick: () => void;
};

export const mountMainMenu = (cb: MainMenuCallbacks) => {
    const splash = document.getElementById('splash')!;
    splash.innerHTML = `
        <div class="title">${I18N.SPLASH_TITLE}</div>
        <div class="subtitle" id="splash-version"></div>
        <canvas id="menu-heli-big"></canvas>
        <p class="start-hint">${I18N.SPLASH_HINT}</p>`;
    splash.addEventListener('click', cb.onSplashClick);

    const menu = document.getElementById('main-menu')!;
    menu.innerHTML = `
        <canvas id="main-menu-bg-canvas"></canvas>
        <div class="title">${I18N.MENU_TITLE}</div>
        <div class="subtitle" style="margin-bottom: 44px">${I18N.MENU_SUBTITLE}</div>
        <nav class="menu-nav">
            <div class="menu-item" id="menu-item-start">${I18N.MENU_START}</div>
            <div class="menu-item" id="menu-item-multiplayer">${I18N.MENU_MULTIPLAYER}</div>
            <div class="menu-item" id="menu-item-heli">${I18N.MENU_HELI}</div>
            <div class="menu-item" id="menu-item-settings">${I18N.MENU_SETTINGS}</div>
            <div class="menu-item" id="menu-item-credits">${I18N.MENU_CREDITS}</div>
        </nav>`;
    document.getElementById('menu-item-start')!.addEventListener('click', cb.onStart);
    document.getElementById('menu-item-multiplayer')!.addEventListener('click', cb.onMultiplayer);
    document.getElementById('menu-item-heli')!.addEventListener('click', cb.onHeli);
    document.getElementById('menu-item-settings')!.addEventListener('click', cb.onSettings);
    document.getElementById('menu-item-credits')!.addEventListener('click', cb.onCredits);
};

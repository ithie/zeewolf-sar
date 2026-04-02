import './cookie-banner.css';
import bannerHtml from './cookie-banner-content.html?raw';

export const mountCookieBanner = (): void => {
    document.getElementById('cookie-banner')!.innerHTML = bannerHtml;
};

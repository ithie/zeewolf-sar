import './cookie-banner.css';
import bannerHtml from './cookie-banner-content.html?raw';

let _onConsent: (() => void) | null = null;

export const mountCookieBanner = (onConsent?: () => void): void => {
    _onConsent = onConsent ?? null;
    document.getElementById('cookie-banner')!.innerHTML = bannerHtml;
};

export const notifyConsent = () => {
    _onConsent?.();
    _onConsent = null;
};

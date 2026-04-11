import './cookie-banner.css';
import bannerHtml from './cookie-banner-content.html?raw';

let _onConsent: (() => void) | null = null;

const _ensureEl = (id: string): HTMLElement => {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el); }
    return el;
};

export const mountCookieBanner = (onConsent?: () => void): void => {
    _onConsent = onConsent ?? null;
    _ensureEl('cookie-banner').innerHTML = bannerHtml;
};

export const notifyConsent = () => {
    _onConsent?.();
    _onConsent = null;
};

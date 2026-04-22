import './cookie-banner.css';
import bannerHtml from './cookie-banner-content.html?raw';
import { ensureEl as _ensureEl } from '../dom-helpers';

let _onConsent: (() => void) | null = null;

export const mountCookieBanner = (onConsent?: () => void): void => {
    _onConsent = onConsent ?? null;
    _ensureEl('cookie-banner').innerHTML = bannerHtml;
};

export const notifyConsent = () => {
    _onConsent?.();
    _onConsent = null;
};

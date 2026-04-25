import './back-button.css';
import { I18N } from '../../i18n';

export const createBackButton = (onClick: () => void): HTMLElement => {
    const btn = document.createElement('div');
    btn.className = 'back-btn';
    btn.textContent = I18N.BACK;
    btn.addEventListener('click', onClick);
    return btn;
};

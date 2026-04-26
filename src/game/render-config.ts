const _isMobile =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
    window.matchMedia('(pointer: coarse)').matches;

export const CANVAS_SCALE = _isMobile ? 0.5 : 1.0;
export const tileW = _isMobile ? 32 : 64;
export const tileH = _isMobile ? 16 : 32;
export const stepH = _isMobile ? 12.5 : 25;

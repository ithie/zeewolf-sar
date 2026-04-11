import './touch-controls.css';

export const mountTouchControls = (): void => {
    if (document.getElementById('touch-controls')) return;
    const el = document.createElement('div');
    el.id = 'touch-controls';
    el.innerHTML = `
        <div id="touch-pad-left">
            <div id="touch-winch">
                <button class="touch-btn touch-winch-btn" data-key="KeyQ">Q ↑</button>
                <button class="touch-btn touch-winch-btn" data-key="KeyE">E ↓</button>
            </div>
            <div class="joystick" id="joystick-left">
                <span class="js-n">W</span><span class="js-s">S</span>
                <span class="js-w">A</span><span class="js-e">D</span>
                <div class="joystick-knob"></div>
            </div>
        </div>
        <div class="joystick" id="joystick-right">
            <span class="js-n">▲</span><span class="js-s">▼</span>
            <span class="js-w">◀</span><span class="js-e">▶</span>
            <div class="joystick-knob"></div>
        </div>`;
    document.body.appendChild(el);
};

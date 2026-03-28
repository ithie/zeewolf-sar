type Particle = { x: number; y: number; vy: number; alpha: number; size: number; freq: number; color: string };

let _particles: Particle[] | null = null;
let _running = false;

export const startMenuParticles = () => {
    if (_running) return;
    _running = true;
    const c = document.getElementById('menu-particles-canvas') as HTMLCanvasElement | null;
    if (c) c.style.display = 'block';
    _animate();
};

export const stopMenuParticles = () => {
    _running = false;
    _particles = null;
    const c = document.getElementById('menu-particles-canvas') as HTMLCanvasElement | null;
    if (c) c.style.display = 'none';
};

const _animate = () => {
    if (!_running) return;
    const c = document.getElementById('menu-particles-canvas') as HTMLCanvasElement | null;
    if (!c) { _running = false; return; }
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const t = Date.now() * 0.001;

    // Scan lines (wandern nach unten)
    for (let i = 0; i < 5; i++) {
        const y = (t * 35 + (i * c.height) / 5) % c.height;
        ctx.strokeStyle = `rgba(0,220,70,${0.018 + i * 0.004})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(c.width, y);
        ctx.stroke();
    }

    // Partikel (steigen nach oben)
    if (!_particles) {
        _particles = Array.from({ length: 55 }, () => ({
            x: Math.random() * c.width,
            y: Math.random() * c.height,
            vy: 0.15 + Math.random() * 0.35,
            alpha: 0.08 + Math.random() * 0.22,
            size: 1 + Math.random() * 1.5,
            freq: 0.6 + Math.random() * 2,
            color: Math.random() > 0.72 ? '#ff6600' : '#00cc44',
        }));
    }
    _particles.forEach(p => {
        p.y -= p.vy;
        if (p.y < -4) p.y = c.height + 4;
        ctx.globalAlpha = p.alpha * (0.5 + Math.sin(t * p.freq) * 0.4);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(_animate);
};

type Particle = { x: number; y: number; vy: number; alpha: number; size: number; freq: number; color: string };

let _creditsParticles: Particle[] | null = null;

export const toCredits = () => {
    document.getElementById('main-menu').style.display = 'none';
    _buildCredits();
    document.getElementById('credits-screen').style.display = 'flex';
    _creditsParticles = null;
    _animCredits();
};

const _buildCredits = () => {
    const inner = document.getElementById('credits-inner');
    inner.innerHTML = '';
    const sections = [
        { role: 'GAME DESIGN & DEVELOPMENT', names: [{ n: 'Yarrick', h: true }] },
        { role: 'ISOMETRIC ART', names: [{ n: 'Yarrick', h: false }] },
        {
            role: 'SOUND & MUSIK',
            names: [
                { n: 'Yarrick', h: false },
                { n: 'Jay "G" Man', h: false },
            ],
        },
        {
            role: 'BETA TESTING',
            names: [
                { n: 'Da Harp', h: false },
                { n: 'Jay', h: false },
                { n: 'DBuhn', h: false },
            ],
        },
        {
            role: 'SPECIAL THANKS',
            names: [
                { n: 'Claude', h: false },
                { n: 'Das Internet', h: false },
            ],
        },
    ];
    const title = document.createElement('div');
    title.className = 'credits-title';
    title.textContent = 'CREDITS';
    inner.appendChild(title);
    let delay = 0.15;
    sections.forEach(s => {
        const sec = document.createElement('div');
        sec.className = 'credits-section';
        const role = document.createElement('div');
        role.className = 'credits-role';
        role.textContent = s.role;
        sec.appendChild(role);
        s.names.forEach(nm => {
            const el = document.createElement('div');
            el.className = 'credits-name' + (nm.h ? ' highlight' : '');
            el.textContent = nm.n;
            el.style.animationDelay = delay + 's';
            delay += 0.18;
            sec.appendChild(el);
        });
        inner.appendChild(sec);
        const div = document.createElement('div');
        div.className = 'credits-divider';
        inner.appendChild(div);
    });
    const made = document.createElement('div');
    made.className = 'credits-made-with';
    made.textContent = 'MADE WITH \u2665 IN JAVASCRIPT';
    inner.appendChild(made);
    const copy = document.createElement('div');
    copy.className = 'credits-copyright';
    copy.textContent = '\u00a9 2026 i.thie softworks \u2014 All rights reserved.';
    inner.appendChild(copy);
};

const _animCredits = () => {
    if (document.getElementById('credits-screen').style.display === 'none') return;
    const c = document.getElementById('credits-canvas') as HTMLCanvasElement;
    if (!c) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const t = Date.now() * 0.001;
    for (let i = 0; i < 5; i++) {
        const y = (t * 35 + (i * c.height) / 5) % c.height;
        ctx.strokeStyle = `rgba(0,220,70,${0.018 + i * 0.004})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(c.width, y);
        ctx.stroke();
    }
    if (!_creditsParticles) {
        _creditsParticles = Array.from({ length: 55 }, () => ({
            x: Math.random() * c.width,
            y: Math.random() * c.height,
            vy: 0.15 + Math.random() * 0.35,
            alpha: 0.08 + Math.random() * 0.22,
            size: 1 + Math.random() * 1.5,
            freq: 0.6 + Math.random() * 2,
            color: Math.random() > 0.72 ? '#ff6600' : '#00cc44',
        }));
    }
    _creditsParticles.forEach(p => {
        p.y -= p.vy;
        if (p.y < -4) p.y = c.height + 4;
        ctx.globalAlpha = p.alpha * (0.5 + Math.sin(t * p.freq) * 0.4);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(_animCredits);
};

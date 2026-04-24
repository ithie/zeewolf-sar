// ── Heli Sound Synthesis ────────────────────────────────────────────────────

const _IS_APP = import.meta.env.VITE_TARGET === 'app';

const BLADES: Record<string, number> = {
    dolphin: 4,
    coasthawk: 4,
    atlas: 3,
    osprey: 3,
    ...(!_IS_APP ? { glider: 0 } : {}),
};

const NOMINAL_RPM = 220;

// Presets per heli type: [clipAmount, filterCutHz, filterQ]
const PRESETS: Record<string, [number, number, number]> = {
    dolphin: [3.0, 120, 2.5],
    coasthawk: [3.0, 110, 2.5],
    atlas: [4.0, 90, 3.0],
    osprey: [3.5, 130, 2.2],
    ...(!_IS_APP ? { glider: [1.0, 200, 1.0] as [number, number, number] } : {}),
};

interface HeliSoundNodes {
    actx: AudioContext;
    osc: OscillatorNode;
    shaper: WaveShaperNode;
    filt: BiquadFilterNode;
    rotorGain: GainNode;
    master: GainNode;
    windSrc: AudioBufferSourceNode;
    windFilt: BiquadFilterNode;
    windGain: GainNode;
}

let _nodes: HeliSoundNodes | null = null;
let _sfxEnabled = true;

export const isSfxEnabled = (): boolean => _sfxEnabled;

export const setSfxEnabled = (enabled: boolean): void => {
    _sfxEnabled = enabled;
    if (_nodes && !enabled) {
        _nodes.master.gain.setTargetAtTime(0, _nodes.actx.currentTime, 0.1);
    }
};

const _buildCurve = (clipAmount: number): Float32Array<ArrayBuffer> => {
    const n = 256;
    const curve = new Float32Array(new ArrayBuffer(n * 4));
    for (let i = 0; i < n; i++) {
        const x = (i * 2) / (n - 1) - 1;
        curve[i] = Math.max(-1, Math.min(1, x * (1 + clipAmount * 8)));
    }
    return curve;
};

export const initHeliSound = (heliType: string): void => {
    stopHeliSound();

    const blades = BLADES[heliType] ?? 4;
    if (blades === 0) return;

    const [clipAmount, filterCut, filterQ] = PRESETS[heliType] ?? PRESETS['dolphin'];

    const actx = new AudioContext();

    const master = actx.createGain();
    master.gain.value = 0;
    master.connect(actx.destination);

    const osc = actx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = (NOMINAL_RPM / 60) * blades * 0.1;

    const shaper = actx.createWaveShaper();
    shaper.curve = _buildCurve(clipAmount);
    shaper.oversample = '4x';

    const filt = actx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = filterCut;
    filt.Q.value = filterQ;

    const rotorGain = actx.createGain();
    rotorGain.gain.value = 0.85;

    osc.connect(shaper);
    shaper.connect(filt);
    filt.connect(rotorGain);
    rotorGain.connect(master);

    osc.start();

    // Wind path: looped white noise → lowpass → gain (modulated each frame by G.wind)
    const noiseBuf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    const windSrc = actx.createBufferSource();
    windSrc.buffer = noiseBuf;
    windSrc.loop = true;

    const windFilt = actx.createBiquadFilter();
    windFilt.type = 'lowpass';
    windFilt.frequency.value = 200;
    windFilt.Q.value = 0.5;

    const windGain = actx.createGain();
    windGain.gain.value = 0;

    windSrc.connect(windFilt);
    windFilt.connect(windGain);
    windGain.connect(master);
    windSrc.start();

    _nodes = { actx, osc, shaper, filt, rotorGain, master, windSrc, windFilt, windGain };
};

export const updateHeliSound = (rotorRPM: number, engineOn: boolean, heliType: string, windSpeed: number): void => {
    if (!_nodes) return;
    const { actx, osc, filt, master, windGain } = _nodes;
    const t = actx.currentTime;

    const blades = BLADES[heliType] ?? 4;
    const [, filterCut] = PRESETS[heliType] ?? PRESETS['dolphin'];

    const bpf = ((rotorRPM * NOMINAL_RPM) / 60) * blades;
    osc.frequency.setTargetAtTime(Math.max(1, bpf), t, 0.08);
    filt.frequency.setTargetAtTime(filterCut, t, 0.05);

    const targetVol = _sfxEnabled ? (engineOn ? 0.15 + 0.55 * rotorRPM : 0.1 * rotorRPM) : 0;
    master.gain.setTargetAtTime(targetVol, t, 0.06);

    // windSpeed = Math.hypot(G.wind.x, G.wind.y), max ~0.0005 at windStr=10
    windGain.gain.setTargetAtTime(Math.min(1, windSpeed * 2000) * 0.5, t, 0.3);
};

export const stopHeliSound = (): void => {
    if (!_nodes) return;
    const { actx, osc, master } = _nodes;
    master.gain.setTargetAtTime(0, actx.currentTime, 0.15);
    setTimeout(() => {
        try {
            osc.stop();
            _nodes?.windSrc.stop();
            actx.close();
        } catch (_) {
            /* already stopped */
        }
    }, 600);
    _nodes = null;
};

import ZsynthPlayer from '@/shared/ZsynthPlayer';
import { SongData, TRACK_DEFS, NOTES, INSTRUMENTS, STEPS } from '@/shared/tracker-types';
import { parseZsong, songToZsong } from '@/shared/zsong';

// Internal format: key = `${trackId}-${step}`, value = note name (synths) or drum label (drums)
let activeData: Record<string, string> = {};

// Knob-State: trackId -> { attack, release, detune }
const knobValues: Record<string, { attack: number; release: number; detune: number }> = {};

const KNOB_DEFS = [
    { key: 'attack', label: 'ATK', min: 0.001, max: 0.3, default: 0.02 },
    { key: 'release', label: 'REL', min: 0.05, max: 1.5, default: 0.3 },
    { key: 'detune', label: 'DET', min: 0, max: 25, default: 0 },
];

function drawKnob(canvas: HTMLCanvasElement, value: number, min: number, max: number, label: string) {
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 4;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    ctx.beginPath();
    ctx.arc(cx, cy - 4, r, startAngle, endAngle);
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 3;
    ctx.stroke();

    const t = (value - min) / (max - min);
    const fillEnd = startAngle + t * (endAngle - startAngle);
    ctx.beginPath();
    ctx.arc(cx, cy - 4, r, startAngle, fillEnd);
    ctx.strokeStyle = '#4a90d9';
    ctx.lineWidth = 3;
    ctx.stroke();

    const angle = startAngle + t * (endAngle - startAngle);
    ctx.beginPath();
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx + Math.cos(angle) * (r - 2), cy - 4 + Math.sin(angle) * (r - 2));
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#999';
    ctx.font = '8px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, canvas.height - 1);

    ctx.fillStyle = '#ccc';
    ctx.font = '7px -apple-system, sans-serif';
    ctx.fillText(value.toFixed(2), cx, cy + 8);
}

function makeKnob(trackId: string, key: string, label: string, min: number, max: number, initVal: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 42;
    canvas.height = 42;
    canvas.style.cursor = 'ns-resize';
    canvas.title = label;

    if (!knobValues[trackId]) knobValues[trackId] = { attack: 0.02, release: 0.3, detune: 0 };
    (knobValues[trackId] as any)[key] = initVal;
    drawKnob(canvas, initVal, min, max, label);

    let startY = 0, startVal = initVal, dragging = false;
    canvas.addEventListener('mousedown', e => { dragging = true; startY = e.clientY; startVal = (knobValues[trackId] as any)[key]; e.preventDefault(); });
    window.addEventListener('mousemove', e => {
        if (!dragging) return;
        const delta = (startY - e.clientY) / 150;
        const newVal = Math.min(max, Math.max(min, startVal + delta * (max - min)));
        (knobValues[trackId] as any)[key] = newVal;
        drawKnob(canvas, newVal, min, max, label);
    });
    window.addEventListener('mouseup', () => { dragging = false; });
    canvas.addEventListener('dblclick', () => { (knobValues[trackId] as any)[key] = initVal; drawKnob(canvas, initVal, min, max, label); });
    return canvas;
}

// Note options HTML (shared across all synth selects)
const NOTE_OPTIONS = NOTES.map(n => `<option value="${n}">${n}</option>`).join('');

const Main = {
    init: () => {
        Main.buildUI();
        Main.setupEventListeners();
        ZsynthPlayer.onStep = (step: number) => Main.updateVisualStep(step);
    },

    updateVisualStep: (step: number) => {
        document.querySelectorAll('.playing').forEach(c => c.classList.remove('playing'));
        document.querySelectorAll(`[data-step="${step}"]`).forEach(c => c.classList.add('playing'));
        const display = document.getElementById('step-display');
        if (display) display.innerText = `Step ${step + 1}`;
    },

    setupEventListeners: () => {
        document.getElementById('btn-play')?.addEventListener('click', () => Main.playPreview());
        document.getElementById('btn-stop')?.addEventListener('click', () => Main.stopPreview());
        document.getElementById('btn-export')?.addEventListener('click', () => Main.exportJSON());
        document.getElementById('btn-import')?.addEventListener('click', () => Main.importJSON());
    },

    buildUI: () => {
        const root = document.getElementById('sequencer-root');
        if (!root) return;
        root.innerHTML = '';

        TRACK_DEFS.forEach(track => {
            const container = document.createElement('div');
            container.className = 'track-container';

            // ── Controls sidebar ───────────────────────────────────────────────
            const ctrl = document.createElement('div');
            ctrl.className = 'track-controls';
            ctrl.id = `ctrl-${track.id}`;
            ctrl.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
                    <strong>${track.label}</strong>
                    <input type="range" class="vol-slider" id="${track.id}-vol" min="0" max="100" value="80">
                </div>
                ${track.type === 'synth' ? `
                    <select id="${track.id}-inst">
                        ${Object.entries(INSTRUMENTS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
                        <option value="custom">— Custom —</option>
                    </select>
                    <div style="display:flex;gap:5px;align-items:center">
                        <select id="${track.id}-wave">
                            <option value="sawtooth">SAW</option>
                            <option value="square" selected>SQR</option>
                            <option value="sine">SIN</option>
                            <option value="triangle">TRI</option>
                        </select>
                        <input type="number" id="${track.id}-filter" value="2000" style="width:55px"> Hz
                    </div>
                    <div class="knob-row" id="knobs-${track.id}" style="display:flex;gap:4px;margin-top:4px"></div>
                ` : ''}
            `;
            container.appendChild(ctrl);

            // ── Step grid ──────────────────────────────────────────────────────
            const grid = document.createElement('div');
            grid.className = track.type === 'drum' ? 'grid drum-grid' : 'grid synth-grid';

            if (track.type === 'drum') {
                // Single row of toggle cells
                grid.innerHTML = '';
                for (let i = 0; i < STEPS; i++) {
                    const key = `${track.id}-${i}`;
                    const active = activeData[key] ? ' active-drum' : '';
                    grid.innerHTML += `<div class="cell${active}" data-step="${i}" id="${key}"></div>`;
                }
                grid.querySelectorAll('.cell').forEach(cell => {
                    cell.addEventListener('click', () => Main.toggleDrum(cell as HTMLElement, track.label));
                });
            } else {
                // Single row of note selects
                for (let i = 0; i < STEPS; i++) {
                    const key = `${track.id}-${i}`;
                    const currentNote = activeData[key] || '';
                    const sel = document.createElement('select');
                    sel.className = 'step-note' + (currentNote ? ' has-note' : '');
                    sel.id = key;
                    sel.dataset.step = String(i);
                    sel.innerHTML = `<option value="">—</option>${NOTE_OPTIONS}`;
                    sel.value = currentNote;
                    sel.addEventListener('change', () => Main.onNoteSelect(sel, track.id));
                    grid.appendChild(sel);
                }
            }

            container.appendChild(grid);
            root.appendChild(container);

            // Knobs
            if (track.type === 'synth') {
                const knobRow = document.getElementById(`knobs-${track.id}`);
                if (knobRow) {
                    KNOB_DEFS.forEach(({ key, label, min, max, default: def }) => {
                        knobRow.appendChild(makeKnob(track.id, key, label, min, max, def));
                    });
                }
                document.getElementById(`${track.id}-inst`)?.addEventListener('change', e => {
                    Main.applyPreset(track.id, (e.target as HTMLSelectElement).value);
                });
            }
        });
    },

    toggleDrum: (el: HTMLElement, drumLabel: string) => {
        const key = el.id;
        if (activeData[key]) {
            delete activeData[key];
            el.classList.remove('active-drum');
        } else {
            activeData[key] = drumLabel;
            el.classList.add('active-drum');
            const trackId = key.split('-')[0];
            const vol = (document.getElementById(`${trackId}-vol`) as HTMLInputElement)?.valueAsNumber ?? 80;
            ZsynthPlayer.playDrum(drumLabel, 0, vol / 100, ZsynthPlayer.masterGain!);
        }
    },

    onNoteSelect: (sel: HTMLSelectElement, trackId: string) => {
        const step = sel.dataset.step!;
        const key = `${trackId}-${step}`;
        if (sel.value) {
            activeData[key] = sel.value;
            sel.classList.add('has-note');
            // Preview
            const vol = (document.getElementById(`${trackId}-vol`) as HTMLInputElement)?.valueAsNumber ?? 80;
            const wave = (document.getElementById(`${trackId}-wave`) as HTMLSelectElement)?.value as any;
            const filter = (document.getElementById(`${trackId}-filter`) as HTMLInputElement)?.valueAsNumber ?? 2000;
            const kv = knobValues[trackId] || {};
            ZsynthPlayer.playSynth(sel.value, 0, { vol, wave, filter, attack: kv.attack ?? 0.02, release: kv.release ?? 0.3, detune: kv.detune ?? 0 }, ZsynthPlayer.masterGain!);
        } else {
            delete activeData[key];
            sel.classList.remove('has-note');
        }
    },

    playPreview: () => {
        ZsynthPlayer.init({ preview: Main.getCurrentSongData() });
        ZsynthPlayer.play('preview');
    },

    stopPreview: () => ZsynthPlayer.stop(),

    getCurrentSongData: (): SongData => {
        const bpm = (document.getElementById('bpm') as HTMLInputElement).value;
        const config: Record<string, any> = {};

        TRACK_DEFS.forEach(t => {
            config[t.id] = { vol: (document.getElementById(`${t.id}-vol`) as HTMLInputElement).value };
            if (t.type === 'synth') {
                const kv = knobValues[t.id] || {};
                config[t.id].wave   = (document.getElementById(`${t.id}-wave`) as HTMLSelectElement).value;
                config[t.id].filter = (document.getElementById(`${t.id}-filter`) as HTMLInputElement).value;
                config[t.id].inst   = (document.getElementById(`${t.id}-inst`) as HTMLSelectElement).value;
                config[t.id].attack  = kv.attack  ?? 0.02;
                config[t.id].release = kv.release ?? 0.3;
                config[t.id].detune  = kv.detune  ?? 0;
            }
        });

        return { bpm, activeData: { ...activeData }, config };
    },

    exportJSON: () => {
        // Save internal format directly
        const bpm = (document.getElementById('bpm') as HTMLInputElement).value;
        const config: Record<string, any> = {};
        TRACK_DEFS.forEach(t => {
            config[t.id] = { vol: (document.getElementById(`${t.id}-vol`) as HTMLInputElement).value };
            if (t.type === 'synth') {
                const kv = knobValues[t.id] || {};
                config[t.id].wave   = (document.getElementById(`${t.id}-wave`) as HTMLSelectElement).value;
                config[t.id].filter = (document.getElementById(`${t.id}-filter`) as HTMLInputElement).value;
                config[t.id].inst   = (document.getElementById(`${t.id}-inst`) as HTMLSelectElement).value;
                config[t.id].attack  = kv.attack  ?? 0.02;
                config[t.id].release = kv.release ?? 0.3;
                config[t.id].detune  = kv.detune  ?? 0;
            }
        });
        (document.getElementById('io-field') as HTMLTextAreaElement).value =
            songToZsong({ bpm, activeData, config });
    },

    importJSON: () => {
        try {
            const text = (document.getElementById('io-field') as HTMLTextAreaElement).value.trim();
            const raw = text.startsWith('{') ? JSON.parse(text) : parseZsong(text);
            if ((document.getElementById('bpm') as HTMLInputElement)) {
                (document.getElementById('bpm') as HTMLInputElement).value = raw.bpm || '110';
            }

            // Detect and convert old format (keys like "synth1-C4-12" or "kick-KICK-5")
            const incoming: Record<string, any> = raw.activeData || {};
            activeData = {};
            Object.entries(incoming).forEach(([key, val]) => {
                const parts = key.split('-');
                if (parts.length >= 3) {
                    // Old format: trackId-noteValue-step
                    const trackId = parts[0];
                    const step = parts[parts.length - 1];
                    const noteValue = parts.slice(1, -1).join('-');
                    activeData[`${trackId}-${step}`] = noteValue;
                } else {
                    // New format: trackId-step with string value
                    activeData[key] = String(val);
                }
            });

            Main.buildUI();

            if (raw.config) {
                Object.entries(raw.config).forEach(([tid, conf]: [string, any]) => {
                    const volEl = document.getElementById(`${tid}-vol`) as HTMLInputElement;
                    if (volEl) volEl.value = conf.vol;
                    if (tid.startsWith('synth')) {
                        const instEl = document.getElementById(`${tid}-inst`) as HTMLSelectElement;
                        const waveEl = document.getElementById(`${tid}-wave`) as HTMLSelectElement;
                        const filtEl = document.getElementById(`${tid}-filter`) as HTMLInputElement;
                        if (instEl) instEl.value = conf.inst || 'custom';
                        if (waveEl) waveEl.value = conf.wave || 'square';
                        if (filtEl) filtEl.value = conf.filter || '2000';
                        if (knobValues[tid]) {
                            knobValues[tid].attack  = conf.attack  ?? 0.02;
                            knobValues[tid].release = conf.release ?? 0.3;
                            knobValues[tid].detune  = conf.detune  ?? 0;
                        }
                        const knobRow = document.getElementById(`knobs-${tid}`);
                        if (knobRow) {
                            KNOB_DEFS.forEach(({ key, min, max, label }, i) => {
                                const canvas = knobRow.children[i] as HTMLCanvasElement;
                                if (canvas) {
                                    const val = conf[key] ?? (knobValues[tid] as any)[key];
                                    (knobValues[tid] as any)[key] = val;
                                    drawKnob(canvas, val, min, max, label);
                                }
                            });
                        }
                    }
                });
            }
        } catch (e) {
            console.error('Import-Fehler:', e);
            alert('Ungültiges JSON-Format!');
        }
    },

    applyPreset: (trackId: string, presetKey: string) => {
        if (presetKey === 'custom') return;
        const p = INSTRUMENTS[presetKey];
        (document.getElementById(`${trackId}-wave`) as HTMLSelectElement).value = p.wave;
        (document.getElementById(`${trackId}-filter`) as HTMLInputElement).value = p.filter.toString();
        if (knobValues[trackId]) {
            knobValues[trackId].attack  = p.attack  ?? 0.02;
            knobValues[trackId].release = p.release ?? 0.3;
            knobValues[trackId].detune  = p.detune  ?? 0;
        }
        const knobRow = document.getElementById(`knobs-${trackId}`);
        if (knobRow) {
            KNOB_DEFS.forEach(({ key, min, max, label }, i) => {
                const canvas = knobRow.children[i] as HTMLCanvasElement;
                if (canvas) drawKnob(canvas, (p as any)[key] ?? 0, min, max, label);
            });
        }
    },
};

Main.init();

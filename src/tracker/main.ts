import ZsynthPlayer from './ZsynthPlayer';
import { SongData, TRACK_DEFS, NOTES, INSTRUMENTS, STEPS } from './types';

let activeData: Record<string, boolean> = {};

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

    // Track (Hintergrund)
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    ctx.beginPath();
    ctx.arc(cx, cy - 4, r, startAngle, endAngle);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Filled arc
    const t = (value - min) / (max - min);
    const fillEnd = startAngle + t * (endAngle - startAngle);
    ctx.beginPath();
    ctx.arc(cx, cy - 4, r, startAngle, fillEnd);
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Zeiger
    const angle = startAngle + t * (endAngle - startAngle);
    ctx.beginPath();
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx + Math.cos(angle) * (r - 2), cy - 4 + Math.sin(angle) * (r - 2));
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#888';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, canvas.height - 1);

    // Wert
    ctx.fillStyle = '#ff6600';
    ctx.font = '7px monospace';
    ctx.fillText(value.toFixed(2), cx, cy + 8);
}

function makeKnob(
    trackId: string,
    key: string,
    label: string,
    min: number,
    max: number,
    initVal: number
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 42;
    canvas.height = 42;
    canvas.style.cursor = 'ns-resize';
    canvas.title = label;

    if (!knobValues[trackId]) {
        knobValues[trackId] = { attack: 0.02, release: 0.3, detune: 0 };
    }
    (knobValues[trackId] as any)[key] = initVal;

    drawKnob(canvas, initVal, min, max, label);

    let startY = 0;
    let startVal = initVal;
    let dragging = false;

    canvas.addEventListener('mousedown', e => {
        dragging = true;
        startY = e.clientY;
        startVal = (knobValues[trackId] as any)[key];
        e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
        if (!dragging) return;
        const delta = (startY - e.clientY) / 150;
        const newVal = Math.min(max, Math.max(min, startVal + delta * (max - min)));
        (knobValues[trackId] as any)[key] = newVal;
        drawKnob(canvas, newVal, min, max, label);
    });

    window.addEventListener('mouseup', () => {
        dragging = false;
    });

    // Doppelklick = Reset
    canvas.addEventListener('dblclick', () => {
        (knobValues[trackId] as any)[key] = initVal;
        drawKnob(canvas, initVal, min, max, label);
    });

    return canvas;
}

const Main = {
    init: () => {
        Main.buildUI();
        Main.setupEventListeners();
        ZsynthPlayer.onStep = (step: number) => {
            Main.updateVisualStep(step);
        };
    },

    updateVisualStep: (step: number) => {
        document.querySelectorAll('.cell.playing').forEach(c => c.classList.remove('playing'));
        document.querySelectorAll(`[data-step="${step}"]`).forEach(c => c.classList.add('playing'));
        const display = document.getElementById('step-display');
        if (display) display.innerText = `STEP: ${step + 1}`;
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

            let html = `
                <div class="track-controls" id="ctrl-${track.id}">
                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <strong>${track.label}</strong>
                        <input type="range" class="vol-slider" id="${track.id}-vol" min="0" max="100" value="80">
                    </div>`;

            if (track.type === 'synth') {
                html += `
                    <select id="${track.id}-inst">
                        ${Object.keys(INSTRUMENTS)
                            .map(k => `<option value="${k}">${INSTRUMENTS[k].label}</option>`)
                            .join('')}
                        <option value="custom">-- CUSTOM --</option>
                    </select>
                    <div style="display:flex; gap:5px; align-items:center">
                        <select id="${track.id}-wave">
                            <option value="sawtooth">SAW</option>
                            <option value="square" selected>SQR</option>
                            <option value="sine">SIN</option>
                            <option value="triangle">TRI</option>
                        </select>
                        <input type="number" id="${track.id}-filter" value="2000" style="width:45px"> Hz
                    </div>
                    <div class="knob-row" id="knobs-${track.id}" style="display:flex; gap:4px; margin-top:4px"></div>`;
            }

            html += `</div><div class="grid">`;
            const rows = track.type === 'drum' ? [track.label] : NOTES;

            rows.forEach(row => {
                html += `<div class="label">${row}</div>`;
                for (let i = 0; i < STEPS; i++) {
                    const cellId = `${track.id}-${row}-${i}`;
                    html += `<div class="cell" data-step="${i}" id="${cellId}"></div>`;
                }
            });

            html += `</div>`;
            container.innerHTML = html;
            root.appendChild(container);

            // Knobs einbauen
            if (track.type === 'synth') {
                const knobRow = document.getElementById(`knobs-${track.id}`);
                if (knobRow) {
                    KNOB_DEFS.forEach(({ key, label, min, max, default: def }) => {
                        const knob = makeKnob(track.id, key, label, min, max, def);
                        knobRow.appendChild(knob);
                    });
                }

                document.getElementById(`${track.id}-inst`)?.addEventListener('change', e => {
                    Main.applyPreset(track.id, (e.target as HTMLSelectElement).value);
                });
            }

            container.querySelectorAll('.cell').forEach(cell => {
                cell.addEventListener('click', e => {
                    const target = e.target as HTMLElement;
                    Main.toggleCell(target.id, track.type);
                });
            });
        });
    },

    toggleCell: (id: string, type: string) => {
        const el = document.getElementById(id);
        if (!el) return;

        if (activeData[id]) {
            delete activeData[id];
            el.classList.remove(type === 'drum' ? 'active-drum' : 'active-synth');
        } else {
            activeData[id] = true;
            el.classList.add(type === 'drum' ? 'active-drum' : 'active-synth');
            Main.previewNote(id);
        }
    },

    previewNote: (cellId: string) => {
        const [trackId, note] = cellId.split('-');
        const vol = (document.getElementById(`${trackId}-vol`) as HTMLInputElement)?.valueAsNumber || 80;

        if (trackId.startsWith('synth')) {
            const wave = (document.getElementById(`${trackId}-wave`) as HTMLSelectElement).value as any;
            const filter = (document.getElementById(`${trackId}-filter`) as HTMLInputElement).valueAsNumber;
            const kv = knobValues[trackId] || {};
            ZsynthPlayer.playSynth(
                note,
                0,
                {
                    vol,
                    wave,
                    filter,
                    attack: kv.attack ?? 0.02,
                    release: kv.release ?? 0.3,
                    detune: kv.detune ?? 0,
                },
                ZsynthPlayer.masterGain!
            );
        } else {
            ZsynthPlayer.playDrum(note, 0, vol / 100, ZsynthPlayer.masterGain!);
        }
    },

    playPreview: () => {
        const songData = Main.getCurrentSongData();
        ZsynthPlayer.init({ preview: songData });
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
                config[t.id].wave = (document.getElementById(`${t.id}-wave`) as HTMLSelectElement).value;
                config[t.id].filter = (document.getElementById(`${t.id}-filter`) as HTMLInputElement).value;
                config[t.id].inst = (document.getElementById(`${t.id}-inst`) as HTMLSelectElement).value;
                config[t.id].attack = kv.attack ?? 0.02;
                config[t.id].release = kv.release ?? 0.3;
                config[t.id].detune = kv.detune ?? 0;
            }
        });

        return { bpm, activeData: { ...activeData }, config };
    },

    exportJSON: () => {
        const data = Main.getCurrentSongData();
        (document.getElementById('io-field') as HTMLTextAreaElement).value = JSON.stringify(data, null, 2);
    },

    importJSON: () => {
        const ioField = document.getElementById('io-field') as HTMLTextAreaElement;
        try {
            const data: SongData = JSON.parse(ioField.value);

            const bpmInput = document.getElementById('bpm') as HTMLInputElement;
            if (bpmInput) bpmInput.value = data.bpm || '110';

            activeData = data.activeData || {};
            Main.buildUI();

            Object.keys(activeData).forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    const trackId = id.split('-')[0];
                    el.classList.add(trackId.includes('synth') ? 'active-synth' : 'active-drum');
                }
            });

            if (data.config) {
                Object.entries(data.config).forEach(([tid, conf]) => {
                    const volEl = document.getElementById(`${tid}-vol`) as HTMLInputElement;
                    if (volEl) volEl.value = conf.vol;

                    if (tid.startsWith('synth')) {
                        const instEl = document.getElementById(`${tid}-inst`) as HTMLSelectElement;
                        const waveEl = document.getElementById(`${tid}-wave`) as HTMLSelectElement;
                        const filtEl = document.getElementById(`${tid}-filter`) as HTMLInputElement;

                        if (instEl) instEl.value = conf.inst || 'custom';
                        if (waveEl) waveEl.value = conf.wave || 'square';
                        if (filtEl) filtEl.value = conf.filter || '2000';

                        // Knobs wiederherstellen
                        if (knobValues[tid]) {
                            knobValues[tid].attack = conf.attack ?? 0.02;
                            knobValues[tid].release = conf.release ?? 0.3;
                            knobValues[tid].detune = conf.detune ?? 0;
                        }

                        // Knob-Canvas neu zeichnen
                        const knobRow = document.getElementById(`knobs-${tid}`);
                        if (knobRow) {
                            KNOB_DEFS.forEach(({ key, min, max, label }, i) => {
                                const canvas = knobRow.children[i] as HTMLCanvasElement;
                                if (canvas) {
                                    const val = (conf as any)[key] ?? (knobValues[tid] as any)[key];
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

        // Knobs auf Preset-Werte setzen
        if (knobValues[trackId]) {
            knobValues[trackId].attack = p.attack ?? 0.02;
            knobValues[trackId].release = p.release ?? 0.3;
            knobValues[trackId].detune = p.detune ?? 0;
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

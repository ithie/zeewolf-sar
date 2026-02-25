import ZsynthPlayer from './ZsynthPlayer';
import { SongData, TRACK_DEFS, NOTES, INSTRUMENTS, STEPS } from './types';

let activeData: Record<string, boolean> = {};

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
                <div class="track-controls">
                    <div style="display:flex; justify-content:space-between">
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
                    <div style="display:flex; gap:5px">
                        <select id="${track.id}-wave">
                            <option value="sawtooth">SAW</option>
                            <option value="square" selected>SQR</option>
                            <option value="sine">SIN</option>
                            <option value="triangle">TRI</option>
                        </select>
                        <input type="number" id="${track.id}-filter" value="2000" style="width:45px"> Hz
                    </div>`;
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

            // Click-Listener für die Cells (Delegation oder direkt)
            container.querySelectorAll('.cell').forEach(cell => {
                cell.addEventListener('click', e => {
                    const target = e.target as HTMLElement;
                    Main.toggleCell(target.id, track.type);
                });
            });

            // Preset Listener
            if (track.type === 'synth') {
                document.getElementById(`${track.id}-inst`)?.addEventListener('change', e => {
                    Main.applyPreset(track.id, (e.target as HTMLSelectElement).value);
                });
            }
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
            // Vorschau-Sound beim Klicken
            Main.previewNote(id);
        }
    },

    previewNote: (cellId: string) => {
        const [trackId, note] = cellId.split('-');
        const vol = (document.getElementById(`${trackId}-vol`) as HTMLInputElement)?.valueAsNumber || 80;

        if (trackId.startsWith('synth')) {
            const wave = (document.getElementById(`${trackId}-wave`) as HTMLSelectElement).value as any;
            const filter = (document.getElementById(`${trackId}-filter`) as HTMLInputElement).valueAsNumber;
            ZsynthPlayer.playSynth(note, 0, { vol, wave, filter }, ZsynthPlayer.masterGain!);
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
                config[t.id].wave = (document.getElementById(`${t.id}-wave`) as HTMLSelectElement).value;
                config[t.id].filter = (document.getElementById(`${t.id}-filter`) as HTMLInputElement).value;
                config[t.id].inst = (document.getElementById(`${t.id}-inst`) as HTMLSelectElement).value;
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

            // 1. BPM setzen
            const bpmInput = document.getElementById('bpm') as HTMLInputElement;
            if (bpmInput) bpmInput.value = data.bpm || '110';

            // 2. Daten übernehmen
            activeData = data.activeData || {};

            // 3. UI neu aufbauen (leert das Grid und erstellt alle Cells neu)
            Main.buildUI();

            // 4. Aktive Zellen visuell markieren
            Object.keys(activeData).forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    const trackId = id.split('-')[0];
                    const isSynth = trackId.includes('synth');
                    el.classList.add(isSynth ? 'active-synth' : 'active-drum');
                }
            });

            // 5. Config (Volume, Presets, Filter) wiederherstellen
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
    },
};

Main.init();

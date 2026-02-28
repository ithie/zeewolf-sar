import { SongData, SynthConfig } from './types';

interface ActiveTrack {
    data: SongData;
    isPlaying: boolean;
    currentStep: number;
    gainNode: GainNode;
    nextNoteTime: number; // neu
}

const ZsynthPlayer = {
    ctx: null as AudioContext | null,
    songs: {} as Record<string, SongData>,
    currentTrack: null as ActiveTrack | null,
    masterGain: null as GainNode | null,
    onStep: null as ((step: number) => void) | null,

    freqs: {
        C4: 261.63,
        B3: 246.94,
        A3: 220.0,
        G3: 196.0,
        F3: 174.61,
        E3: 164.81,
        D3: 146.83,
        C3: 130.81,
        B2: 123.47,
        A2: 110.0,
        G2: 98.0,
        F2: 87.31,
        E2: 82.41,
        D2: 73.42,
        C2: 65.41,
        A1: 55.0,
    } as Record<string, number>,

    init: (songList: Record<string, SongData>): void => {
        ZsynthPlayer.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        ZsynthPlayer.songs = songList;
        ZsynthPlayer.masterGain = ZsynthPlayer.ctx.createGain();
        ZsynthPlayer.masterGain.connect(ZsynthPlayer.ctx.destination);
    },

    play: (key: string, crossfade: number = 0.5): void => {
        if (!ZsynthPlayer.ctx || !ZsynthPlayer.masterGain) {
            console.error('ZSynthPlayer nicht initialisiert!');
            return;
        }

        const songData = ZsynthPlayer.songs[key];

        if (!songData) return;

        const startTime = ZsynthPlayer.ctx.currentTime;

        if (ZsynthPlayer.currentTrack && ZsynthPlayer.currentTrack.isPlaying) {
            const oldTrack = ZsynthPlayer.currentTrack;
            oldTrack.gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + crossfade);
            setTimeout(() => {
                oldTrack.isPlaying = false;
            }, crossfade * 1000);
        }

        const track: ActiveTrack = {
            data: songData,
            isPlaying: true,
            currentStep: 0,
            gainNode: ZsynthPlayer.ctx.createGain(),
        };

        track.gainNode.gain.setValueAtTime(0.0001, startTime);
        track.gainNode.gain.exponentialRampToValueAtTime(1.0, startTime + crossfade);
        track.gainNode.connect(ZsynthPlayer.masterGain);

        ZsynthPlayer.currentTrack = track;
        ZsynthPlayer.scheduler(track);
    },

    scheduler: (track: ActiveTrack): void => {
        if (!ZsynthPlayer.ctx) return;

        const LOOKAHEAD = 0.1;
        const INTERVAL_MS = 25;

        const bpm = parseInt(track.data.bpm);
        const stepTime = 60 / bpm / 4;

        if (track.nextNoteTime === undefined) {
            track.nextNoteTime = ZsynthPlayer.ctx.currentTime + 0.05;
        }

        while (track.nextNoteTime < ZsynthPlayer.ctx.currentTime + LOOKAHEAD) {
            if (!track.isPlaying || ZsynthPlayer.currentTrack !== track) return;

            const sIdx = track.currentStep % 64;

            if (ZsynthPlayer.onStep) {
                ZsynthPlayer.onStep(sIdx);
            }

            ['kick', 'snare', 'hat', 'synth1', 'synth2', 'synth3'].forEach(tId => {
                const config = track.data.config[tId] || { vol: 80 };
                for (const noteKey in track.data.activeData) {
                    if (noteKey.startsWith(`${tId}-`) && noteKey.endsWith(`-${sIdx}`)) {
                        const rowName = noteKey.split('-')[1];
                        if (tId.startsWith('synth')) {
                            ZsynthPlayer.playSynth(rowName, track.nextNoteTime, config, track.gainNode);
                        } else {
                            ZsynthPlayer.playDrum(rowName, track.nextNoteTime, config.vol / 100, track.gainNode);
                        }
                    }
                }
            });

            track.currentStep++;
            track.nextNoteTime += stepTime;
        }

        setTimeout(() => ZsynthPlayer.scheduler(track), INTERVAL_MS);
    },

    playDrum: (type: string, time: number, vol: number, target: AudioNode): void => {
        if (!ZsynthPlayer.ctx) return;
        const g = ZsynthPlayer.ctx.createGain();
        g.connect(target);
        g.gain.setValueAtTime(vol * 0.5, time);

        const osc = ZsynthPlayer.ctx.createOscillator();
        if (type === 'KICK') {
            osc.frequency.setValueAtTime(150, time);
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.2);
            g.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        } else {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(120, time);
            g.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        }
        osc.connect(g);
        osc.start(time);
        osc.stop(time + 0.2);
    },

    playSynth: (note: string, time: number, cfg: SynthConfig, target: AudioNode): void => {
        if (!ZsynthPlayer.ctx) return;
        const osc = ZsynthPlayer.ctx.createOscillator();
        const g = ZsynthPlayer.ctx.createGain();
        const f = ZsynthPlayer.ctx.createBiquadFilter();

        osc.type = cfg.wave || 'square';
        osc.frequency.setValueAtTime(ZsynthPlayer.freqs[note] || 220, time);
        f.type = 'lowpass';
        f.frequency.setValueAtTime(cfg.filter || 2000, time);

        const v = (cfg.vol / 100) * 0.2;
        g.gain.setValueAtTime(0.0001, time);
        g.gain.linearRampToValueAtTime(v, time + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);

        osc.connect(f);
        f.connect(g);
        g.connect(target);
        osc.start(time);
        osc.stop(time + 0.4);
    },

    stop: (): void => {
        if (ZsynthPlayer.currentTrack && ZsynthPlayer.ctx) {
            ZsynthPlayer.currentTrack.isPlaying = false;
            ZsynthPlayer.currentTrack.gainNode.gain.setTargetAtTime(0, ZsynthPlayer.ctx.currentTime, 0.05);
        }
    },
};

export default ZsynthPlayer;

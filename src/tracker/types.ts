export const STEPS = 64;

export type WaveType = 'sawtooth' | 'square' | 'sine' | 'triangle';

export interface SynthConfig {
    vol: number;
    wave: WaveType;
    filter: number;
    attack?: number;
    release?: number;
    detune?: number;
    inst?: string;
}

export interface SongData {
    bpm: string;
    activeData: Record<string, boolean>;
    config: Record<string, any>;
}

export interface TrackDef {
    id: string;
    type: 'drum' | 'synth';
    label: string;
}

export const TRACK_DEFS: TrackDef[] = [
    { id: 'kick', type: 'drum', label: 'KICK' },
    { id: 'snare', type: 'drum', label: 'SNARE' },
    { id: 'hat', type: 'drum', label: 'HI-HAT' },
    { id: 'synth1', type: 'synth', label: 'SYNTH 1' },
    { id: 'synth2', type: 'synth', label: 'SYNTH 2' },
    { id: 'synth3', type: 'synth', label: 'SYNTH 3' },
];

export const INSTRUMENTS: Record<string, any> = {
    lead_square: {
        label: 'LEAD Square',
        wave: 'square',
        filter: 2500,
        attack: 0.01,
        release: 0.25,
        detune: 0,
    },
    lead_saw: {
        label: 'LEAD Saw',
        wave: 'sawtooth',
        filter: 3000,
        attack: 0.01,
        release: 0.2,
        detune: 0,
    },
    supersaw: {
        label: 'SUPERSAW',
        wave: 'sawtooth',
        filter: 4000,
        attack: 0.02,
        release: 0.35,
        detune: 8,
    },
    bass_deep: {
        label: 'BASS Deep',
        wave: 'sine',
        filter: 400,
        attack: 0.01,
        release: 0.4,
        detune: 0,
    },
    bass_gritty: {
        label: 'BASS Gritty',
        wave: 'sawtooth',
        filter: 600,
        attack: 0.01,
        release: 0.35,
        detune: 3,
    },
    bass_wobble: {
        label: 'BASS Wobble',
        wave: 'sawtooth',
        filter: 500,
        attack: 0.05,
        release: 0.5,
        detune: 5,
    },
    pluck: {
        label: 'PLUCK',
        wave: 'square',
        filter: 1200,
        attack: 0.005,
        release: 0.15,
        detune: 0,
    },
    pad_warm: {
        label: 'PAD Warm',
        wave: 'triangle',
        filter: 1800,
        attack: 0.12,
        release: 0.8,
        detune: 6,
    },
    pad_cold: {
        label: 'PAD Cold',
        wave: 'square',
        filter: 1500,
        attack: 0.15,
        release: 1.0,
        detune: 4,
    },
    arp_bright: {
        label: 'ARP Bright',
        wave: 'square',
        filter: 3500,
        attack: 0.005,
        release: 0.1,
        detune: 0,
    },
    organ: {
        label: 'ORGAN',
        wave: 'sine',
        filter: 5000,
        attack: 0.03,
        release: 0.2,
        detune: 12,
    },
};

export const NOTES = ['C4', 'B3', 'A3', 'G3', 'F3', 'E3', 'D3', 'C3', 'B2', 'A2', 'G2', 'F2', 'E2', 'D2', 'C2', 'A1'];

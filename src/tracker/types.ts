export const STEPS = 64;

export type WaveType = 'sawtooth' | 'square' | 'sine' | 'triangle';

export interface SynthConfig {
    vol: number;
    wave: WaveType;
    filter: number;
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

export const INSTRUMENTS: Record<string, { wave: WaveType; filter: number; label: string }> = {
    lead_square: { wave: 'square', filter: 2000, label: 'Lead (Sqr)' },
    lead_saw: { wave: 'sawtooth', filter: 2500, label: 'Lead (Saw)' },
    bass_deep: { wave: 'triangle', filter: 400, label: 'Deep Bass' },
    bass_gritty: { wave: 'sawtooth', filter: 600, label: 'Gritty Bass' },
    pluck: { wave: 'sine', filter: 1500, label: 'Soft Pluck' },
    flute: { wave: 'sine', filter: 800, label: 'Flute-ish' },
};

export const NOTES = ['C4', 'B3', 'A3', 'G3', 'F3', 'E3', 'D3', 'C3', 'B2', 'A2', 'G2', 'F2', 'E2', 'D2', 'C2', 'A1'];

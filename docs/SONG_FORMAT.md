# Song Format

Songs are stored as JSON in `src/game/music/`. They are loaded by the game at runtime and can be authored in the ZSynth Tracker.

## Top-level Structure

```json
{
  "bpm": "110",
  "activeData": { ... },
  "config": { ... }
}
```

| Field        | Type   | Description                        |
| ------------ | ------ | ---------------------------------- |
| `bpm`        | string | Tempo in beats per minute          |
| `activeData` | object | Which steps are active and what note/drum plays |
| `config`     | object | Per-track settings (volume, synth parameters) |

---

## activeData

Each key has the format `{trackId}-{step}`, where `step` is 0–63.

The value is a string: a note name for synth tracks, or a drum label for drum tracks.

```json
"activeData": {
  "kick-4":   "KICK",
  "snare-8":  "SNARE",
  "hat-2":    "HI-HAT",
  "synth1-0": "A2",
  "synth2-4": "C3"
}
```

**Track IDs:** `kick`, `snare`, `hat`, `synth1`, `synth2`, `synth3`

**Note range:** `B4` down to `A1` (chromatic, 40 pitches)

---

## config

One entry per track.

### Drum track

```json
"kick": { "vol": "80" }
```

| Field | Type   | Range  | Description      |
| ----- | ------ | ------ | ---------------- |
| `vol` | string | 0–100  | Volume (percent) |

### Synth track

```json
"synth1": {
  "vol":     "82",
  "wave":    "sawtooth",
  "filter":  "600",
  "inst":    "bass_gritty",
  "attack":  0.01,
  "release": 0.35,
  "detune":  3
}
```

| Field     | Type   | Description                                                |
| --------- | ------ | ---------------------------------------------------------- |
| `vol`     | string | Volume 0–100                                               |
| `wave`    | string | `sawtooth` · `square` · `sine` · `triangle`                |
| `filter`  | string | Lowpass cutoff frequency in Hz                             |
| `inst`    | string | Instrument preset key, or `"custom"` for manual settings   |
| `attack`  | number | Envelope attack in seconds (0.001–0.3)                     |
| `release` | number | Envelope release in seconds (0.05–1.5)                     |
| `detune`  | number | Detune amount in cents (0–25), adds a detuned second voice |

---

## Instrument Presets

| Key           | Label        | Wave      | Filter  |
| ------------- | ------------ | --------- | ------- |
| `lead_square` | LEAD Square  | square    | 2500 Hz |
| `lead_saw`    | LEAD Saw     | sawtooth  | 3000 Hz |
| `supersaw`    | SUPERSAW     | sawtooth  | 4000 Hz |
| `bass_deep`   | BASS Deep    | sine      | 400 Hz  |
| `bass_gritty` | BASS Gritty  | sawtooth  | 600 Hz  |
| `bass_wobble` | BASS Wobble  | sawtooth  | 500 Hz  |
| `pluck`       | PLUCK        | square    | 1200 Hz |
| `pad_warm`    | PAD Warm     | triangle  | 1800 Hz |
| `pad_cold`    | PAD Cold     | square    | 1500 Hz |
| `arp_bright`  | ARP Bright   | square    | 3500 Hz |
| `organ`       | ORGAN        | sine      | 5000 Hz |

Selecting a preset overwrites `wave`, `filter`, `attack`, `release`, and `detune`. Setting any of those manually afterwards switches the instrument dropdown to `"custom"`.

---

## Registering a Song in the Game

Songs are statically imported in `src/game/main.ts`. After saving a new song via the Tracker, add an import and register it in the `songList`:

```typescript
import MySong from './music/mysong.json';

const songList: Record<string, SongData> = {
    final: SoundFinal,
    main: SoundMainTheme,
    tutorial: SoundTutorial,
    mysong: MySong,         // ← add here
};
```

The key you use here is the theme name passed to `soundHandler.play('mysong')`.

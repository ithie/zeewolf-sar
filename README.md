# ZEEWOLF: SAR

![zeewolf sar](./splash.png)

An isometric helicopter simulator built with TypeScript and HTML5 Canvas. Features physics-based flight controls, dynamic weather, winch operations, and procedural terrain — playable in any modern browser.

---

## Controls

| Key         | Action                                        |
| ----------- | --------------------------------------------- |
| W           | Start Engine / Increase Collective (Ascend)   |
| S           | Decrease Collective (Descend) / Stop Engine   |
| Arrow Keys  | Pitch & Roll                                  |
| A / D       | Yaw (Turn Left / Right)                       |
| Q / E       | Winch Up / Down                               |

---

## Play

Open `index.html` in any modern browser — no build or server required.

---

## Development

### Prerequisites

```sh
npm install
```

### Run (Vite + Electron Workbench)

```sh
npm run dev
```

This starts the Vite dev server and launches the **Zeewolf Workbench** — an Electron-based development environment.

### Build Game (for deployment)

```sh
npm run build:game
```

### Deploy to GitHub Pages

```sh
npm run deploy
```

---

## Workbench

The workbench is an Electron app that opens alongside the dev server. It provides three integrated tools:

### Mission Editor

Two synchronized windows:

- **Preview** (top) — isometric 3D view (filled left, wireframe right), updates live as you paint
- **Map Editor** (bottom) — paint terrain tiles, place carriers, boats, rescue pads and wind zones

Missions are saved as JSON to `src/game/campaigns/` and automatically registered in the game.

### ZSynth Tracker

A step sequencer for composing in-game music.

- **3 drum tracks** (Kick, Snare, Hi-Hat) — toggle pads per step
- **3 synth tracks** — select a note per step from a dropdown (or leave empty)
- **Per-synth controls** — instrument preset, waveform, filter cutoff, attack, release, detune knobs
- **BPM** — global tempo control
- Songs are saved as JSON to `src/game/music/` via native file dialogs (Öffnen / Speichern / Speichern unter)

### Git Integration

Branch display, pull, commit and push — directly from the workbench toolbar.

---

## Project Structure

```text
src/
  game/          # Game source (TypeScript)
    campaigns/   # Mission JSON files
    music/       # Song JSON files
  editor/        # Mission editor source
  tracker/       # ZSynth tracker source
  shared/        # Shared utilities
workbench/
  main/          # Electron main process + IPC handlers
  renderer/      # Workbench UI (HTML/CSS/JS)
```

---

## License

Open source. Feel free to modify and distribute.

Created with ❤️ and TypeScript.

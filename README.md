# ZEEWOLF: SAR

![zeewolf sar](./splash.png)

An isometric helicopter search-and-rescue simulator built with TypeScript and HTML5 Canvas. Inspired by Zeewolf (Binary Asylum, 1994).

Physics-based flight, winch operations, dynamic weather, procedural terrain, cargo transport — playable in any modern browser, no install required.

---

## Play

**Online:** [ithie.github.io/zeewolf-sar](https://ithie.github.io/zeewolf-sar)

**Local:** open `index.html` directly in any modern browser — no build step or server needed.

---

## Controls

| Key        | Action                                      |
| ---------- | ------------------------------------------- |
| W          | Start engine / Increase collective (ascend) |
| S          | Decrease collective (descend) / Stop engine |
| Arrow Keys | Pitch & Roll                                |
| A / D      | Yaw (turn left / right)                     |
| Q / E      | Winch up / down                             |

---

## Features

- **Isometric renderer** with painter's-algorithm depth sorting, backface culling, and declarative geometry (DEF system)
- **Physics-based flight** — inertia, tilt, wind drift, ground effect
- **Three helicopters** with distinct handling profiles:
    - _SA 365 Dauphin_ — agile, lightweight, no cargo
    - _MH-60T Jayhawk_ — heavy-lift workhorse, cargo-capable
    - _CH-47 Chinook_ — tandem rotor, maximum capacity
- **Winch & rescue** — lower a rescuer, pick up survivors, haul them to safety
- **Cargo transport** — sling loads with pendulum physics
- **Fuel management** — refuel at fuel trucks on carrier or pad
- **Dynamic weather** — wind affects flight and rope physics
- **Campaigns** with multiple missions, briefings, and a commander portrait
- **ZSynth soundtrack** — original in-game music composed in the built-in tracker

---

## Campaigns

Select a campaign from the main menu, then choose your airframe. Each campaign has its own mission sequence, terrain, and objectives.

---

## Development

### Prerequisites

```sh
npm install
```

### Dev server + Workbench

```sh
npm run dev
```

Starts the Vite dev server and launches the **Zeewolf Workbench** — an Electron-based development environment with integrated tools (see below).

### Build (single-file HTML for deployment)

```sh
npm run build
```

Produces a self-contained `dist/index.html` with all JS and CSS inlined.

### Tests

```sh
npm test
```

### Deploy to GitHub Pages

Deployment runs automatically via GitHub Actions on every push to `main`. Manual deploy:

```sh
npm run deploy
```

---

## Workbench

The Workbench is an Electron app that opens alongside the Vite dev server (`npm run dev`). It provides four integrated tools accessible from the toolbar.

### Mission Editor

Two synchronized windows:

- **Preview** — isometric 3D view (filled left, wireframe right), updates live
- **Map Editor** — paint terrain tiles, place carriers, boats, rescue pads, wind zones, foliage, and NPCs

Missions are saved as JSON to `src/game/campaigns/` and automatically available in the game.

### Model Editor

An interactive DEF (Decoupled Element Facets) editor for the game's isometric geometry:

- Browse and edit all preset models (Hangar, Lighthouse, Sailboat, Carrier, Fuel Truck, all helicopters)
- Add, move, and delete vertices and faces directly on the isometric canvas
- Export DEF JSON for use in the game

### ZSynth Tracker

A step sequencer for composing in-game music:

- **3 drum tracks** (Kick, Snare, Hi-Hat) — toggle pads per step
- **3 synth tracks** — select a note per step (or leave empty)
- Per-track controls: instrument preset, waveform, filter, attack, release, detune
- Global BPM control
- Open / Save / Save As via native file dialogs — songs saved to `src/game/music/`

### Git Integration

Branch display, pull, commit, and push — directly from the workbench toolbar.

---

## Project Structure

```text
src/
  game/
    campaigns/     Mission JSON files
    models/        Isometric geometry definitions (one file per object)
    music/         Song JSON files
    ui/            Menu screens (credits, heli select, heli info, particles)
  editor/          Mission editor source
  tracker/         ZSynth tracker source
  shared/          Types and utilities shared across modules
workbench/
  main/            Electron main process + IPC handlers
  renderer/        Workbench UI (HTML / CSS / JS)
```

---

## Documentation

- [docs/DEF_SPEC.md](./DEF_SPEC.md) — isometric geometry system (DEF format, SceneRenderer API)
- [docs/SESSION_SYSTEM.md](./docs/SESSION_SYSTEM.md) — session system, rank progression, save code format, GDPR
- [docs/WORKBENCH.md](./docs/WORKBENCH.md) — Workbench architecture and `window.workbench` API
- [docs/CAMPAIGN_FORMAT.md](./docs/CAMPAIGN_FORMAT.md) — campaign and mission JSON format
- [docs/SONG_FORMAT.md](./docs/SONG_FORMAT.md) — ZSynth song JSON format

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

---

## Inspired By

[Zeewolf](https://www.lemonamiga.com/game/zeewolf) by Binary Asylum (Amiga, 1994).

---

## License

Open source. Feel free to modify and distribute.

Made with ♥ in JavaScript.

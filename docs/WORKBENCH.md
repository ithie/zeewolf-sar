# Workbench

The Workbench is an Electron application that runs alongside the Vite dev server. It provides the Mission Editor, the Model Editor, the ZSynth Tracker, a code editor, and Git integration in a single window.

Start everything with:

```sh
npm run dev
```

---

## Architecture

The Workbench consists of three layers:

| Layer | Location | Description |
| ----- | -------- | ----------- |
| Main process | `workbench/main/index.ts` | Electron main — IPC handlers, dialogs, file I/O |
| Preload | `workbench/main/preload.ts` | Exposes `window.workbench` API to renderer via contextBridge |
| Renderer | `workbench/renderer/index.html` | UI shell — hosts iframes for editor, tracker, code editor |

The renderer and all iframes are served from `http://localhost:5173` (Vite). Because they share the same origin, iframes can access `window.parent.workbench` directly.

---

## `window.workbench` API

All methods are available in any iframe via `window.parent.workbench`.

### File I/O

#### `readFile(filePath: string): Promise<string>`

Reads a file. `filePath` is relative to the project root.

```js
const content = await window.parent.workbench.readFile('src/game/music/maintheme.json');
```

#### `writeFile(filePath: string, content: string): Promise<void>`

Writes a file. `filePath` is relative to the project root. Creates or overwrites.

```js
await window.parent.workbench.writeFile('src/game/music/mysong.json', json);
```

#### `readDir(dirPath: string): Promise<Array<{ name: string; isDir: boolean }>>`

Lists a directory. `dirPath` is relative to the project root. Excludes `node_modules`, `dist`, `.`-prefixed entries, and `workbench/`.

---

### Campaign Dialogs

#### `showOpenDialog(): Promise<{ cancelled: boolean; filename?: string; content?: string }>`

Opens a native file picker defaulting to `src/game/campaigns/`. Returns the filename and full file content on success.

#### `showSaveDialog(defaultName?: string): Promise<{ cancelled: boolean; filename?: string }>`

Opens a native save dialog defaulting to `src/game/campaigns/`. Returns only the chosen filename (basename), not a path. Write the file separately with `saveCampaignFile`.

#### `saveCampaignFile(filename: string, content: string): Promise<{ ok: boolean }>`

Writes a campaign to `src/game/campaigns/{filename}` and automatically registers it in `src/game/main.ts` (adds the import and array entry) if it is not already present.

---

### Song Dialogs

#### `showOpenSongDialog(): Promise<{ cancelled: boolean; filename?: string; relativePath?: string; content?: string }>`

Opens a native file picker defaulting to `src/game/music/`. Returns the filename, the path relative to the project root, and the full file content.

#### `showSaveSongDialog(defaultName?: string): Promise<{ cancelled: boolean; filename?: string; relativePath?: string }>`

Opens a native save dialog defaulting to `src/game/music/`. Returns the filename and the path relative to the project root. Write the file with `writeFile(relativePath, content)`.

---

### Git

All methods wrap the project-root Git repository.

#### `git.getBranch(): Promise<string>`

Returns the current branch name.

#### `git.pull(): Promise<string>`

Runs `git pull` and returns stdout.

#### `git.commit(message: string): Promise<string>`

Stages all changes (`git add -A`) and commits with the given message. Returns stdout.

#### `git.push(): Promise<string>`

Runs `git push` and returns stdout.

---

## IPC Handlers

The following IPC channels are registered in the main process. They are not called directly — use the `window.workbench` API instead.

| Channel              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `read-file`          | Read file relative to project root               |
| `write-file`         | Write file relative to project root              |
| `read-dir`           | List directory relative to project root          |
| `show-open-dialog`   | Campaign open dialog                             |
| `show-save-dialog`   | Campaign save dialog                             |
| `save-campaign-file` | Write campaign + auto-register in main.ts        |
| `show-open-song-dialog` | Song open dialog                              |
| `show-save-song-dialog` | Song save dialog                              |
| `git-branch`         | Get current branch                               |
| `git-pull`           | Pull from remote                                 |
| `git-commit`         | Stage all and commit                             |
| `git-push`           | Push to remote                                   |

---

## Model Editor

An interactive editor for the game's isometric DEF geometry (`src/modeleditor.html`).

- Browse all preset models: Hangar, Lighthouse, Sailboat, Carrier (Hull + Tower), Fuel Truck, and all helicopters
- Add, select, move, and delete vertices and faces directly on the isometric canvas
- Per-face controls: color picker, stroke color, normal direction for backface culling
- Export the current DEF as JSON for use in `src/game/models/`

The Model Editor is served by Vite and embedded as an iframe in the Workbench. It uses the same `SceneRenderer` and DEF pipeline as the game.

---

## Adding a New Tool

1. Add any required IPC handler(s) in `workbench/main/index.ts`
2. Expose them via `contextBridge` in `workbench/main/preload.ts`
3. Rebuild the workbench: `npm run workbench:build`
4. Add an iframe (or panel) in `workbench/renderer/index.html`
5. Access the API from the iframe via `window.parent.workbench`

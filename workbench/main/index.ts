import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as http from 'http';
import { startApiServer } from './api-server';
import { getBranch, pull, commit, push } from './git';

// __dirname = workbench/dist/main  →  project root is three levels up
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const VITE_PORT = 5173;

app.setName('Zeewolf Workbench');

function buildMenu(): void {
  const docsDir = path.join(PROJECT_ROOT, 'docs');
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: 'Zeewolf Workbench',
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),
    {
      label: 'Dokumentation',
      submenu: [
        {
          label: 'README',
          click: () => shell.openPath(path.join(PROJECT_ROOT, 'README.md')),
        },
        { type: 'separator' as const },
        {
          label: 'Song-Format',
          click: () => shell.openPath(path.join(docsDir, 'SONG_FORMAT.md')),
        },
        {
          label: 'Campaign-Format',
          click: () => shell.openPath(path.join(docsDir, 'CAMPAIGN_FORMAT.md')),
        },
        {
          label: 'Workbench-API',
          click: () => shell.openPath(path.join(docsDir, 'WORKBENCH.md')),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function waitForVite(): Promise<void> {
  return new Promise((resolve) => {
    const attempt = () => {
      const req = http.get(`http://localhost:${VITE_PORT}`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else {
          setTimeout(attempt, 500);
        }
      });
      req.on('error', () => setTimeout(attempt, 500));
      req.end();
    };
    attempt();
  });
}

async function createWindow(): Promise<void> {
  const preloadPath = path.join(__dirname, 'preload.cjs');

  const win = new BrowserWindow({
    width: 1800,
    height: 1080,
    minWidth: 1200,
    minHeight: 700,
    title: 'Zeewolf Workbench',
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await waitForVite();
  await win.loadURL(`http://localhost:${VITE_PORT}/workbench/renderer/index.html`);
}

app.whenReady().then(async () => {
  buildMenu();
  startApiServer(PROJECT_ROOT);

  ipcMain.handle('read-file', async (_event, filePath: string) => {
    const fullPath = path.join(PROJECT_ROOT, filePath);
    return fs.readFile(fullPath, 'utf-8');
  });

  ipcMain.handle('write-file', async (_event, filePath: string, content: string) => {
    const fullPath = path.join(PROJECT_ROOT, filePath);
    await fs.writeFile(fullPath, content, 'utf-8');
  });

  ipcMain.handle('read-dir', async (_event, dirPath: string) => {
    const fullPath = path.join(PROJECT_ROOT, dirPath || '');
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    return entries
      .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'dist' && e.name !== 'workbench')
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((e) => ({ name: e.name, isDir: e.isDirectory() }));
  });

  ipcMain.handle('git-branch', () => getBranch(PROJECT_ROOT));
  ipcMain.handle('git-pull', () => pull(PROJECT_ROOT));
  ipcMain.handle('git-commit', (_event, message: string) => commit(PROJECT_ROOT, message));
  ipcMain.handle('git-push', () => push(PROJECT_ROOT));

  // ── Campaign editor: native open dialog ────────────────────────────────────
  ipcMain.handle('show-open-dialog', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Kampagne öffnen',
      defaultPath: path.join(PROJECT_ROOT, 'src/game/campaigns'),
      filters: [{ name: 'Campaign JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return { cancelled: true };
    const filePath = result.filePaths[0];
    const content  = await fs.readFile(filePath, 'utf-8');
    const filename = path.basename(filePath);
    return { cancelled: false, filename, content };
  });

  // ── Campaign editor: native save dialog ────────────────────────────────────
  ipcMain.handle('show-save-dialog', async (_event, defaultName?: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Kampagne speichern',
      defaultPath: path.join(PROJECT_ROOT, 'src/game/campaigns', defaultName ?? 'neue_kampagne.json'),
      filters: [{ name: 'Campaign JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { cancelled: true };
    return { cancelled: false, filename: path.basename(result.filePath) };
  });

  // ── Tracker: native open dialog ────────────────────────────────────────────
  ipcMain.handle('show-open-song-dialog', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Song öffnen',
      defaultPath: path.join(PROJECT_ROOT, 'src/game/music'),
      filters: [{ name: 'Song JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return { cancelled: true };
    const filePath = result.filePaths[0];
    const content  = await fs.readFile(filePath, 'utf-8');
    const filename = path.basename(filePath);
    const relativePath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
    return { cancelled: false, filename, relativePath, content };
  });

  // ── Tracker: native save dialog ─────────────────────────────────────────────
  ipcMain.handle('show-save-song-dialog', async (_event, defaultName?: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Song speichern',
      defaultPath: path.join(PROJECT_ROOT, 'src/game/music', defaultName ?? 'neuer_song.json'),
      filters: [{ name: 'Song JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { cancelled: true };
    const filename = path.basename(result.filePath);
    const relativePath = path.relative(PROJECT_ROOT, result.filePath).replace(/\\/g, '/');
    return { cancelled: false, filename, relativePath };
  });

  // ── Campaign editor: write file + auto-register in main.ts ────────────────
  ipcMain.handle('save-campaign-file', async (_event, filename: string, content: string) => {
    const fullPath = path.join(PROJECT_ROOT, 'src/game/campaigns', filename);
    await fs.writeFile(fullPath, content, 'utf-8');

    const base = filename.replace(/\.json$/, '');
    const mainTsPath = path.join(PROJECT_ROOT, 'src/game/main.ts');
    const src = await fs.readFile(mainTsPath, 'utf-8');

    if (!src.includes(`./campaigns/${base}.json`)) {
      const ident = base
        .split(/[_\-\s]+/)
        .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
      const lines = src.split('\n');

      let lastImportIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/^import \w+ from '\.\/campaigns\//.test(lines[i])) lastImportIdx = i;
      }
      if (lastImportIdx >= 0) {
        lines.splice(lastImportIdx + 1, 0, `import ${ident} from './campaigns/${base}.json';`);
      }

      let inArray = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('const campaigns: CampaignExport[] = [')) inArray = true;
        if (inArray && lines[i].trim() === '];') {
          lines.splice(i, 0, `        ${ident} as unknown as CampaignExport,`);
          break;
        }
      }
      await fs.writeFile(mainTsPath, lines.join('\n'), 'utf-8');
    }
    return { ok: true };
  });

  await createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

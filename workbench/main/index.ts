import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as http from 'http';
import { startApiServer } from './api-server';
import { getBranch, pull, commit, push } from './git';

// __dirname = workbench/dist/main  →  project root is three levels up
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const VITE_PORT = 5173;

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

  await createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

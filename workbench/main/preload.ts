import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('workbench', {
  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('read-file', filePath),

  writeFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke('write-file', filePath, content),

  readDir: (dirPath: string): Promise<Array<{ name: string; isDir: boolean }>> =>
    ipcRenderer.invoke('read-dir', dirPath),

  git: {
    getBranch: (): Promise<string> =>
      ipcRenderer.invoke('git-branch'),
    pull: (): Promise<string> =>
      ipcRenderer.invoke('git-pull'),
    commit: (message: string): Promise<string> =>
      ipcRenderer.invoke('git-commit', message),
    push: (): Promise<string> =>
      ipcRenderer.invoke('git-push'),
  },

  // Campaign editor: native file dialogs
  showOpenDialog: (): Promise<{ cancelled: boolean; filename?: string; content?: string }> =>
    ipcRenderer.invoke('show-open-dialog'),

  showSaveDialog: (defaultName?: string): Promise<{ cancelled: boolean; filename?: string }> =>
    ipcRenderer.invoke('show-save-dialog', defaultName),

  saveCampaignFile: (filename: string, content: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('save-campaign-file', filename, content),

  // Tracker: native file dialogs
  showOpenSongDialog: (): Promise<{ cancelled: boolean; filename?: string; relativePath?: string; content?: string }> =>
    ipcRenderer.invoke('show-open-song-dialog'),

  showSaveSongDialog: (defaultName?: string): Promise<{ cancelled: boolean; filename?: string; relativePath?: string }> =>
    ipcRenderer.invoke('show-save-song-dialog', defaultName),
});

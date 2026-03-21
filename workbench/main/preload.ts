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
});

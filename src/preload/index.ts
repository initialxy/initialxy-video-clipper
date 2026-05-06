import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC_CHANNELS, type IPCPayloads } from '@shared/ipc';

const electronAPI = {
  // File path helper (replaces deprecated File.path)
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  // Clip
  createClip: (payload: IPCPayloads['clip:create']) => ipcRenderer.invoke('clip:create', payload),

  // Conversion
  bulkConvert: (payload: IPCPayloads['convert:bulk']) =>
    ipcRenderer.invoke('convert:bulk', payload),

  // File system
  getVideoInfo: (filePath: string) => ipcRenderer.invoke('fs:get-video-info', { filePath }),

  extractThumbnail: (payload: IPCPayloads['fs:extract-thumbnail']) =>
    ipcRenderer.invoke('fs:extract-thumbnail', payload),

  readCaption: (filePath: string) => ipcRenderer.invoke('fs:read-caption', { filePath }),

  writeCaption: (payload: IPCPayloads['fs:write-caption']) =>
    ipcRenderer.invoke('fs:write-caption', payload),

  scanOutputs: () => ipcRenderer.invoke('fs:scan-outputs', {}),

  deleteClip: (filePath: string) => ipcRenderer.invoke('fs:delete-clip', { filePath }),

  bulkDelete: (payload: IPCPayloads['fs:bulk-delete']) =>
    ipcRenderer.invoke('fs:bulk-delete', payload),

  // App
  openFile: () => ipcRenderer.invoke('app:open-file', {}),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', { key }),

  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', { key, value }),

  // Event listeners (one-way: main → renderer)
  onConvertProgress: (callback: (data: IPCPayloads['convert:progress']) => void) => {
    const listener = (_event: Event, data: IPCPayloads['convert:progress']) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.CONVERT_PROGRESS, listener as never);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CONVERT_PROGRESS, listener as never);
  },

  onConvertWarnNoChanges: (callback: () => void) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on(IPC_CHANNELS.CONVERT_WARN_NO_CHANGES, listener as never);
    return () =>
      ipcRenderer.removeListener(IPC_CHANNELS.CONVERT_WARN_NO_CHANGES, listener as never);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC_CHANNELS, type IPCPayloads } from '@shared/ipc';

/** Create an IPC listener that forwards data to a callback and returns a cleanup function. */
function createListener<T>(channel: string) {
  return (callback: (data: T) => void) => {
    const listener = (_event: Event, data: T) => callback(data);
    ipcRenderer.on(channel, listener as never);
    return () => ipcRenderer.removeListener(channel, listener as never);
  };
}

/** Create an IPC listener for events with no payload. */
function createNoArgListener(channel: string) {
  return (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on(channel, listener as never);
    return () => ipcRenderer.removeListener(channel, listener as never);
  };
}

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

  scanConverted: () => ipcRenderer.invoke('fs:scan-converted', {}),

  // App
  openFile: () => ipcRenderer.invoke('app:open-file', {}),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', { key }),

  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', { key, value }),

  // Event listeners (one-way: main → renderer)
  onConvertProgress: createListener<IPCPayloads['convert:progress']>(IPC_CHANNELS.CONVERT_PROGRESS),
  onConvertWarnNoChanges: createNoArgListener(IPC_CHANNELS.CONVERT_WARN_NO_CHANGES),

  // Auto-caption
  autoCaptionRun: (payload: IPCPayloads['auto-caption:run']) =>
    ipcRenderer.invoke('auto-caption:run', payload),

  autoCaptionInterrupt: () => ipcRenderer.invoke('auto-caption:interrupt', {}),

  onAutoCaptionProgress: createListener<IPCPayloads['auto-caption:progress']>(
    IPC_CHANNELS.AUTO_CAPTION_PROGRESS,
  ),
  onCaptionChanged: createListener<IPCPayloads['caption:changed']>(IPC_CHANNELS.CAPTION_CHANGED),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

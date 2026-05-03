import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

const electronAPI = {
  // Clip
  createClip: (payload: {
    inputPath: string;
    outputPath: string;
    start: number;
    duration: number;
  }) => ipcRenderer.invoke(IPC_CHANNELS.CLIP_CREATE, payload),

  // Conversion
  bulkConvert: (payload: {
    files: string[];
    settings: {
      codec: string;
      width: number;
      height: number;
      fps: number;
      bitrate: string;
    };
    outputDir: string;
  }) => ipcRenderer.invoke(IPC_CHANNELS.CONVERT_BULK, payload),

  // File system
  getVideoInfo: (filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_GET_VIDEO_INFO, { filePath }),

  extractThumbnail: (payload: { filePath: string; outputPath: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_EXTRACT_THUMBNAIL, payload),

  readCaption: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_READ_CAPTION, { filePath }),

  writeCaption: (payload: { filePath: string; content: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_WRITE_CAPTION, payload),

  scanOutputs: () => ipcRenderer.invoke(IPC_CHANNELS.FS_SCAN_OUTPUTS, {}),

  deleteClip: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_DELETE_CLIP, { filePath }),

  // App
  handleDragDrop: (filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_DRAG_DROP, { filePath }),

  checkFfmpeg: () => ipcRenderer.invoke(IPC_CHANNELS.APP_CHECK_FFMPEG, {}),

  openFile: () => ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_FILE, {}),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, { key }),

  setSetting: (key: string, value: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, { key, value }),

  // Event listeners (one-way: main → renderer)
  onClipWarnInsufficient: (callback: (data: { remaining: number; requested: number }) => void) => {
    const listener = (_event: Event, data: { remaining: number; requested: number }) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.CLIP_WARN_INSUFFICIENT, listener as AnyFunction);
    return () =>
      ipcRenderer.removeListener(IPC_CHANNELS.CLIP_WARN_INSUFFICIENT, listener as AnyFunction);
  },

  onConvertProgress: (
    callback: (data: { file: string; progress: number; status: string }) => void,
  ) => {
    const listener = (_event: Event, data: { file: string; progress: number; status: string }) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.CONVERT_PROGRESS, listener as AnyFunction);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CONVERT_PROGRESS, listener as AnyFunction);
  },

  onConvertWarnNoChanges: (callback: () => void) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on('convert:warn-no-changes', listener as AnyFunction);
    return () => ipcRenderer.removeListener('convert:warn-no-changes', listener as AnyFunction);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

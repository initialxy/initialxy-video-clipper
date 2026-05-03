import { contextBridge, ipcRenderer } from 'electron';

// Type declaration is in src/env.d.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

/**
 * All IPC channel names used in the app.
 * Keep this in sync with main process handlers.
 */
export const IPC_CHANNELS = {
  // Clip operations
  CLIP_CREATE: 'clip:create',
  CLIP_WARN_INSUFFICIENT: 'clip:warn-insufficient',

  // Bulk conversion
  CONVERT_BULK: 'convert:bulk',
  CONVERT_PROGRESS: 'convert:progress',

  // File system
  FS_GET_VIDEO_INFO: 'fs:get-video-info',
  FS_EXTRACT_THUMBNAIL: 'fs:extract-thumbnail',
  FS_READ_CAPTION: 'fs:read-caption',
  FS_WRITE_CAPTION: 'fs:write-caption',
  FS_SCAN_OUTPUTS: 'fs:scan-outputs',
  FS_DELETE_CLIP: 'fs:delete-clip',

  // App
  APP_DRAG_DROP: 'app:drag-drop',
  APP_CHECK_FFMPEG: 'app:check-ffmpeg',
  APP_OPEN_FILE: 'app:open-file',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
} as const;

/**
 * Type-safe IPC API exposed to the renderer via contextBridge.
 */
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
      width: number;
      height: number;
      codec: string;
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

  // File system
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
};

// Expose the API to the renderer process
// eslint-disable-next-line @typescript-eslint/no-explicit-any
contextBridge.exposeInMainWorld('electronAPI', electronAPI as any);

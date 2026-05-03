/** IPC channel names */
export const IPC_CHANNELS = {
  CLIP_CREATE: 'clip:create',
  CLIP_WARN_INSUFFICIENT: 'clip:warn-insufficient',
  CONVERT_BULK: 'convert:bulk',
  CONVERT_PROGRESS: 'convert:progress',
  CONVERT_WARN_NO_CHANGES: 'convert:warn-no-changes',
  FS_GET_VIDEO_INFO: 'fs:get-video-info',
  FS_EXTRACT_THUMBNAIL: 'fs:extract-thumbnail',
  FS_READ_CAPTION: 'fs:read-caption',
  FS_WRITE_CAPTION: 'fs:write-caption',
  FS_SCAN_OUTPUTS: 'fs:scan-outputs',
  FS_DELETE_CLIP: 'fs:delete-clip',
  APP_DRAG_DROP: 'app:drag-drop',
  APP_CHECK_FFMPEG: 'app:check-ffmpeg',
  APP_OPEN_FILE: 'app:open-file',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
} as const;

/** Payload types for each IPC channel */
export interface IPCPayloads {
  [IPC_CHANNELS.CLIP_CREATE]: {
    inputPath: string;
    outputPath: string;
    start: number;
    duration: number;
  };
  [IPC_CHANNELS.CLIP_WARN_INSUFFICIENT]: { remaining: number; requested: number };
  [IPC_CHANNELS.CONVERT_BULK]: {
    files: string[];
    settings: {
      codec: string;
      width: number;
      height: number;
      fps: number;
      bitrate: string;
    };
    outputDir: string;
  };
  [IPC_CHANNELS.CONVERT_PROGRESS]: {
    file: string;
    progress: number;
    status: string;
  };
  [IPC_CHANNELS.FS_GET_VIDEO_INFO]: { filePath: string };
  [IPC_CHANNELS.FS_EXTRACT_THUMBNAIL]: { filePath: string; outputPath: string };
  [IPC_CHANNELS.FS_READ_CAPTION]: { filePath: string };
  [IPC_CHANNELS.FS_WRITE_CAPTION]: { filePath: string; content: string };
  [IPC_CHANNELS.FS_SCAN_OUTPUTS]: {};
  [IPC_CHANNELS.FS_DELETE_CLIP]: { filePath: string };
  [IPC_CHANNELS.APP_DRAG_DROP]: { filePath: string };
  [IPC_CHANNELS.APP_CHECK_FFMPEG]: {};
  [IPC_CHANNELS.APP_OPEN_FILE]: {};
  [IPC_CHANNELS.SETTINGS_GET]: { key: string };
  [IPC_CHANNELS.SETTINGS_SET]: { key: string; value: string };
}

/** Return types for each IPC channel */
export interface IPCReturns {
  [IPC_CHANNELS.CLIP_CREATE]: { success: boolean; outputPath?: string; error?: string };
  [IPC_CHANNELS.CONVERT_BULK]: {
    success: boolean;
    results?: Array<{ file: string; success: boolean; error?: string }>;
  };
  [IPC_CHANNELS.FS_GET_VIDEO_INFO]: {
    duration: number;
    width: number;
    height: number;
    codec: string;
    fps: number;
  };
  [IPC_CHANNELS.FS_EXTRACT_THUMBNAIL]: { success: boolean; outputPath?: string };
  [IPC_CHANNELS.FS_READ_CAPTION]: { content?: string; exists: boolean };
  [IPC_CHANNELS.FS_WRITE_CAPTION]: { success: boolean };
  [IPC_CHANNELS.FS_SCAN_OUTPUTS]: {
    files: Array<{ path: string; name: string; size: number; modified: string }>;
  };
  [IPC_CHANNELS.FS_DELETE_CLIP]: { success: boolean; error?: string };
  [IPC_CHANNELS.APP_DRAG_DROP]: { success: boolean };
  [IPC_CHANNELS.APP_CHECK_FFMPEG]: { available: boolean; path?: string };
  [IPC_CHANNELS.APP_OPEN_FILE]: { filePath?: string; cancelled: boolean };
  [IPC_CHANNELS.SETTINGS_GET]: { value?: string };
  [IPC_CHANNELS.SETTINGS_SET]: { success: boolean };
}

/** Map each channel to its invoke signature */
export interface IPCRegistry {
  [IPC_CHANNELS.CLIP_CREATE]: (
    payload: IPCPayloads[typeof IPC_CHANNELS.CLIP_CREATE],
  ) => Promise<IPCReturns[typeof IPC_CHANNELS.CLIP_CREATE]>;
  [IPC_CHANNELS.CONVERT_BULK]: (
    payload: IPCPayloads[typeof IPC_CHANNELS.CONVERT_BULK],
  ) => Promise<IPCReturns[typeof IPC_CHANNELS.CONVERT_BULK]>;
  [IPC_CHANNELS.FS_GET_VIDEO_INFO]: (
    payload: IPCPayloads[typeof IPC_CHANNELS.FS_GET_VIDEO_INFO],
  ) => Promise<IPCReturns[typeof IPC_CHANNELS.FS_GET_VIDEO_INFO]>;
  [IPC_CHANNELS.FS_EXTRACT_THUMBNAIL]: (
    payload: IPCPayloads[typeof IPC_CHANNELS.FS_EXTRACT_THUMBNAIL],
  ) => Promise<IPCReturns[typeof IPC_CHANNELS.FS_EXTRACT_THUMBNAIL]>;
  [IPC_CHANNELS.FS_READ_CAPTION]: (
    payload: IPCPayloads[typeof IPC_CHANNELS.FS_READ_CAPTION],
  ) => Promise<IPCReturns[typeof IPC_CHANNELS.FS_READ_CAPTION]>;
  [IPC_CHANNELS.FS_WRITE_CAPTION]: (
    payload: IPCPayloads[typeof IPC_CHANNELS.FS_WRITE_CAPTION],
  ) => Promise<IPCReturns[typeof IPC_CHANNELS.FS_WRITE_CAPTION]>;
  [IPC_CHANNELS.FS_SCAN_OUTPUTS]: () => Promise<IPCReturns[typeof IPC_CHANNELS.FS_SCAN_OUTPUTS]>;
  [IPC_CHANNELS.FS_DELETE_CLIP]: (
    payload: IPCPayloads[typeof IPC_CHANNELS.FS_DELETE_CLIP],
  ) => Promise<IPCReturns[typeof IPC_CHANNELS.FS_DELETE_CLIP]>;
  [IPC_CHANNELS.APP_DRAG_DROP]: (
    payload: IPCPayloads[typeof IPC_CHANNELS.APP_DRAG_DROP],
  ) => Promise<IPCReturns[typeof IPC_CHANNELS.APP_DRAG_DROP]>;
  [IPC_CHANNELS.APP_CHECK_FFMPEG]: () => Promise<IPCReturns[typeof IPC_CHANNELS.APP_CHECK_FFMPEG]>;
  [IPC_CHANNELS.APP_OPEN_FILE]: () => Promise<IPCReturns[typeof IPC_CHANNELS.APP_OPEN_FILE]>;
  [IPC_CHANNELS.SETTINGS_GET]: (
    payload: IPCPayloads[typeof IPC_CHANNELS.SETTINGS_GET],
  ) => Promise<IPCReturns[typeof IPC_CHANNELS.SETTINGS_GET]>;
  [IPC_CHANNELS.SETTINGS_SET]: (
    payload: IPCPayloads[typeof IPC_CHANNELS.SETTINGS_SET],
  ) => Promise<IPCReturns[typeof IPC_CHANNELS.SETTINGS_SET]>;
}

/**
 * Event listener signature for one-way (main → renderer) channels.
 */
export type OnEventListener<T> = (callback: (data: T) => void) => () => void;

/**
 * Derived ElectronAPI from IPCRegistry.
 * Invoke methods come from IPCRegistry; event listeners are added for one-way channels.
 */
export type ElectronAPI = IPCRegistry & {
  onClipWarnInsufficient: OnEventListener<IPCPayloads[typeof IPC_CHANNELS.CLIP_WARN_INSUFFICIENT]>;
  onConvertProgress: OnEventListener<IPCPayloads[typeof IPC_CHANNELS.CONVERT_PROGRESS]>;
  onConvertWarnNoChanges: OnEventListener<void>;
};

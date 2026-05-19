import type { GalleryFile, ConvertedFileInfo } from '@shared/types';

/** IPC channel names */
export const IPC_CHANNELS = {
  CLIP_CREATE: 'clip:create',
  CONVERT_BULK: 'convert:bulk',
  CONVERT_PROGRESS: 'convert:progress',
  CONVERT_WARN_NO_CHANGES: 'convert:warn-no-changes',
  AUTO_CAPTION_RUN: 'auto-caption:run',
  AUTO_CAPTION_PROGRESS: 'auto-caption:progress',
  AUTO_CAPTION_INTERRUPT: 'auto-caption:interrupt',
  FS_GET_VIDEO_INFO: 'fs:get-video-info',
  FS_EXTRACT_THUMBNAIL: 'fs:extract-thumbnail',
  FS_READ_CAPTION: 'fs:read-caption',
  FS_WRITE_CAPTION: 'fs:write-caption',
  CAPTION_CHANGED: 'caption:changed',
  FS_SCAN_OUTPUTS: 'fs:scan-outputs',
  FS_DELETE_CLIP: 'fs:delete-clip',
  FS_BULK_DELETE: 'fs:bulk-delete',
  FS_SCAN_CONVERTED: 'fs:scan-converted',
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
  [IPC_CHANNELS.CONVERT_BULK]: {
    files: string[];
    settings: {
      codec: string;
      width: number;
      height: number;
      fps: number;
      bitrate: string;
      flipped: boolean;
    };
    outputDir: string;
  };
  [IPC_CHANNELS.CONVERT_PROGRESS]: {
    file: string;
    current: number;
    total: number;
    status: string;
  };
  [IPC_CHANNELS.AUTO_CAPTION_RUN]: {
    files: string[];
    config: { baseUrl: string; model: string; apiKey: string };
  };
  [IPC_CHANNELS.AUTO_CAPTION_PROGRESS]: {
    file: string;
    current: number;
    total: number;
    status: string;
  };
  [IPC_CHANNELS.AUTO_CAPTION_INTERRUPT]: {};
  [IPC_CHANNELS.FS_GET_VIDEO_INFO]: { filePath: string };
  [IPC_CHANNELS.FS_EXTRACT_THUMBNAIL]: { filePath: string; outputPath: string };
  [IPC_CHANNELS.FS_READ_CAPTION]: { filePath: string };
  [IPC_CHANNELS.FS_WRITE_CAPTION]: { filePath: string; content: string };
  [IPC_CHANNELS.CAPTION_CHANGED]: { filePath: string; content: string };
  [IPC_CHANNELS.FS_SCAN_OUTPUTS]: {};
  [IPC_CHANNELS.FS_DELETE_CLIP]: { filePath: string };
  [IPC_CHANNELS.FS_BULK_DELETE]: { paths: string[] };
  [IPC_CHANNELS.FS_SCAN_CONVERTED]: {};
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
  [IPC_CHANNELS.AUTO_CAPTION_RUN]: {
    success: boolean;
    results?: Array<{ file: string; success: boolean; error?: string }>;
  };
  [IPC_CHANNELS.AUTO_CAPTION_INTERRUPT]: { cancelled: boolean };
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
    files: GalleryFile[];
  };
  [IPC_CHANNELS.FS_DELETE_CLIP]: { success: boolean; error?: string };
  [IPC_CHANNELS.FS_BULK_DELETE]: { success: boolean; errors: string[] };
  [IPC_CHANNELS.FS_SCAN_CONVERTED]: { files: ConvertedFileInfo[] };
  [IPC_CHANNELS.APP_OPEN_FILE]: { filePath?: string; cancelled: boolean };
  [IPC_CHANNELS.SETTINGS_GET]: { value?: string };
  [IPC_CHANNELS.SETTINGS_SET]: { success: boolean };
}

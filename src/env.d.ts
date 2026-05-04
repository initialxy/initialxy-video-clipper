/// <reference types="vite/client" />

declare module '*.css' {
  // CSS imports are side-effects only
}

import type { IPCPayloads, IPCReturns } from '@shared/ipc';

declare global {
  interface ElectronAPI {
    getPathForFile: (file: File) => string;
    createClip: (payload: IPCPayloads['clip:create']) => Promise<IPCReturns['clip:create']>;
    bulkConvert: (payload: IPCPayloads['convert:bulk']) => Promise<IPCReturns['convert:bulk']>;
    getVideoInfo: (filePath: string) => Promise<IPCReturns['fs:get-video-info']>;
    extractThumbnail: (
      payload: IPCPayloads['fs:extract-thumbnail'],
    ) => Promise<IPCReturns['fs:extract-thumbnail']>;
    readCaption: (filePath: string) => Promise<IPCReturns['fs:read-caption']>;
    writeCaption: (
      payload: IPCPayloads['fs:write-caption'],
    ) => Promise<IPCReturns['fs:write-caption']>;
    scanOutputs: () => Promise<IPCReturns['fs:scan-outputs']>;
    deleteClip: (filePath: string) => Promise<IPCReturns['fs:delete-clip']>;
    handleDragDrop: (filePath: string) => Promise<IPCReturns['app:drag-drop']>;
    checkFfmpeg: () => Promise<IPCReturns['app:check-ffmpeg']>;
    openFile: () => Promise<IPCReturns['app:open-file']>;
    getSetting: (key: string) => Promise<IPCReturns['settings:get']>;
    setSetting: (key: string, value: string) => Promise<IPCReturns['settings:set']>;
    onClipWarnInsufficient: (
      callback: (data: IPCPayloads['clip:warn-insufficient']) => void,
    ) => () => void;
    onConvertProgress: (callback: (data: IPCPayloads['convert:progress']) => void) => () => void;
    onConvertWarnNoChanges: (callback: () => void) => () => void;
  }

  interface Window {
    electronAPI: ElectronAPI;
  }
}

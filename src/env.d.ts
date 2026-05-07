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
    bulkDelete: (payload: IPCPayloads['fs:bulk-delete']) => Promise<IPCReturns['fs:bulk-delete']>;
    openFile: () => Promise<IPCReturns['app:open-file']>;
    getSetting: (key: string) => Promise<IPCReturns['settings:get']>;
    setSetting: (key: string, value: string) => Promise<IPCReturns['settings:set']>;
    onConvertProgress: (callback: (data: IPCPayloads['convert:progress']) => void) => () => void;
    onConvertWarnNoChanges: (callback: () => void) => () => void;
    autoCaptionRun: (
      payload: IPCPayloads['auto-caption:run'],
    ) => Promise<IPCReturns['auto-caption:run']>;
    autoCaptionInterrupt: () => Promise<IPCReturns['auto-caption:interrupt']>;
    onAutoCaptionProgress: (
      callback: (data: IPCPayloads['auto-caption:progress']) => void,
    ) => () => void;
    onCaptionChanged: (callback: (data: IPCPayloads['caption:changed']) => void) => () => void;
  }

  interface Window {
    electronAPI: ElectronAPI;
  }
}

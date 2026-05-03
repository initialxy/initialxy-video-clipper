/// <reference types="vite/client" />

// CSS side-effect imports
declare module '*.css' {
  // No named exports — CSS imports are side-effects only
}

// Electron API exposed via preload script
interface ElectronAPI {
  createClip: (payload: {
    inputPath: string;
    outputPath: string;
    start: number;
    duration: number;
  }) => Promise<{ success: boolean; outputPath?: string; error?: string }>;

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
  }) => Promise<{
    success: boolean;
    results?: Array<{ file: string; success: boolean; error?: string }>;
  }>;

  getVideoInfo: (filePath: string) => Promise<{
    duration: number;
    width: number;
    height: number;
    codec: string;
    fps: number;
  }>;

  extractThumbnail: (payload: {
    filePath: string;
    outputPath: string;
  }) => Promise<{ success: boolean; outputPath?: string }>;

  readCaption: (filePath: string) => Promise<{ content?: string; exists: boolean }>;

  writeCaption: (payload: { filePath: string; content: string }) => Promise<{ success: boolean }>;

  scanOutputs: () => Promise<{
    files: Array<{ path: string; name: string; size: number; modified: string }>;
  }>;

  handleDragDrop: (filePath: string) => Promise<{ success: boolean }>;

  onClipWarnInsufficient: (
    callback: (data: { remaining: number; requested: number }) => void,
  ) => () => void;

  onConvertProgress: (
    callback: (data: { file: string; progress: number; status: string }) => void,
  ) => () => void;
}

interface Window {
  electronAPI: ElectronAPI;
}

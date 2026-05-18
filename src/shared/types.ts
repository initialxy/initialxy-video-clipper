/** Video information extracted via ffprobe */
export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  codec: string;
  fps: number;
}

/** Result of a clip operation */
export interface ClipResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

/** Conversion settings for bulk conversion */
export interface ConvertSettings {
  codec: string; // "" means "same as source"
  width: number; // 0 means "same as source"
  height: number; // 0 means "same as source"
  fps: number; // 0 means "same as source"
  bitrate: string; // "" means "same as source"
  flipped: boolean; // create a horizontally flipped copy
}

/** Per-file conversion result */
export interface ConvertResult {
  file: string;
  success: boolean;
  error?: string;
}

/** Conversion progress event */
export interface ConvertProgress {
  file: string;
  progress: number; // 0-100
  status: 'converting' | 'done' | 'error';
}

/** Auto-caption progress event */
export interface AutoCaptionProgress {
  file: string;
  current: number;
  total: number;
  status: 'processing' | 'done' | 'error';
}

/** Per-file auto-caption result */
export interface AutoCaptionResult {
  file: string;
  success: boolean;
  error?: string;
}

/** A file in the gallery */
export interface GalleryFile {
  path: string;
  name: string;
  size: number;
  modified: string;
  caption?: string;
  thumbnail?: string;
}

/** Info about a converted video file (for frame count display) */
export interface ConvertedFileInfo {
  thumbnailPath: string;
  fileName: string;
  frameCount: number;
}

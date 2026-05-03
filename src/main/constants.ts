/** Video file extensions accepted for drag-drop and gallery scanning */
export const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.mts']);

/** Settings key names for persistent storage */
export const SETTINGS_KEYS = {
  CONVERT_CODEC: 'convert_codec',
  CONVERT_WIDTH: 'convert_width',
  CONVERT_HEIGHT: 'convert_height',
  CONVERT_FPS: 'convert_fps',
  CONVERT_BITRATE: 'convert_bitrate',
} as const;

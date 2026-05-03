import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
// @ts-expect-error which has no types
import { which } from 'which';

import { IPC_CHANNELS } from '@shared/ipc';
import { createClip } from './services/clip.service';
import { bulkConvert, isNoOpConversion } from './services/convert.service';
import { scanOutputs, deleteClip, extractThumbnail } from './services/gallery.service';
import { readCaption, writeCaption } from './services/caption.service';
import { getSetting, setSetting } from './db';

// Video extensions accepted for drag-drop
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.mts']);

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows[0] ?? null;
}

/** Extract video info using ffprobe */
function getVideoInfo(filePath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  codec: string;
  fps: number;
}> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `ffprobe exited with code ${code}`));
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams?.find(
          (s: { codec_type: string }) => s.codec_type === 'video',
        );

        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        const duration = parseFloat(data.format?.duration ?? videoStream?.duration ?? '0');
        const width = parseInt(videoStream.width ?? '0', 10);
        const height = parseInt(videoStream.height ?? '0', 10);
        const codec = videoStream.codec_name ?? '';

        // Parse fps from r_frame_rate (e.g., "24000000/1001")
        const fpsStr = videoStream.r_frame_rate ?? '0/1';
        const [num, den] = fpsStr.split('/').map(Number);
        const fps = den !== 0 ? num / den : 0;

        resolve({ duration, width, height, codec, fps: Math.round(fps * 100) / 100 });
      } catch {
        reject(new Error('Failed to parse ffprobe output'));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/** Check if ffmpeg is available */
function checkFfmpeg(): { available: boolean; path?: string } {
  try {
    const ffmpegPath = which.sync('ffmpeg');
    return { available: true, path: ffmpegPath };
  } catch {
    return { available: false };
  }
}

export function registerIpcHandlers(): void {
  // Check ffmpeg on launch
  const ffmpegCheck = checkFfmpeg();
  if (!ffmpegCheck.available) {
    dialog.showErrorBox(
      'ffmpeg Not Found',
      'ffmpeg is required but not found in PATH.\nPlease install ffmpeg and restart the app.',
    );
  }

  // clip:create
  ipcMain.handle(IPC_CHANNELS.CLIP_CREATE, async (_event, payload) => {
    const result = await createClip(payload);
    return {
      success: result.success,
      outputPath: result.outputPath,
      error: result.error,
    };
  });

  // convert:bulk
  ipcMain.handle(IPC_CHANNELS.CONVERT_BULK, async (_event, payload) => {
    const { files, settings } = payload;

    // Warn if no changes
    if (isNoOpConversion(settings)) {
      const win = getMainWindow();
      win?.webContents.send('convert:warn-no-changes', {});
    }

    const results = await bulkConvert(files, settings, (progressEvent) => {
      const win = getMainWindow();
      win?.webContents.send(IPC_CHANNELS.CONVERT_PROGRESS, progressEvent);
    });

    return { success: results.success, results: results.results };
  });

  // fs:get-video-info
  ipcMain.handle(IPC_CHANNELS.FS_GET_VIDEO_INFO, async (_event, payload) => {
    try {
      return await getVideoInfo(payload.filePath);
    } catch {
      return {
        duration: 0,
        width: 0,
        height: 0,
        codec: '',
        fps: 0,
      };
    }
  });

  // fs:extract-thumbnail
  ipcMain.handle(IPC_CHANNELS.FS_EXTRACT_THUMBNAIL, async (_event, payload) => {
    const result = await extractThumbnail(payload.filePath, payload.outputPath);
    return { success: result.success, outputPath: result.success ? payload.outputPath : undefined };
  });

  // fs:read-caption
  ipcMain.handle(IPC_CHANNELS.FS_READ_CAPTION, async (_event, payload) => {
    return readCaption(payload.filePath);
  });

  // fs:write-caption
  ipcMain.handle(IPC_CHANNELS.FS_WRITE_CAPTION, async (_event, payload) => {
    return writeCaption(payload.filePath, payload.content);
  });

  // fs:scan-outputs
  ipcMain.handle(IPC_CHANNELS.FS_SCAN_OUTPUTS, async () => {
    const files = scanOutputs();
    return { files };
  });

  // fs:delete-clip
  ipcMain.handle(IPC_CHANNELS.FS_DELETE_CLIP, async (_event, payload) => {
    return deleteClip(payload.filePath);
  });

  // app:drag-drop
  ipcMain.handle(IPC_CHANNELS.APP_DRAG_DROP, async (_event, payload) => {
    const filePath = payload.filePath;
    const ext = path.extname(filePath).toLowerCase();
    if (VIDEO_EXTENSIONS.has(ext) && fs.existsSync(filePath)) {
      return { success: true };
    }
    return { success: false };
  });

  // app:check-ffmpeg
  ipcMain.handle(IPC_CHANNELS.APP_CHECK_FFMPEG, async () => {
    return checkFfmpeg();
  });

  // app:open-file
  ipcMain.handle(IPC_CHANNELS.APP_OPEN_FILE, async () => {
    const win = getMainWindow();
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: [
        { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mts'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { cancelled: true };
    }

    return { cancelled: false, filePath: result.filePaths[0] };
  });

  // settings:get
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (_event, payload) => {
    const value = getSetting(payload.key);
    return { value };
  });

  // settings:set
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, payload) => {
    try {
      setSetting(payload.key, payload.value);
      return { success: true };
    } catch {
      return { success: false };
    }
  });
}

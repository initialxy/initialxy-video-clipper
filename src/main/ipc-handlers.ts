import electron from 'electron';
const { ipcMain, dialog, BrowserWindow } = electron;
import type { BrowserWindow as BrowserWindowType } from 'electron';

import { IPC_CHANNELS } from '@shared/ipc';
import { createClip } from './services/clip.service';
import { bulkConvert, isNoOpConversion } from './services/convert.service';
import {
  scanOutputs,
  deleteClip,
  extractThumbnail,
  bulkDeleteFiles,
} from './services/gallery.service';
import { readCaption, writeCaption } from './services/caption.service';
import { getSetting, setSetting } from './db';
import { getVideoInfo } from './services/ffprobe.service';
import { runAutoCaption } from './services/auto-caption.service';

function getMainWindow(): BrowserWindowType | null {
  const windows = BrowserWindow.getAllWindows();
  return windows[0] ?? null;
}

export function registerIpcHandlers(): void {
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

  // fs:bulk-delete
  ipcMain.handle(IPC_CHANNELS.FS_BULK_DELETE, async (_event, payload) => {
    return bulkDeleteFiles(payload.paths);
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

  // auto-caption:run
  ipcMain.handle(
    IPC_CHANNELS.AUTO_CAPTION_RUN,
    async (
      _event,
      payload: { files: string[]; config: { baseUrl: string; model: string; apiKey: string } },
    ) => {
      const { files, config } = payload;
      let cancelled = false;

      const onceListener = (_evt: unknown, _data: unknown) => {
        cancelled = true;
      };
      ipcMain.once(IPC_CHANNELS.AUTO_CAPTION_INTERRUPT, onceListener);

      const checkCancelled = () => cancelled;

      const { results } = await runAutoCaption(
        files,
        config,
        (progressEvent) => {
          const win = getMainWindow();
          win?.webContents.send(IPC_CHANNELS.AUTO_CAPTION_PROGRESS, progressEvent);
        },
        checkCancelled,
      );

      return { success: true, results };
    },
  );

  // auto-caption:interrupt
  ipcMain.handle(IPC_CHANNELS.AUTO_CAPTION_INTERRUPT, async () => {
    return { cancelled: true };
  });
}

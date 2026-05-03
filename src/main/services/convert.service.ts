import fs from 'fs';
import path from 'path';
import { buildConvertCommand } from '@main/ffmpeg';
import { runFfmpeg } from './ffmpeg-executor';
import { getCaptionPath } from '@shared/utils';
import type { ConvertSettings, ConvertProgress } from '@shared/types';

const CONVERTED_DIR = path.join(process.cwd(), 'converted');

export function isNoOpConversion(settings: ConvertSettings): boolean {
  return (
    !settings.codec && !settings.width && !settings.height && !settings.fps && !settings.bitrate
  );
}

function ensureConvertedDir(): void {
  if (!fs.existsSync(CONVERTED_DIR)) {
    fs.mkdirSync(CONVERTED_DIR, { recursive: true });
  }
}

function copyCaption(inputPath: string, outputName: string): void {
  const captionPath = getCaptionPath(inputPath);
  if (fs.existsSync(captionPath)) {
    const destCaption = getCaptionPath(path.join(CONVERTED_DIR, outputName));
    fs.copyFileSync(captionPath, destCaption);
  }
}

export async function bulkConvert(
  files: string[],
  settings: ConvertSettings,
  onProgress: (event: ConvertProgress) => void,
): Promise<{
  success: boolean;
  results: Array<{ file: string; success: boolean; error?: string }>;
}> {
  ensureConvertedDir();

  const results: Array<{ file: string; success: boolean; error?: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = path.basename(file);
    const progress = Math.round(((i + 1) / files.length) * 100);

    onProgress({ file: fileName, progress, status: 'converting' });

    // If all settings are "same as source", just copy
    if (isNoOpConversion(settings)) {
      const destPath = path.join(CONVERTED_DIR, fileName);
      try {
        fs.copyFileSync(file, destPath);
        copyCaption(file, fileName);
        results.push({ file: fileName, success: true });
        onProgress({ file: fileName, progress, status: 'done' });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ file: fileName, success: false, error: errorMsg });
        onProgress({ file: fileName, progress, status: 'error' });
      }
      continue;
    }

    const destPath = path.join(CONVERTED_DIR, fileName);
    const options: {
      codec?: string;
      width?: number;
      height?: number;
      fps?: number;
      bitrate?: string;
    } = {};

    if (settings.codec) options.codec = settings.codec;
    if (settings.width && settings.height) {
      options.width = settings.width;
      options.height = settings.height;
    }
    if (settings.fps) options.fps = settings.fps;
    if (settings.bitrate) options.bitrate = settings.bitrate;

    const args = buildConvertCommand(file, destPath, options);
    const result = await runFfmpeg(args);

    if (result.success) {
      copyCaption(file, fileName);
      results.push({ file: fileName, success: true });
      onProgress({ file: fileName, progress, status: 'done' });
    } else {
      // Clean up failed output
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      results.push({ file: fileName, success: false, error: result.error });
      onProgress({ file: fileName, progress, status: 'error' });
    }
  }

  const allSuccess = results.every((r) => r.success);
  return { success: allSuccess, results };
}

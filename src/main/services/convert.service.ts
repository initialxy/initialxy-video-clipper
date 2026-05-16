import fs from 'fs';
import path from 'path';
import { buildConvertCommand, buildFlipCommand } from '@main/ffmpeg';
import { runFfmpeg } from './ffmpeg-executor';
import { getCaptionPath } from '@shared/utils';
import { ensureDir, safeUnlink } from '@main/utils';
import { readCaption, writeCaption } from './caption.service';
import type { ConvertSettings, ConvertProgress } from '@shared/types';

const CONVERTED_DIR = path.join(process.cwd(), 'converted');

export function isNoOpConversion(settings: ConvertSettings): boolean {
  return (
    !settings.codec && !settings.width && !settings.height && !settings.fps && !settings.bitrate
  );
}

function ensureConvertedDir(): void {
  ensureDir(CONVERTED_DIR);
}

function copyCaption(inputPath: string, outputName: string): void {
  const captionPath = getCaptionPath(inputPath);
  if (fs.existsSync(captionPath)) {
    const destCaption = getCaptionPath(path.join(CONVERTED_DIR, outputName));
    fs.copyFileSync(captionPath, destCaption);
  }
}

function swapLeftRight(text: string): string {
  const placeholder = '\x00__LEFT__\x00';
  return text
    .replace(/left/g, placeholder)
    .replace(/right/g, 'left')
    .replace(new RegExp(placeholder, 'g'), 'right');
}

async function flipFile(
  inputPath: string,
  outputName: string,
): Promise<{ success: boolean; error?: string }> {
  const baseName = path.parse(outputName).name;
  const ext = path.parse(outputName).ext;
  const flippedName = `${baseName}_flipped${ext}`;
  const flippedPath = path.join(CONVERTED_DIR, flippedName);

  const args = buildFlipCommand(inputPath, flippedPath);
  const result = await runFfmpeg(args);

  if (!result.success) {
    safeUnlink(flippedPath);
    return { success: false, error: result.error };
  }

  // Copy caption with "left" ↔ "right" swap
  const captionPath = getCaptionPath(inputPath);
  if (fs.existsSync(captionPath)) {
    const captionData = readCaption(inputPath);
    if (captionData.content) {
      const swapped = swapLeftRight(captionData.content);
      const destCaption = getCaptionPath(path.join(CONVERTED_DIR, flippedName));
      writeCaption(destCaption, swapped);
    }
  }
  return { success: true };
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
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ file: fileName, success: false, error: errorMsg });
        onProgress({ file: fileName, progress, status: 'error' });
        continue;
      }

      // Flip step after copy
      if (settings.flipped) {
        const flipResult = await flipFile(file, fileName);
        if (!flipResult.success) {
          results.push({ file: fileName, success: false, error: flipResult.error });
          onProgress({ file: fileName, progress, status: 'error' });
          continue;
        }
      }

      results.push({ file: fileName, success: true });
      onProgress({ file: fileName, progress, status: 'done' });
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
    }

    // Flip step after conversion
    if (settings.flipped) {
      const flipResult = await flipFile(destPath, fileName);
      if (!flipResult.success) {
        // Clean up converted file if flip failed
        safeUnlink(destPath);
        results.push({ file: fileName, success: false, error: flipResult.error });
        onProgress({ file: fileName, progress, status: 'error' });
        continue;
      }
    }

    if (result.success) {
      results.push({ file: fileName, success: true });
      onProgress({ file: fileName, progress, status: 'done' });
    } else {
      // Clean up failed output
      safeUnlink(destPath);
      results.push({ file: fileName, success: false, error: result.error });
      onProgress({ file: fileName, progress, status: 'error' });
    }
  }

  const allSuccess = results.every((r) => r.success);
  return { success: allSuccess, results };
}

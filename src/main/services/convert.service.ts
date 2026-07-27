import fs from 'fs';
import path from 'path';
import { buildConvertCommand, buildFlipCommand } from '@main/ffmpeg';
import { runFfmpeg } from './ffmpeg-executor';
import { getVideoInfo, getFrameCount } from './ffprobe.service';
import { getCaptionPath } from '@shared/utils';
import { ensureDir, safeUnlink } from '@main/utils';
import { readCaption, writeCaption } from './caption.service';
import type { ConvertSettings, ConvertProgress } from '@shared/types';
import { CONVERTED_DIR } from '@main/paths';

export function isNoOpConversion(settings: ConvertSettings): boolean {
  return (
    !settings.codec &&
    !settings.width &&
    !settings.height &&
    !settings.fps &&
    settings.totalFrames <= 0 &&
    !settings.bitrate
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

function buildConvertOptions(
  settings: ConvertSettings,
  effectiveFps?: number,
): {
  codec?: string;
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: string;
} {
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
  // Use effectiveFps (calculated from totalFrames) or settings.fps (direct FPS mode)
  if (effectiveFps) {
    options.fps = effectiveFps;
  } else if (settings.fps) {
    options.fps = settings.fps;
  }
  if (settings.bitrate) options.bitrate = settings.bitrate;
  return options;
}

async function runMainOperation(
  inputPath: string,
  destPath: string,
  settings: ConvertSettings,
  effectiveFps?: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (isNoOpConversion(settings)) {
      fs.copyFileSync(inputPath, destPath);
      return { success: true };
    }
    const options = buildConvertOptions(settings, effectiveFps);
    const args = buildConvertCommand(inputPath, destPath, options);
    const result = await runFfmpeg(args);
    return { success: result.success, error: result.error };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

function emitProgress(
  fileName: string,
  current: number,
  total: number,
  status: ConvertProgress['status'],
  onProgress: (event: ConvertProgress) => void,
): void {
  onProgress({ file: fileName, current, total, status });
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
  const totalSteps = settings.flipped ? files.length * 2 : files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = path.basename(file);
    const destPath = path.join(CONVERTED_DIR, fileName);
    let stepIndex = settings.flipped ? i * 2 : i;

    // Calculate effective FPS when totalFrames mode is active
    let effectiveFps: number | undefined;
    if (settings.fpsMode === 'frames' && settings.totalFrames > 0) {
      try {
        const [info, sourceFrameCount] = await Promise.all([
          getVideoInfo(file),
          getFrameCount(file),
        ]);
        // targetFps = (totalFrames + 1) * sourceFps / sourceFrameCount
        // Round up to nearest 0.1 to ensure at least targetFrames.
        // + 1 because end frame end to be dropped.
        if (sourceFrameCount > 0 && info.fps > 0) {
          const rawFps = ((settings.totalFrames + 1) * info.fps) / sourceFrameCount;
          effectiveFps = Math.ceil(rawFps * 10) / 10;
        }
      } catch {
        // If probe fails, skip FPS calculation for this file
      }
    }

    emitProgress(fileName, stepIndex, totalSteps, 'converting', onProgress);

    // Main operation (copy or convert)
    const mainResult = await runMainOperation(file, destPath, settings, effectiveFps);
    if (mainResult.success) {
      copyCaption(file, fileName);
    }
    stepIndex++;

    // Optional flip step
    if (settings.flipped) {
      const flipResult = await flipFile(destPath, fileName);
      if (!flipResult.success) {
        safeUnlink(destPath);
        results.push({ file: fileName, success: false, error: flipResult.error });
        stepIndex++;
        emitProgress(fileName, stepIndex, totalSteps, 'error', onProgress);
        continue;
      }
    }

    stepIndex++;

    if (mainResult.success) {
      results.push({ file: fileName, success: true });
      emitProgress(fileName, stepIndex, totalSteps, 'done', onProgress);
    } else {
      safeUnlink(destPath);
      results.push({ file: fileName, success: false, error: mainResult.error });
      emitProgress(fileName, stepIndex, totalSteps, 'error', onProgress);
    }
  }

  const allSuccess = results.every((r) => r.success);
  return { success: allSuccess, results };
}

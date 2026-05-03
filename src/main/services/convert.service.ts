import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { buildConvertCommand } from '@main/ffmpeg';

const CONVERTED_DIR = path.join(process.cwd(), 'converted');

interface ConvertSettings {
  codec: string;
  width: number;
  height: number;
  fps: number;
  bitrate: string;
}

interface ConvertProgressEvent {
  file: string;
  progress: number;
  status: 'converting' | 'done' | 'error';
}

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

function runFfmpeg(args: string[]): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const [cmd, ...cmdArgs] = args;
    const proc = spawn(cmd, cmdArgs, {
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
    });

    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderr.slice(-500) || `ffmpeg exited with code ${code}` });
      }
    });

    proc.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

function copyCaption(inputPath: string, outputName: string): void {
  const captionPath = inputPath.replace(path.extname(inputPath), '.txt');
  if (fs.existsSync(captionPath)) {
    const destCaption = path.join(
      CONVERTED_DIR,
      outputName.replace(path.extname(outputName), '.txt'),
    );
    fs.copyFileSync(captionPath, destCaption);
  }
}

export async function bulkConvert(
  files: string[],
  settings: ConvertSettings,
  onProgress: (event: ConvertProgressEvent) => void,
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

import fs from 'fs';
import path from 'path';
import { buildThumbnailCommand } from '@main/ffmpeg';
import { runFfmpeg } from './ffmpeg-executor';
import { getCaptionPath, getThumbnailPath } from '@shared/utils';
import { VIDEO_EXTENSIONS } from '@main/constants';

const PROJECT_ROOT = process.cwd();
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');

export interface ScannedFile {
  path: string;
  name: string;
  size: number;
  modified: string;
}

export function scanOutputs(): ScannedFile[] {
  if (!fs.existsSync(OUTPUTS_DIR)) {
    return [];
  }

  const files: ScannedFile[] = [];
  const entries = fs.readdirSync(OUTPUTS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!VIDEO_EXTENSIONS.has(ext)) continue;

    const filePath = path.join(OUTPUTS_DIR, entry.name);
    const stats = fs.statSync(filePath);

    files.push({
      path: filePath,
      name: entry.name,
      size: stats.size,
      modified: stats.mtime.toISOString(),
    });
  }

  // Sort by modification time, newest first
  files.sort((a, b) => b.modified.localeCompare(a.modified));
  return files;
}

export function deleteClip(filePath: string): { success: boolean; error?: string } {
  try {
    // Delete the video file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete the caption file if it exists
    const captionPath = filePath.replace(path.extname(filePath), '.txt');
    if (fs.existsSync(captionPath)) {
      fs.unlinkSync(captionPath);
    }

    // Delete the thumbnail if it exists
    const thumbPath = getThumbnailPath(filePath);
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function bulkDeleteFiles(
  paths: string[],
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      const captionPath = getCaptionPath(filePath);
      if (fs.existsSync(captionPath)) {
        fs.unlinkSync(captionPath);
      }
      const thumbPath = getThumbnailPath(filePath);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    } catch {
      errors.push(filePath);
    }
  }
  return { success: errors.length === 0, errors };
}

export async function extractThumbnail(
  filePath: string,
  outputPath: string,
): Promise<{ success: boolean }> {
  const args = buildThumbnailCommand(filePath, outputPath);
  const result = await runFfmpeg(args);
  return result.success && fs.existsSync(outputPath) ? { success: true } : { success: false };
}

export function ensureThumbnail(videoPath: string): Promise<string | null> {
  const thumbPath = getThumbnailPath(videoPath);
  if (fs.existsSync(thumbPath)) {
    return Promise.resolve(thumbPath);
  }
  return extractThumbnail(videoPath, thumbPath).then((result) => {
    return result.success ? thumbPath : null;
  });
}

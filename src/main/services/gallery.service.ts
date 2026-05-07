import fs from 'fs';
import path from 'path';
import { buildThumbnailCommand } from '@main/ffmpeg';
import { runFfmpeg } from './ffmpeg-executor';
import type { GalleryFile } from '@shared/types';
import { deleteFileWithMetadata } from '@main/utils';
import { VIDEO_EXTENSIONS } from '@main/constants';
import { getCaptionPath } from '@shared/utils';

const PROJECT_ROOT = process.cwd();
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');

export function scanOutputs(): GalleryFile[] {
  if (!fs.existsSync(OUTPUTS_DIR)) {
    return [];
  }

  const files: GalleryFile[] = [];
  const entries = fs.readdirSync(OUTPUTS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!VIDEO_EXTENSIONS.has(ext)) continue;

    const filePath = path.join(OUTPUTS_DIR, entry.name);
    const stats = fs.statSync(filePath);

    const captionPath = getCaptionPath(filePath);
    let caption: string | undefined;
    if (fs.existsSync(captionPath)) {
      caption = fs.readFileSync(captionPath, 'utf-8').trim() || undefined;
    }

    files.push({
      path: filePath,
      name: entry.name,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      caption,
    });
  }

  // Sort by modification time, newest first
  files.sort((a, b) => b.modified.localeCompare(a.modified));
  return files;
}

export function deleteClip(filePath: string): { success: boolean; error?: string } {
  try {
    deleteFileWithMetadata(filePath);
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
      deleteFileWithMetadata(filePath);
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

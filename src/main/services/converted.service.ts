import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { VIDEO_EXTENSIONS } from '@main/constants';
import type { ConvertedFileInfo } from '@shared/types';
import { CONVERTED_DIR, OUTPUTS_DIR } from '@main/paths';

function countFrames(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', [
      '-v',
      'error',
      '-count_frames',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=nb_read_frames',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);

    let stdout = '';
    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.on('close', () => {
      const count = parseInt(stdout.trim(), 10);
      resolve(isNaN(count) ? 0 : count);
    });

    proc.on('error', () => {
      resolve(0);
    });
  });
}

export async function scanConverted(): Promise<ConvertedFileInfo[]> {
  if (!fs.existsSync(CONVERTED_DIR)) {
    return [];
  }

  const files: ConvertedFileInfo[] = [];
  const entries = fs.readdirSync(CONVERTED_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!VIDEO_EXTENSIONS.has(ext)) continue;

    const filePath = path.join(CONVERTED_DIR, entry.name);
    const frameCount = await countFrames(filePath);

    if (frameCount > 0) {
      files.push({
        thumbnailPath: path.join(OUTPUTS_DIR, entry.name + '.thumb.jpg'),
        fileName: entry.name,
        frameCount,
      });
    }
  }

  return files;
}

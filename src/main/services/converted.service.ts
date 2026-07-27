import fs from 'fs';
import path from 'path';
import { VIDEO_EXTENSIONS } from '@main/constants';
import type { ConvertedFileInfo } from '@shared/types';
import { CONVERTED_DIR, OUTPUTS_DIR } from '@main/paths';
import { getFrameCount } from './ffprobe.service';

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
    const frameCount = await getFrameCount(filePath);

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

import fs from 'fs';
import path from 'path';
import { buildCropCommand } from '@main/ffmpeg';
import { buildThumbnailCommand } from '@main/ffmpeg';
import { runFfmpeg } from './ffmpeg-executor';
import { safeUnlink } from '@main/utils';

/**
 * Crop a video file to the specified pixel region, replace the original,
 * and regenerate the thumbnail.
 */
export async function cropVideo(
  filePath: string,
  crop: { x: number; y: number; width: number; height: number },
): Promise<{ success: boolean; error?: string }> {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const tempPath = path.join(dir, `._crop_tmp_${base}${ext}`);

  try {
    // Crop video to temp file
    const cropArgs = buildCropCommand(filePath, tempPath, crop);
    const cropResult = await runFfmpeg(cropArgs);
    if (!cropResult.success) {
      return { success: false, error: cropResult.error ?? 'Crop failed' };
    }

    // Replace original with cropped version
    fs.renameSync(tempPath, filePath);

    // Regenerate thumbnail
    const thumbPath = filePath + '.thumb.jpg';
    const thumbArgs = buildThumbnailCommand(filePath, thumbPath);
    const thumbResult = await runFfmpeg(thumbArgs);
    if (!thumbResult.success) {
      return { success: false, error: thumbResult.error ?? 'Thumbnail regeneration failed' };
    }

    return { success: true };
  } catch (err) {
    // Clean up temp file on error
    safeUnlink(tempPath);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

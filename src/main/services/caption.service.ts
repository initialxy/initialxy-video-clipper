import fs from 'fs';
import path from 'path';

/**
 * Read caption content for a video file.
 * Caption is stored as <video_base_name>.txt in the same directory.
 */
export function readCaption(videoPath: string): { content?: string; exists: boolean } {
  const captionPath = videoPath.replace(path.extname(videoPath), '.txt');
  if (!fs.existsSync(captionPath)) {
    return { exists: false };
  }
  try {
    const content = fs.readFileSync(captionPath, 'utf-8');
    return { content, exists: true };
  } catch {
    return { exists: false };
  }
}

/**
 * Write caption content for a video file.
 * If content is empty, delete the caption file if it exists.
 */
export function writeCaption(videoPath: string, content: string): { success: boolean } {
  const captionPath = videoPath.replace(path.extname(videoPath), '.txt');
  try {
    if (content.trim() === '') {
      // Delete caption file if it exists
      if (fs.existsSync(captionPath)) {
        fs.unlinkSync(captionPath);
      }
      return { success: true };
    }
    fs.writeFileSync(captionPath, content, 'utf-8');
    return { success: true };
  } catch {
    return { success: false };
  }
}

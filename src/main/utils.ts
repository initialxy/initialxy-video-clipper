import fs from 'fs';
import { getCaptionPath, getThumbnailPath } from '@shared/utils';

/** Try to delete a file, silently ignore if it doesn't exist. */
export function safeUnlink(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/** Ensure a directory exists, create it (and parents) if not. */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/** Delete a file along with its caption and thumbnail files. */
export function deleteFileWithMetadata(filePath: string): void {
  safeUnlink(filePath);
  safeUnlink(getCaptionPath(filePath));
  safeUnlink(getThumbnailPath(filePath));
}

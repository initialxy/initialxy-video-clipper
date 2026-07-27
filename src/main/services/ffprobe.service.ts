import { spawn, spawnSync } from 'child_process';
import type { VideoInfo } from '@shared/types';

/**
 * Extract video metadata using ffprobe.
 */
export function getVideoInfo(filePath: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `ffprobe exited with code ${code}`));
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams?.find(
          (s: { codec_type: string }) => s.codec_type === 'video',
        );

        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        const duration = parseFloat(data.format?.duration ?? videoStream?.duration ?? '0');
        const width = parseInt(videoStream.width ?? '0', 10);
        const height = parseInt(videoStream.height ?? '0', 10);
        const codec = videoStream.codec_name ?? '';

        // Parse fps from r_frame_rate (e.g., "24000000/1001")
        const fpsStr = videoStream.r_frame_rate ?? '0/1';
        const [num, den] = fpsStr.split('/').map(Number);
        const fps = den !== 0 ? num / den : 0;

        resolve({
          duration,
          width,
          height,
          codec,
          fps: Math.round(fps * 100) / 100,
        });
      } catch {
        reject(new Error('Failed to parse ffprobe output'));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Count the actual number of frames in a video file.
 * Uses ffprobe -count_frames (single source of truth, shared with Check Frame Count feature).
 */
export function getFrameCount(filePath: string): Promise<number> {
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

/**
 * Check if ffmpeg is available in PATH.
 */
export function checkFfmpeg(): { available: boolean; path?: string } {
  try {
    const { status, stdout } = spawnSync('ffmpeg', ['-version']);
    return { available: status === 0 && stdout.length > 0, path: 'ffmpeg' };
  } catch {
    return { available: false };
  }
}

import { spawn } from 'child_process';

export interface FfmpegResult {
  success: boolean;
  error?: string;
}

/**
 * Execute an ffmpeg command and return the result.
 * Shared across all services to avoid duplicating spawn logic.
 */
export function runFfmpeg(args: string[]): Promise<FfmpegResult> {
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
        resolve({
          success: false,
          error: stderr.slice(-500) || `ffmpeg exited with code ${code}`,
        });
      }
    });

    proc.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

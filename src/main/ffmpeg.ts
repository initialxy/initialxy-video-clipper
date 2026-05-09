/**
 * Pure ffmpeg command builder — no side effects, no child_process calls.
 * All ffmpeg logic lives here for testability.
 */

/**
 * Build a clip command with re-encoding for accurate frame-level clipping.
 * ffmpeg -i <INPUT> -ss <START> -t <DURATION> <OUTPUT>
 *
 * -ss AFTER -i for frame-accurate seeking (decodes from beginning but lands on exact position).
 * -ss BEFORE -i would seek to nearest keyframe (fast but inaccurate, can be off by up to one GOP).
 *
 * Re-encoding is used instead of stream copy (-c copy) because stream copy cannot decode
 * frames between keyframes, causing missing content at the clip start.
 */
export function buildClipCommand(
  input: string,
  output: string,
  start: number,
  duration: number,
): string[] {
  return ['ffmpeg', '-y', '-i', input, '-ss', String(start), '-t', String(duration), output];
}

/**
 * Build a bulk conversion command.
 * Parameters are omitted if they indicate "same as source".
 */
export function buildConvertCommand(
  input: string,
  output: string,
  options: {
    codec?: string;
    width?: number;
    height?: number;
    fps?: number;
    bitrate?: string;
  },
): string[] {
  const args = ['ffmpeg', '-y', '-i', input];

  // Build video filter chain (resolution + framerate combined into single -vf)
  const vfParts: string[] = [];

  // Resolution: scale up to cover target, then crop to fill without stretching
  if (options.width && options.height) {
    vfParts.push(`scale=${options.width}:${options.height}:force_original_aspect_ratio=increase`);
    vfParts.push(`crop=${options.width}:${options.height}`);
  }

  // Frame rate: use minterpolate for motion-compensated frame interpolation
  if (options.fps) {
    vfParts.push(`minterpolate=fps=${options.fps}:mi_mode=mci`);
  }

  if (vfParts.length > 0) {
    args.push('-vf', vfParts.join(','));
  }

  // Codec
  if (options.codec) {
    args.push('-c:v', options.codec);
  }

  // Bitrate
  if (options.bitrate) {
    args.push('-b:v', options.bitrate);
  }

  // Always copy audio
  args.push('-c:a', 'copy');

  args.push(output);

  return args;
}

/**
 * Build a thumbnail extraction command.
 * ffmpeg -i <INPUT> -frames:v 1 -q:v 2 <OUTPUT>.jpg
 */
export function buildThumbnailCommand(input: string, output: string): string[] {
  return ['ffmpeg', '-y', '-i', input, '-frames:v', '1', '-q:v', '2', output];
}

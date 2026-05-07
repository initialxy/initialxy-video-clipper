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
  return ['ffmpeg', '-i', input, '-ss', String(start), '-t', String(duration), output];
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
  const args = ['ffmpeg', '-i', input];

  // Resolution: scale + crop to fill target without stretching
  if (options.width && options.height) {
    args.push(
      '-vf',
      `scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease,crop=${options.width}:${options.height}`,
    );
  }

  // Codec
  if (options.codec) {
    args.push('-c:v', options.codec);
  }

  // Frame rate
  if (options.fps) {
    args.push('-r', String(options.fps));
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
  return ['ffmpeg', '-i', input, '-frames:v', '1', '-q:v', '2', output];
}

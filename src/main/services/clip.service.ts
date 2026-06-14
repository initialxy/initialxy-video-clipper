import fs from 'fs';
import path from 'path';
import { buildClipCommand } from '@main/ffmpeg';
import { formatCounter, getBaseName, getExtension } from '@shared/utils';
import { runFfmpeg } from './ffmpeg-executor';
import { ensureDir, safeUnlink } from '@main/utils';
import type { ClipResult } from '@shared/types';
import { OUTPUTS_DIR, COUNTERS_FILE } from '@main/paths';

function ensureOutputsDir(): void {
  ensureDir(OUTPUTS_DIR);
}

function loadCounters(): Record<string, number> {
  if (!fs.existsSync(COUNTERS_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(COUNTERS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveCounters(counters: Record<string, number>): void {
  fs.writeFileSync(COUNTERS_FILE, JSON.stringify(counters, null, 2));
}

function getNextClipPath(inputPath: string): { outputPath: string; counter: number } {
  ensureOutputsDir();
  const counters = loadCounters();
  const counter = (counters[inputPath] ?? 0) + 1;
  counters[inputPath] = counter;
  saveCounters(counters);

  const baseName = getBaseName(inputPath);
  const ext = getExtension(inputPath);
  const clipName = `${baseName}_c${formatCounter(counter)}${ext}`;
  return { outputPath: path.join(OUTPUTS_DIR, clipName), counter };
}

export interface ClipPayload {
  inputPath: string;
  start: number;
  duration: number;
}

export async function createClip(payload: ClipPayload): Promise<ClipResult> {
  const { inputPath, start, duration } = payload;

  if (!fs.existsSync(inputPath)) {
    return { success: false, error: `Input file not found: ${inputPath}` };
  }

  const { outputPath } = getNextClipPath(inputPath);
  const args = buildClipCommand(inputPath, outputPath, start, duration);
  const result = await runFfmpeg(args);

  if (result.success) {
    return { success: true, outputPath };
  }

  // Clean up failed output
  safeUnlink(outputPath);

  return { success: false, error: result.error };
}

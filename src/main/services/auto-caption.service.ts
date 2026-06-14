import fs from 'fs';
import { getThumbnailPath, getCaptionPath } from '@shared/utils';
import { writeCaption } from './caption.service';
import type { AutoCaptionResult } from '@shared/types';

const SYSTEM_PROMPT =
  'You are a helpful assistant that writes short, descriptive captions for video clips used in AI training data.\n' +
  'You will be shown a single image (a frame from a video). Write a plain-text caption describing what is happening in this video clip.\n' +
  'Do NOT use markdown, headings, bullet points, or any formatting — just return the raw caption text.\n' +
  'Prefix your caption with "Caption: " at the very beginning of your response.';

const REQUEST_TIMEOUT_MS = 60_000;

export interface AutoCaptionConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface AutoCaptionProgressEvent {
  file: string;
  current: number;
  total: number;
  status: 'processing' | 'done' | 'error';
}

export type ProgressCallback = (event: AutoCaptionProgressEvent) => void;

/** Callback invoked when a caption is successfully written, for reactive UI updates. */
export type CaptionChangedCallback = (filePath: string, content: string) => void;

function parseCaption(response: string): string {
  const idx = response.indexOf('Caption:');
  if (idx !== -1) {
    return response.substring(idx + 'Caption:'.length).trim();
  }
  return response.trim();
}

function extractResponseFromReasoning(reasoningContent: string): string | null {
  const tagRegex = /<\/?(?:thin(?:kin)?g|reason(?:ing)?)>/gi;
  const matches = [...reasoningContent.matchAll(tagRegex)];
  if (matches.length < 2) {
    return null;
  }
  const lastCloseIdx = matches[matches.length - 1].index! + matches[matches.length - 1][0].length;
  const after = reasoningContent.substring(lastCloseIdx).trim();
  if (after.length > 10) {
    return after;
  }
  return null;
}

async function captionFile(
  filePath: string,
  config: AutoCaptionConfig,
  shouldCancel: () => boolean,
  onCaptionChanged?: CaptionChangedCallback,
): Promise<{ success: boolean; error?: string }> {
  const thumbnailPath = getThumbnailPath(filePath);

  if (!fs.existsSync(thumbnailPath)) {
    return { success: false, error: 'Thumbnail not found' };
  }

  const captionPath = getCaptionPath(filePath);
  const existingCaption = fs.existsSync(captionPath)
    ? fs.readFileSync(captionPath, 'utf-8').trim()
    : '';

  const userPrompt = existingCaption
    ? `Existing caption: "${existingCaption}". Add visual description of what you see in the image that complements the existing caption. Preserve the existing caption's dialogue and spoken content — do not rewrite or remove it. Combine the existing caption with your visual description into a single cohesive caption.`
    : 'Describe what is happening in this video clip.';

  const thumbnailData = fs.readFileSync(thumbnailPath);
  const base64Image = thumbnailData.toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64Image}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let cancelCheckId: ReturnType<typeof setInterval> | null = null;
  let cancelled = false;

  try {
    cancelCheckId = setInterval(() => {
      if (shouldCancel()) {
        cancelled = true;
        controller.abort();
        clearInterval(cancelCheckId!);
      }
    }, 100);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.apiKey && config.apiKey !== 'DUMMY') {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: dataUri } },
            ],
          },
        ],
        max_tokens: 2024,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    clearInterval(cancelCheckId!);

    if (cancelled) {
      return { success: false, error: 'Cancelled' };
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const responseText = await response.text();
    const data = JSON.parse(responseText) as {
      choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
    };

    let content = data.choices?.[0]?.message?.content;
    const reasoningContent = data.choices?.[0]?.message?.reasoning_content;

    if (!content && reasoningContent) {
      content = extractResponseFromReasoning(reasoningContent) ?? reasoningContent;
    }

    if (!content) {
      return { success: false, error: 'Empty response from LLM' };
    }

    const caption = parseCaption(content);
    const result = writeCaption(filePath, caption);
    onCaptionChanged?.(filePath, caption);

    if (!result.success) {
      return { success: false, error: 'Failed to write caption file' };
    }

    return { success: true };
  } catch (err) {
    clearTimeout(timeoutId);
    clearInterval(cancelCheckId!);
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function runAutoCaption(
  files: string[],
  config: AutoCaptionConfig,
  onProgress: ProgressCallback,
  shouldCancel: () => boolean,
  onCaptionChanged?: CaptionChangedCallback,
): Promise<{ results: AutoCaptionResult[] }> {
  const results: AutoCaptionResult[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    if (shouldCancel()) {
      break;
    }

    const file = files[i];
    onProgress({ file, current: i, total, status: 'processing' });

    try {
      const result = await captionFile(file, config, shouldCancel, onCaptionChanged);
      if (result.error === 'Cancelled') {
        break;
      }
      results.push({ file, ...result });
      onProgress({ file, current: i + 1, total, status: result.success ? 'done' : 'error' });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        break;
      }
      results.push({ file, success: false, error: 'Request interrupted' });
      onProgress({ file, current: i + 1, total, status: 'error' });
    }
  }

  return { results };
}

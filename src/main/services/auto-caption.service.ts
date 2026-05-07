import fs from 'fs';
import { getThumbnailPath, getCaptionPath } from '@shared/utils';
import { writeCaption } from './caption.service';
import type { AutoCaptionResult } from '@shared/types';

const SYSTEM_PROMPT =
  'You are a helpful assistant that describes and captions images for AI training data.\n' +
  'Your response must include a caption under a "## Caption" heading.';

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

function parseCaption(response: string): string {
  const captionHeading = response.match(/##\s*Caption\s*\n([\s\S]*)/i);
  if (captionHeading) {
    return captionHeading[1].trim();
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
    ? `This image has an existing description: ${existingCaption}. Please improve and rephrase it. Describe the content of this image.`
    : 'Describe the content of this image.';

  const thumbnailData = fs.readFileSync(thumbnailPath);
  const base64Image = thumbnailData.toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64Image}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
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

    if (!result.success) {
      return { success: false, error: 'Failed to write caption file' };
    }

    return { success: true };
  } catch (err) {
    clearTimeout(timeoutId);
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
      const result = await captionFile(file, config);
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

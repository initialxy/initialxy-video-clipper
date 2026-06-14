import { useCallback } from 'react';
import { toast } from 'sonner';
import { useAppDispatch } from '@renderer/store/app-state';
import { useGallery } from './useGallery';
import { SETTINGS_KEYS } from '@shared/constants';
import type { AutoCaptionResult } from '@shared/types';

const AUTO_CAPTION_TOAST_ID = 'auto-caption-progress';

/**
 * Orchestrates auto-captioning: loads config, runs IPC call, processes results,
 * manages toast lifecycle.
 */
export function useAutoCaption(selectedFiles: Set<string>) {
  const dispatch = useAppDispatch();
  const { refreshGallery } = useGallery();

  const loadAutoCaptionConfig = useCallback(async (): Promise<{
    baseUrl: string;
    model: string;
    apiKey: string;
  }> => {
    const res = await window.electronAPI.getSetting(SETTINGS_KEYS.AUTO_CAPTION_CONFIG);
    if (res.value) {
      try {
        return JSON.parse(res.value) as { baseUrl: string; model: string; apiKey: string };
      } catch {
        // fall through
      }
    }
    return { baseUrl: 'http://localhost:8080', model: 'model', apiKey: 'DUMMY' };
  }, []);

  const runAutoCaption = useCallback(
    async (filePath?: string) => {
      const files = filePath ? [filePath] : Array.from(selectedFiles);
      if (files.length === 0) return;

      dispatch({ type: 'SET_AUTO_CAPTIONING', payload: true });

      const config = await loadAutoCaptionConfig();

      try {
        const res = await window.electronAPI.autoCaptionRun({ files, config });
        const results = res.results ?? [];
        const succeeded = results.filter((r: AutoCaptionResult) => r.success).length;
        const failed = results.filter((r: AutoCaptionResult) => !r.success).length;

        toast.dismiss(AUTO_CAPTION_TOAST_ID);

        if (failed > 0) {
          toast.error(`Auto-caption failed for ${failed} file(s)`);
        } else {
          toast.info(`Auto-captioned ${succeeded} file(s)`);
        }
        refreshGallery();
      } catch {
        toast.dismiss(AUTO_CAPTION_TOAST_ID);
        toast.error('Auto-caption failed');
      } finally {
        dispatch({ type: 'SET_AUTO_CAPTIONING', payload: false });
      }
    },
    [selectedFiles, dispatch, loadAutoCaptionConfig, refreshGallery],
  );

  return { runAutoCaption };
}

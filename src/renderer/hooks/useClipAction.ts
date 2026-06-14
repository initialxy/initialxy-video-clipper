import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAppState } from '@renderer/store/app-state';
import { useGallery } from './useGallery';

/**
 * Handles the clip action: calculates remaining time, handles edge cases,
 * creates the clip via IPC, and shows appropriate toasts.
 */
export function useClipAction() {
  const { currentVideo, clipLength } = useAppState();
  const { refreshGallery } = useGallery();
  const videoTimeRef = useRef(0);

  const handleClip = useCallback(async () => {
    if (!currentVideo) return;
    const actualTime = videoTimeRef.current;
    const remaining = currentVideo.duration - actualTime;

    // remaining <= 0 falls through — clips last n seconds with warning
    if (remaining < clipLength) {
      if (currentVideo.duration < clipLength) {
        toast.error(`Cannot save clip — video is only ${currentVideo.duration.toFixed(2)}s long`);
        return;
      }

      const start = currentVideo.duration - clipLength;
      const result = await window.electronAPI.createClip({
        inputPath: currentVideo.path,
        outputPath: '',
        start,
        duration: clipLength,
      });

      if (result.success) {
        refreshGallery();
        toast.warning(`Clipped last ${clipLength}s instead`);
      } else if (result.error) {
        toast.error(result.error);
      }
      return;
    }

    const result = await window.electronAPI.createClip({
      inputPath: currentVideo.path,
      outputPath: '',
      start: actualTime,
      duration: clipLength,
    });

    if (result.success) {
      refreshGallery();
      toast.success('Clip saved');
    } else if (result.error) {
      toast.error(result.error);
    }
  }, [currentVideo, clipLength, refreshGallery]);

  return { handleClip, videoTimeRef };
}

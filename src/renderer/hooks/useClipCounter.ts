import { useCallback } from 'react';
import { useAppState } from '@renderer/store/app-state';

export function useClipCounter() {
  const { currentVideo, clipLength } = useAppState();

  const handleClip = useCallback(
    async (
      startTime: number,
      onInsufficient?: (remaining: number, requested: number) => void,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!currentVideo) return { success: false, error: 'No video loaded' };

      const remaining = currentVideo.duration - startTime;

      if (remaining <= 0) {
        return { success: false, error: 'Already at end of video' };
      }

      if (remaining < clipLength && onInsufficient) {
        onInsufficient(remaining, clipLength);
        return { success: false, error: 'Insufficient remaining duration' };
      }

      const actualDuration = Math.min(clipLength, remaining);

      const result = await window.electronAPI.createClip({
        inputPath: currentVideo.path,
        outputPath: '',
        start: startTime,
        duration: actualDuration,
      });

      return result;
    },
    [currentVideo, clipLength],
  );

  const handleClipRemaining = useCallback(
    async (startTime: number): Promise<{ success: boolean; error?: string }> => {
      if (!currentVideo) return { success: false, error: 'No video loaded' };

      const remaining = currentVideo.duration - startTime;
      if (remaining <= 0) {
        return { success: false, error: 'Already at end of video' };
      }

      const result = await window.electronAPI.createClip({
        inputPath: currentVideo.path,
        outputPath: '',
        start: startTime,
        duration: remaining,
      });

      return result;
    },
    [currentVideo],
  );

  return { handleClip, handleClipRemaining };
}

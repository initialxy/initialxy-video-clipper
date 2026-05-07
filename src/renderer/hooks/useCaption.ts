import { useState, useCallback, useEffect } from 'react';
import { useCaptionStore } from '@renderer/store/caption-store';
import { useDebouncedCaptionSave } from '@renderer/hooks/useDebouncedCaptionSave';

export function useCaption(videoPath: string | null) {
  const store = useCaptionStore();
  const [localCaption, setLocalCaption] = useState('');
  const { saveCaption, resetDirty } = useDebouncedCaptionSave(videoPath);

  // Load caption when video path changes
  useEffect(() => {
    if (!videoPath) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalCaption('');
      return;
    }

    const cached = store.getCaption(videoPath);
    if (cached !== undefined) {
      setLocalCaption(cached);
      resetDirty(cached);
    } else {
      store.refreshCaption(videoPath).then((content) => {
        setLocalCaption(content);
        resetDirty(content);
      });
    }
  }, [videoPath, store, resetDirty, localCaption]);

  // Listen for caption changes from other sources (auto-caption, other tabs)
  useEffect(() => {
    if (!videoPath) return;

    const cleanup = window.electronAPI.onCaptionChanged((data) => {
      if (data.filePath === videoPath) {
        setLocalCaption(data.content);
        resetDirty(data.content);
      }
    });

    return cleanup;
  }, [videoPath, resetDirty]);

  const updateCaption = useCallback(
    (newCaption: string) => {
      setLocalCaption(newCaption);
      saveCaption(newCaption);
    },
    [saveCaption],
  );

  return { caption: localCaption, updateCaption };
}

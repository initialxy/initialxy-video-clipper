import { useCallback, useRef } from 'react';
import { useDebouncedCallback } from '@renderer/hooks/useDebouncedCallback';

export function useDebouncedCaptionSave(filePath: string | null, delay: number = 2000) {
  const lastSavedRef = useRef('');

  const debouncedSave = useDebouncedCallback(
    useCallback(
      async (newCaption: string) => {
        if (!filePath) return;
        if (newCaption === lastSavedRef.current) return;

        await window.electronAPI.writeCaption({ filePath, content: newCaption });
        lastSavedRef.current = newCaption;
      },
      [filePath],
    ),
    delay,
  );

  const saveCaption = useCallback(
    (newCaption: string) => {
      debouncedSave(newCaption);
    },
    [debouncedSave],
  );

  const resetDirty = useCallback((content: string) => {
    lastSavedRef.current = content;
  }, []);

  return { saveCaption, resetDirty };
}
